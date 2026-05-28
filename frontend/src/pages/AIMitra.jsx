import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Trash2, Sparkles, AlertCircle, Loader2 } from 'lucide-react'

const SUGGESTED_PROMPTS = [
    "What do high creatinine levels in a blood test mean?",
    "Explain my HbA1c result of 7.2% in simple terms",
    "What are the symptoms of dengue fever?",
    "How can I manage Type 2 diabetes naturally?",
    "What medications help with high blood pressure?",
    "Is a hemoglobin level of 10 g/dL dangerous?",
]

function MessageBubble({ message }) {
    const isUser = message.role === 'user'
    return (
        <div className={`ai-message ${isUser ? 'ai-message-user' : 'ai-message-bot'}`}>
            <div className={`ai-avatar ${isUser ? 'ai-avatar-user' : 'ai-avatar-bot'}`}>
                {isUser ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`ai-bubble ${isUser ? 'ai-bubble-user' : 'ai-bubble-bot'}`}>
                {!isUser && (
                    <div className="ai-bubble-header">
                        <Sparkles size={12} />
                        <span>HealthMitra AI</span>
                    </div>
                )}
                <div className="ai-bubble-text">
                    {message.content.split('\n').map((line, i) => (
                        <span key={i}>
                            {line}
                            {i < message.content.split('\n').length - 1 && <br />}
                        </span>
                    ))}
                </div>
                <div className="ai-bubble-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )
}

export default function AIMitra() {
    const [messages, setMessages] = useState([
        {
            role: 'model',
            content: "Namaste! 🙏 I'm HealthMitra AI, your personal medical assistant.\n\nI can help you:\n• Understand medical reports & test results\n• Explain symptoms and conditions\n• Guide you on medications and treatments\n• Provide health tips and preventive care\n\nHow can I assist you today?",
            timestamp: Date.now(),
        }
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const bottomRef = useRef(null)
    const inputRef = useRef(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    const sendMessage = async (text) => {
        const userText = (text || input).trim()
        if (!userText || loading) return

        const userMsg = { role: 'user', content: userText, timestamp: Date.now() }
        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setLoading(true)
        setError(null)

        try {
            const token = localStorage.getItem('hm_token')
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({
                        role: m.role,
                        content: m.content,
                    }))
                }),
            })

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}))
                throw new Error(errData.detail || `Error ${res.status}`)
            }

            const data = await res.json()
            setMessages(prev => [
                ...prev,
                { role: 'model', content: data.reply, timestamp: Date.now() }
            ])
        } catch (err) {
            setError(err.message || 'Failed to get response. Please try again.')
        } finally {
            setLoading(false)
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const clearChat = () => {
        setMessages([{
            role: 'model',
            content: "Chat cleared! How can I help you today?",
            timestamp: Date.now(),
        }])
        setError(null)
    }

    const showSuggestions = messages.length <= 1

    return (
        <div className="ai-chat-page">
            <div className="page-header">
                <h2>HealthMitra AI</h2>
                <p>Chat with your Gemini-powered health assistant in a dedicated tab for symptoms, reports, and general guidance.</p>
            </div>

            <div className="ai-chat-container">
            {/* Chat Header */}
            <div className="ai-chat-header">
                <div className="ai-chat-header-info">
                    <div className="ai-chat-avatar-ring">
                        <Bot size={22} />
                    </div>
                    <div>
                        <div className="ai-chat-name">HealthMitra AI</div>
                        <div className="ai-chat-status">
                            <span className="ai-status-dot" />
                            Powered by Gemini 1.5 Flash
                        </div>
                    </div>
                </div>
                <button className="ai-clear-btn" onClick={clearChat} title="Clear conversation">
                    <Trash2 size={16} />
                    <span>Clear</span>
                </button>
            </div>

            {/* Messages */}
            <div className="ai-messages-area">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                ))}

                {loading && (
                    <div className="ai-message ai-message-bot">
                        <div className="ai-avatar ai-avatar-bot">
                            <Bot size={16} />
                        </div>
                        <div className="ai-bubble ai-bubble-bot ai-typing">
                            <div className="ai-typing-dots">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="ai-error-banner">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Suggested Prompts */}
            {showSuggestions && !loading && (
                <div className="ai-suggestions">
                    <div className="ai-suggestions-label">Try asking:</div>
                    <div className="ai-suggestions-grid">
                        {SUGGESTED_PROMPTS.map((prompt, i) => (
                            <button
                                key={i}
                                className="ai-suggestion-chip"
                                onClick={() => sendMessage(prompt)}
                            >
                                {prompt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="ai-input-area">
                <div className="ai-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="ai-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about symptoms, medications, lab results..."
                        rows={1}
                        disabled={loading}
                    />
                    <button
                        className={`ai-send-btn ${(!input.trim() || loading) ? 'disabled' : ''}`}
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || loading}
                        title="Send message"
                    >
                        {loading ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
                    </button>
                </div>
                <div className="ai-disclaimer">
                    ⚠️ HealthMitra AI is for informational purposes only. Always consult a qualified doctor for medical decisions.
                </div>
            </div>
        </div>
        </div>
    )
}
