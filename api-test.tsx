"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export function ApiTest() {
  const [status, setStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [response, setResponse] = useState<string>("")

  const testApi = async () => {
    setStatus("testing")
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Say hello in one word",
            },
          ],
        }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setResponse(data.content || "No content received")
      setStatus("success")
    } catch (error) {
      setResponse(error instanceof Error ? error.message : "Unknown error")
      setStatus("error")
    }
  }

  return (
    <Card className="p-4 m-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">API Connection Test</h3>
        <Badge variant={status === "success" ? "default" : status === "error" ? "destructive" : "secondary"}>
          {status}
        </Badge>
      </div>

      <Button onClick={testApi} disabled={status === "testing"} className="mb-4">
        {status === "testing" ? "Testing..." : "Test Gemini API"}
      </Button>

      {response && (
        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-md">
          <p className="text-sm">{response}</p>
        </div>
      )}
    </Card>
  )
}
