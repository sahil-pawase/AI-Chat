export async function POST(req: Request) {
  try {
    const { messages } = await req.json()

    // Convert messages to Gemini API format
    const contents = messages.map((message: any) => ({
      parts: [{ text: message.content }],
      role: message.role === "assistant" ? "model" : "user",
    }))

    // Call Gemini API with streaming
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:streamGenerateContent" +
      `?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4000,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE",
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Gemini API Error:", response.status, errorData)
      throw new Error(`Gemini API Error: ${response.status} - ${errorData}`)
    }

    // Create a readable stream for the response
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        if (!reader) {
          controller.close()
          return
        }

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            // Parse the streaming response
            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n").filter((line) => line.trim())

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const jsonData = JSON.parse(line.slice(6))
                  const text = jsonData.candidates?.[0]?.content?.parts?.[0]?.text
                  if (text) {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content: text })}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          console.error("Streaming error:", error)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat Stream API Error:", error)
    return new Response(
      JSON.stringify({
        error: "Failed to process chat request",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}
