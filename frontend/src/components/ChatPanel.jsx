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

  // Check indexing status on mount with polling fallback
  useEffect(() => {
    let intervalId = null;

    const checkStatus = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/chat/${sessionId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.indexed) {
            setIsIndexed(true);
            if (intervalId) clearInterval(intervalId);
          } else {
            // Trigger auto-reindex if not indexed
            await fetch(`http://localhost:5000/api/reindex/${sessionId}`, { method: 'POST' });
          }
        }
      } catch (err) {
        console.error("Failed to check status", err);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2500);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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
    <div className="flex flex-col h-[580px] bg-slate-50/80 dark:bg-slate-950/80 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-inner">
      {/* Index Status Banner */}
      {!isIndexed && (
        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-6 py-2.5 border-b border-amber-200/80 dark:border-amber-900/50 text-xs font-bold flex items-center space-x-2">
          <span className="animate-pulse">⏳</span>
          <span>Vector indexing in progress. Please allow a few seconds for semantic search ready status.</span>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400 text-xl font-bold">
              💬
            </div>
            <h4 className="text-base font-extrabold text-slate-900 dark:text-white">Ask your AI Lecture Tutor</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-xs leading-relaxed font-normal">
              I have indexed the full lecture transcript into ChromaDB vector memory. Ask any clarification questions or exam preparation prompts!
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
                <div className="max-w-[80%] bg-brand-600 text-white rounded-2xl px-4 py-3 text-sm font-semibold shadow-md leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                /* Assistant Message Bubble */
                <div className="max-w-[85%] space-y-2">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl px-5 py-4 text-sm font-medium shadow-xs leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Sources display */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => toggleSources(msg.id)}
                        className="text-xs font-black text-brand-600 dark:text-brand-400 hover:underline flex items-center space-x-1 cursor-pointer"
                      >
                        <span>📚 {expandedSources[msg.id] ? "Hide Citation Sources" : "View Citation Sources"}</span>
                      </button>

                      {expandedSources[msg.id] && (
                        <div className="space-y-2 pl-3 border-l-2 border-brand-500 bg-slate-100 dark:bg-slate-900/60 p-3 rounded-xl text-xs italic text-slate-600 dark:text-slate-400">
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
                    <div className="w-36 space-y-1 pt-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-wider">
                        <span>Relevance</span>
                        <span>{Math.round(msg.confidence * 100)}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            msg.confidence > 0.6
                              ? 'bg-emerald-500'
                              : msg.confidence > 0.4
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
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
            <div className="flex space-x-1.5 items-center p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs w-max">
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '-0.3s' }} />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '-0.15s' }} />
              <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800">
        <form onSubmit={handleSend} className="space-y-2">
          <div className="flex space-x-2 items-end">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder={isIndexed ? "Ask any question about this lecture..." : "Indexing vector memory..."}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 font-medium rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none max-h-[120px] disabled:opacity-60 placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || !isIndexed}
              className="bg-brand-600 hover:bg-brand-500 active:bg-brand-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white rounded-2xl px-5 py-3 text-sm font-black shadow-md transition-all duration-300 disabled:opacity-50 disabled:shadow-none cursor-pointer"
            >
              Send
            </button>
          </div>
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              Grounded strictly in lecture transcript
            </span>
            {error && (
              <span className="text-[10px] text-rose-500 font-bold">
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
