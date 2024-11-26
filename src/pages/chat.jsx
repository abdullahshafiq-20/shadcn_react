'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Mic } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import axios from 'axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import translate from 'translate-google-api'

export default function ChatPage() {
  // Initialize state with localStorage if available
  const [messages, setMessages] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatMessages')
      return savedMessages ? JSON.parse(savedMessages) : [
        { type: 'response', content: { text: "What would you like to know about the database?" } }
      ]
    }
    return [{ type: 'response', content: { text: "What would you like to know about the database?" } }]
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef(null)
  const [visibleTables, setVisibleTables] = useState({})
  const [isListening, setIsListening] = useState(false)
  const [recognition, setRecognition] = useState(null)
  const [voiceAnimation, setVoiceAnimation] = useState([])
  const [isTranslating, setIsTranslating] = useState(false)

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollArea = scrollAreaRef.current
      scrollArea.scrollTop = scrollArea.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = 'ur-PK'

        recognition.onresult = async (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('')

          setInput(transcript)
        }

        recognition.onend = () => {
          setIsListening(false)
          setVoiceAnimation([])
        }

        setRecognition(recognition)
      }
    }
  }, [])

  const formatTableData = (tableData) => {
    if (!tableData?.columns || !tableData?.rows || tableData.rows.length === 0) {
      return null
    }

    // Transform data for vertical display
    const verticalData = tableData.rows.map((row, rowIndex) => (
      <div key={rowIndex} className="mb-4 last:mb-0">
        <div className="font-medium text-zinc-300 mb-2">Record {rowIndex + 1}</div>
        <Table className="w-full text-sm">
          <TableBody>
            {tableData.columns.map((column) => (
              <TableRow key={column} className="border-b border-zinc-700/50">
                <TableCell className="text-zinc-300 py-2 px-3 font-medium w-1/3">
                  {column}
                </TableCell>
                <TableCell className="text-zinc-400 py-2 px-3 break-all">
                  {row[column]?.toString() || '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    ))

    return (
      <div className="relative w-full overflow-auto max-h-[400px]">
        <div className="space-y-2">
          {verticalData}
        </div>
      </div>
    )
  }

  const handleSend = async () => {
    if (input.trim()) {
      const userMessage = { type: 'request', content: { text: input } }
      const currentInput = input
      
      setMessages(prevMessages => [...prevMessages, userMessage])
      setInput('')
      setIsLoading(true)

      try {
        const { data } = await axios.post('https://my-sql-backend.vercel.app/api/chatWithDb', {
          query: currentInput
        })

        if (data.success) {
          const responseContent = {
            text: `${data.data.naturalResponse}\n\nSQL Query: \`${data.data.sqlQuery}\``,
            table: data.data.tableData
          }
          setTimeout(() => {
            setMessages(prevMessages => [...prevMessages, { 
              type: 'response', 
              content: responseContent 
            }])
          }, 100)
        } else {
          setMessages(prevMessages => [...prevMessages, { 
            type: 'response', 
            content: { text: "Sorry, I couldn't process your request. Please try again." } 
          }])
        }
      } catch (error) {
        console.error('Error:', error)
        const errorMessage = error.response?.data?.message || 
          "Sorry, there was an error processing your request. Please try again."
        setMessages(prevMessages => [...prevMessages, { 
          type: 'response', 
          content: { text: errorMessage } 
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const toggleTableVisibility = (messageIndex) => {
    setVisibleTables(prev => ({
      ...prev,
      [messageIndex]: !prev[messageIndex]
    }))
  }

  const renderMessage = (message, index) => {
    if (message.type === 'request') {
      return (
        <div className="space-y-1">
          <div className="break-words whitespace-pre-wrap">
            {message.content.text}
          </div>
          {message.content.isUrdu && (
            <div className="text-xs text-zinc-400 italic">
              Speaking in Urdu
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="break-words whitespace-pre-wrap">{message.content.text}</div>
        {message.content.table && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleTableVisibility(index)}
              className="text-zinc-300 hover:text-white"
            >
              {visibleTables[index] ? 'Hide Table' : 'Show Table'}
            </Button>
            {visibleTables[index] && (
              <div className="rounded-md border border-zinc-700 overflow-hidden p-4 bg-zinc-800/50">
                {formatTableData(message.content.table)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const suggestions = [
    "Show all verified users",
    "List users with role 'student'",
    "Count users by auth type"
  ]

  const handleVoiceError = () => {
    setMessages(prevMessages => [...prevMessages, { 
      type: 'response', 
      content: { 
        text: "Sorry, voice recognition is not supported in your browser. Please try using Chrome." 
      } 
    }])
  }

  const generateVoiceAnimation = () => {
    return Array.from({ length: 20 }, () => Math.random() * 40 + 10)
  }

  const startListening = () => {
    if (recognition) {
      try {
        recognition.start()
        setIsListening(true)
        const animationInterval = setInterval(() => {
          setVoiceAnimation(generateVoiceAnimation())
        }, 100)
        recognition.animationInterval = animationInterval
      } catch (error) {
        handleVoiceError()
        setIsListening(false)
      }
    } else {
      handleVoiceError()
    }
  }

  const stopListening = async () => {
    if (recognition) {
      recognition.stop()
      setIsListening(false)
      if (recognition.animationInterval) {
        clearInterval(recognition.animationInterval)
      }
      setVoiceAnimation([])
      
      if (input.trim()) {
        try {
          // Show original Urdu text in chat
          const urduMessage = { 
            type: 'request', 
            content: { 
              text: input,
              isUrdu: true 
            } 
          }
          setMessages(prev => [...prev, urduMessage])
          
          // Translate to English
          const translatedText = await translateToEnglish(input)
          setInput(translatedText)
          
          // Send translated message
          await handleSend()
          setInput('')
        } catch (error) {
          setMessages(prev => [...prev, {
            type: 'response',
            content: { text: "Sorry, there was an error translating your message. Please try again." }
          }])
        }
      }
    }
  }

  const translateToEnglish = async (urduText) => {
    try {
      setIsTranslating(true)
      const result = await translate(urduText, {
        tld: "com",
        from: "ur",
        to: "en",
        corsUrl: "https://cors-anywhere.herokuapp.com/",
      })
      
      return result[0]
    } catch (error) {
      console.error('Translation error:', error)
      throw new Error('Translation failed')
    } finally {
      setIsTranslating(false)
    }
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl h-full flex flex-col py-4 px-4">
        <h1 className="text-2xl md:text-5xl font-bold text-center mb-4 md:mb-8 flex-shrink-0">
          Database Query Assistant
        </h1>
        
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 flex-grow flex flex-col min-h-0">
          {/* <div className="border-b border-zinc-800 p-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-sm text-zinc-400">
                Need more messages? Get higher limits with Premium.
              </p>
              <Button
                variant="link"
                className="text-teal-400 hover:text-teal-300 px-0"
                size="sm"
              >
                Upgrade Plan
              </Button>
            </div>
          </div> */}

          <CardContent className="p-2 md:p-4 flex-grow overflow-hidden relative">
            <ScrollArea className="h-full pr-2 md:pr-4" ref={scrollAreaRef}>
              <div className="space-y-2 md:space-y-4">
                {messages.map((message, index) => (
                  <div key={index} className="flex items-start gap-1 md:gap-2 mb-2 md:mb-4">
                    {message.type === 'response' && (
                      <Avatar className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0">
                        <AvatarImage src="/placeholder-avatar.jpg" alt="AI" />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs md:text-sm">AI</AvatarFallback>
                      </Avatar>
                    )}
                    <div className={`flex-1 flex ${message.type === 'request' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`p-2 md:p-3 rounded-lg ${
                          message.type === 'request' 
                            ? 'bg-teal-500 text-white min-w-[150px] md:min-w-[200px] max-w-[80%]' 
                            : 'bg-zinc-800 text-zinc-100 min-w-[150px] md:min-w-[200px] max-w-[85%]'
                        }`}
                      >
                        <div className="break-words break-all overflow-hidden overflow-wrap-break-word text-sm md:text-base">
                          {renderMessage(message, index)}
                        </div>
                      </div>
                    </div>
                    {message.type === 'request' && (
                      <Avatar className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0">
                        <AvatarImage src="/placeholder-user.jpg" alt="User" />
                        <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs md:text-sm">U</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-2 md:mb-4">
                    <Avatar className="w-6 h-6 md:w-8 md:h-8 mr-1 md:mr-2">
                      <AvatarImage src="/placeholder-avatar.jpg" alt="AI" />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs md:text-sm">AI</AvatarFallback>
                    </Avatar>
                    <div className="bg-zinc-800 p-2 md:p-3 rounded-lg">
                      <div className="flex space-x-1 md:space-x-2">
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-zinc-600 rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
          
          <CardFooter className="border-t border-zinc-800 p-2 md:p-4 flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
                setInput('')
              }}
              className="flex w-full items-center space-x-2"
            >
              {isListening ? (
                <div className="flex-grow bg-zinc-800 rounded-md h-10 px-3 flex items-center">
                  <div className="flex items-center gap-0.5 w-full h-full">
                    {voiceAnimation.map((height, index) => (
                      <div
                        key={index}
                        className="flex-1 bg-teal-500"
                        style={{
                          height: `${height}%`,
                          transition: 'height 100ms ease',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : isTranslating ? (
                <div className="flex-grow bg-zinc-800 rounded-md h-10 px-3 flex items-center text-zinc-400">
                  Translating...
                </div>
              ) : (
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-grow bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-400"
                  disabled={isLoading}
                />
              )}
              <Button
                type="button"
                size="icon"
                disabled={isLoading}
                className={`${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-zinc-800 hover:bg-zinc-700'
                } text-white`}
                onMouseDown={startListening}
                onMouseUp={stopListening}
                onTouchStart={startListening}
                onTouchEnd={stopListening}
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-pulse' : ''}`} />
                <span className="sr-only">Voice Input</span>
              </Button>
              <Button 
                type="submit" 
                size="icon" 
                disabled={isLoading || isListening}
                className="bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </CardFooter>
        </div>

        <div className="flex flex-wrap gap-2 justify-center mt-4 flex-shrink-0">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion}
              variant="outline"
              className="bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800 hover:text-white"
              onClick={() => {
                setInput(suggestion)
                handleSend()
              }}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

