export const dynamic = "force-dynamic"

export async function POST(req) {
  try {
    const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY || "").trim()
    if (!apiKey) {
      return json({ error: "Missing GOOGLE_GENERATIVE_AI_API_KEY in .env.local" }, 500)
    }

    // 1) Parse request body safely
    let body = {}
    try {
      body = await req.json()
    } catch {}
    const msgs = Array.isArray(body.messages) ? body.messages : []

    // 2) Convert to Gemini "contents"
    const contents = msgs.map((m) => ({
      role: m && m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m && m.content ? m.content : "") }],
    }))

    // 3) Try a set of v1beta-supported models in order
    const MODELS = [
      "gemini-1.5-flash",
      "gemini-1.5-flash-8b",
      "gemini-1.5-pro",
      // last resort if your key has access:
      "gemini-2.0-flash-exp",
    ]

    const errors = []

    for (const model of MODELS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

      // First attempt: key as query param
      let gRes = await tryGoogle(endpoint + "?key=" + apiKey, contents)

      // If 400/403 and looks like an API key issue, retry with header
      if (!gRes.ok && (gRes.status === 400 || gRes.status === 403)) {
        const txt = await gRes.clone().text()
        if (txt.includes("API key")) {
          gRes = await tryGoogle(endpoint, contents, apiKey)
        }
      }

      if (gRes.ok) {
        // success: parse and return
        const data = await safeJson(gRes)
        if (!data.ok) {
          // malformed JSON
          return json({ error: `Gemini returned malformed JSON for ${model}: ${data.error}` }, 502)
        }
        const reply = data.value?.candidates?.[0]?.content?.parts?.[0]?.text || "(Gemini sent an empty response)"
        return json({ id: Date.now().toString(), role: "assistant", content: reply, modelUsed: model }, 200)
      } else {
        // collect error and try next model
        const txt = await gRes.text()
        errors.push({
          model,
          status: gRes.status,
          message: extractGoogleMessage(txt),
        })
      }
    }

    // If we got here, all models failed
    return json(
      {
        error: "All Gemini models tried failed for v1beta generateContent.",
        details: errors,
        hint: "Enable one of these models for your API key or open Google Cloud Console > APIs & Services > Enable 'Generative Language API' and verify model availability.",
      },
      502,
    )
  } catch (err) {
    console.error("🚨 /api/chat uncaught error:", err)
    return json({ error: (err && err.message) || "Unknown server exception" }, 500)
  }
}

// --- Helpers --------------------------------------------------------------

async function tryGoogle(url, contents, headerKey) {
  try {
    return await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headerKey ? { "X-Goog-Api-Key": headerKey } : {}),
      },
      body: JSON.stringify({ contents }),
    })
  } catch (e) {
    // Network failure → synthetic 502 JSON response
    return new Response(JSON.stringify({ error: e.message }), { status: 502 })
  }
}

async function safeJson(res) {
  try {
    const v = await res.json()
    return { ok: true, value: v }
  } catch (e) {
    return { ok: false, error: e?.message || "JSON parse error" }
  }
}

function extractGoogleMessage(txt) {
  try {
    const j = JSON.parse(txt)
    return j?.error?.message || txt
  } catch {
    return txt
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })
}
