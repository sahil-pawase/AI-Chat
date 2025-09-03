import type { NextRequest } from "next/server"

/* -------------------------------------------------------------------------- */
/* Utility helpers                                                            */
/* -------------------------------------------------------------------------- */
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  })

const jsonError = (msg: string, status = 500) => json({ error: msg }, status)

/* -------------------------------------------------------------------------- */
/* Main handler – ALL logic is inside try {} so nothing leaks                 */
/* -------------------------------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    /* 1️⃣  Read & validate the API key */
    const apiKey = (process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "").trim()
    if (!apiKey) {
      return jsonError("Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to .env.local and restart the dev server.", 500)
    }

    /* 2️⃣  Parse request body. Accept an empty chat on first load. */
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      /* keep body = {} */
    }
    const messages = Array.isArray(body.messages) ? body.messages : []

    /* 3️⃣  Transform to Gemini format */
    const contents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content ?? "") }],
    }))

    /* 4️⃣  Call Gemini.  Query-param key first, fall back to header. */
    const model = "gemini-pro"
    const base = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
    const firstTry = await fetch(`${base}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    })

    const googleRes =
      firstTry.ok || firstTry.status < 400 || firstTry.status > 403
        ? firstTry
        : await fetch(base, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
            },
            body: JSON.stringify({ contents }),
          })

    /* 5️⃣  Handle error responses from Google */
    const text = await googleRes.text()
    if (!googleRes.ok) {
      let msg = text
      try {
        msg = JSON.parse(text).error?.message ?? msg
      } catch {}
      return jsonError(`Gemini API error: ${msg}`, googleRes.status)
    }

    /* 6️⃣  Success → extract reply text */
    let data: any = {}
    try {
      data = JSON.parse(text)
    } catch {
      return jsonError("Gemini returned malformed JSON", 502)
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "(empty reply)"
    return json({ id: Date.now().toString(), role: "assistant", content: reply })
  } catch (err) {
    /* Anything that escaped the above logic ends up here */
    console.error("🔥 Unhandled chat route error:", err)
    return jsonError(err instanceof Error ? err.message : "Uncaught exception on the server. See logs.", 500)
  }
}

/* -------------------------------------------------------------------------- */
/* Module-scope NO-OP default export so the file always loads cleanly         */
/* -------------------------------------------------------------------------- */
export const dynamic = "force-dynamic" // disables Next.js route caching
