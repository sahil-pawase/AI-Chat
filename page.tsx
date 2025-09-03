"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Send, Bot, User, Copy, Check, Sparkles, MessageSquare, Zap, AlertCircle } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      const raw = await response.text()
      let data: any = null
      try {
        data = JSON.parse(raw)
      } catch {
        /* raw is plain text (e.g. “Internal Server Error”) */
      }

      if (!response.ok) {
        throw new Error((data && data.error) || raw || `HTTP ${response.status}`)
      }

      const assistantMessage: Message = {
        id: data.id || Date.now().toString(),
        role: "assistant",
        content: data.content,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Chat error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      toast({
        title: "Copied!",
        description: "Message copied to clipboard",
      })
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard",
        variant: "destructive",
      })
    }
  }

  const testConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: "Hello, just testing the connection. Please respond with 'Connection successful!'",
            },
          ],
        }),
      })

      const raw = await response.text()
      let data: any = null
      try {
        data = JSON.parse(raw)
      } catch {}

      if (!response.ok) {
        throw new Error((data && data.error) || raw || `HTTP ${response.status}`)
      }

      toast({
        title: "Success!",
        description: "Gemini API connection is working",
      })
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Gemini Chat
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Powered by Google Gemini AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={isLoading}
                className="text-xs bg-transparent"
              >
                <AlertCircle className="w-3 h-3 mr-1" />
                Test API
              </Button>
              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                <Zap className="w-3 h-3 mr-1" />
                Ready
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Welcome to Gemini Chat</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Start a conversation with Google's Gemini AI. Ask anything!
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  "Explain quantum computing",
                  "Write a creative story",
                  "Help me plan a trip",
                  "Code a React component",
                ].map((suggestion, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="text-left justify-start h-auto p-4 hover:bg-slate-50 dark:hover:bg-slate-800 bg-transparent"
                    onClick={() => setInput(suggestion)}
                  >
                    <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="w-8 h-8 border-2 border-purple-200 dark:border-purple-800">
                      <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}

                  <Card
                    className={`max-w-[80%] group ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0"
                        : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
                          <div className="whitespace-pre-wrap break-words">{message.content}</div>
                        </div>
                        {message.role === "assistant" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="w-3 h-3 text-green-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>

                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 border-2 border-slate-200 dark:border-slate-700">
                      <AvatarFallback className="bg-slate-100 dark:bg-slate-800">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="w-8 h-8 border-2 border-purple-200 dark:border-purple-800">
                    <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <div className="p-4">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-slate-400">Gemini is thinking...</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Gemini anything..."
                className="pr-12 h-12 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400"
                disabled={isLoading}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-12 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
            Powered by Google Gemini AI • Built with Next.js
          </p>
        </div>
      </div>
    </div>
  )
}
