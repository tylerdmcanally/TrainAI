'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Send, Volume2, MessageCircle, Loader2 } from 'lucide-react'

interface AITutorChatProps {
  trainingId: string
  trainingTitle: string
  sop: string
  keyPoints: string[]
  transcript: string
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function AITutorChat({
  trainingId,
  trainingTitle,
  sop,
  keyPoints,
  transcript,
}: AITutorChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Hi! I'm your AI tutor for "${trainingTitle}". I'm here to help you learn. Feel free to ask me questions as you watch the video, or I'll quiz you at checkpoints to make sure you're understanding everything!`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const playAudio = (audioBase64: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // Create audio element from base64
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`)
    audioRef.current = audio

    audio.onplay = () => setIsSpeaking(true)
    audio.onended = () => {
      setIsSpeaking(false)
      audioRef.current = null
    }
    audio.onerror = () => {
      setIsSpeaking(false)
      audioRef.current = null
    }

    audio.play()
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/training/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainingId,
          messages: [...messages, userMessage],
          context: {
            sop,
            keyPoints,
            transcript,
          },
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const { message, audio } = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: message,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])

      // Play the audio response
      if (audio) {
        playAudio(audio)
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <h2 className="font-semibold text-gray-900">AI Tutor</h2>
        </div>
        <p className="text-xs text-gray-500 mt-1">Ask questions or get quizzed</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Button
            variant={isListening ? 'default' : 'outline'}
            size="icon"
            onClick={isListening ? stopListening : startListening}
            title={isListening ? 'Stop listening' : 'Start voice input'}
          >
            <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
          </Button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question or type your answer..."
            className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />

          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {isSpeaking && (
          <div className="flex items-center gap-2 mt-2 text-xs text-blue-600">
            <Volume2 className="h-3 w-3 animate-pulse" />
            <span>AI is speaking...</span>
          </div>
        )}
      </div>
    </div>
  )
}
