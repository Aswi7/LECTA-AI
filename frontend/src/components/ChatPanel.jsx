import { useState, useEffect, useRef } from 'react';

const ChatPanel = ({ sessionId, isIndexed: isIndexedProp }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isIndexed, setIsIndexed] = useState(isIndexedProp);
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Check indexing status on mount
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          setIsIndexed(data.indexed);
        }
      } catch (err) {
        console.error("Failed to check status", err);
      }
    };
    checkStatus();
  }, [sessionId]);

  // Scroll to bottom on messages/loading change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Auto-resize input text area
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    const query = input.trim();
    if (!query || isLoading) return;

    setError(null);
    const newMsgId = Date.now().toString();

    // 1. Add student message to messages array
    const studentMessage = {
      role: "student",
      content: query,
      id: newMsgId,
    };
    setMessages((prev) => [...prev, studentMessage]);

    // 2. Clear input
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // 3. Set isLoading true
    setIsLoading(true);

    try {
      // Get last 6 messages as chat history formatted for backend
      const history = messages.slice(-6).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // 4. POST to API
      const response = await fetch(`http://localhost:5000/api/chat/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query,
          history: history,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from assistant");
      }

      const data = await response.json();

      // 5. Add assistant response to messages
      const assistantMessage = {
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        confidence: data.confidence,
        id: Date.now().toString() + "-assistant",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setError("Failed to send message. Please verify your connection or try again.");
    } finally {
      // 6. Set isLoading false
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleSources = (msgId) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div className="flex flex-col h-[600px] bg-gray-50/50 dark:bg-gray-900/50 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      {/* Index Status Banner */}
      {!isIndexed && (
        <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 px-6 py-3 border-b border-amber-100 dark:border-amber-900/50 text-sm font-semibold flex items-center space-x-2">
          <span>⏳ Chat indexing in progress. Please wait a moment and refresh.</span>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <p className="text-gray-400 dark:text-gray-500 italic max-w-md text-base leading-relaxed">
              👋 Hi! I have read this entire lecture. Ask me anything — definitions, what the professor said about specific topics, or concepts you want to understand better.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'student' ? 'items-end' : 'items-start'}`}
            >
              {msg.role === 'student' ? (
                /* Student Message Bubble */
                <div className="max-w-[80%] bg-blue-500 text-white rounded-2xl px-4 py-2 text-sm font-medium shadow-sm leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                /* Assistant Message Bubble */
                <div className="max-w-[85%] space-y-2">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl px-4 py-3 text-sm shadow-sm leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Sources display */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleSources(msg.id)}
                        className="text-xs font-black text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1"
                      >
                        <span>📚 {expandedSources[msg.id] ? "Hide Sources" : "Show Sources"}</span>
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="space-y-2 pl-3 border-l-2 border-brand-400 dark:border-brand-600 bg-gray-100/50 dark:bg-gray-800/30 p-2.5 rounded-lg text-xs italic text-gray-600 dark:text-gray-400">
                          {msg.sources.map((src, idx) => (
                            <div key={idx} className="mb-1 leading-relaxed">
                              "{src}"
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confidence progress bar */}
                  {msg.confidence !== undefined && (
                    <div className="w-40 space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                        <span>Confidence</span>
                        <span>{Math.round(msg.confidence * 100)}%</span>
                      </div>
                      <div className="w-full h-1 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-500 ${
                            msg.confidence > 0.8
                              ? 'bg-emerald-500'
                              : msg.confidence > 0.6
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${msg.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="flex space-x-1.5 items-center p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm w-max">
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '-0.3s' }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '-0.15s' }}
              />
              <div
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0s' }}
              />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
        <form onSubmit={handleSend} className="space-y-2">
          <div className="flex space-x-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isIndexed ? "Ask anything about this lecture..." : "Chat is disabled while indexing..."}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-750 text-sm text-gray-800 dark:text-gray-100 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-[120px] disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !isIndexed}
              className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 text-white rounded-xl px-4 py-2.5 text-sm font-bold shadow transition-all duration-300 disabled:opacity-60 disabled:shadow-none"
            >
              Send
            </button>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
              Ask anything about this lecture
            </span>
            {error && (
              <span className="text-[10px] text-red-500 font-bold">
                {error}
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
