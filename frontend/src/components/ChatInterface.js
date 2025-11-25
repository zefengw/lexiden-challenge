import React, { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "./MessageBubble";
import "./ChatInterface.css";

const ChatInterface = ({ sessionId, onDocumentUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const extractedDataRef = useRef({});
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setConnectionError(null);

    const userMessageId = Date.now();
    const assistantMessageId = userMessageId + 1;

    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: "user",
        content: userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        isStreaming: true,
        toolCalls: [],
        timestamp: new Date().toISOString(),
      },
    ]);
    setIsStreaming(true);

    try {
      const response = await fetch("http://localhost:5001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, session_id: sessionId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (data.type) {
                case "content":
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + data.content }
                        : msg
                    )
                  );
                  break;

                case "tool_call":
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            toolCalls: [
                              ...(msg.toolCalls || []),
                              {
                                function: data.function,
                                arguments: data.arguments,
                                status: "calling",
                              },
                            ],
                          }
                        : msg
                    )
                  );
                  break;

                case "tool_result":
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? {
                            ...msg,
                            toolCalls: (msg.toolCalls || []).map((tc) =>
                              tc.function === data.function
                                ? {
                                    ...tc,
                                    result: data.result,
                                    status: "completed",
                                  }
                                : tc
                            ),
                          }
                        : msg
                    )
                  );

                  if (data.function === "extract_information" && data.result) {
                    const newExtracted = data.result.extracted_data || {};
                    const prev = extractedDataRef.current;
                    extractedDataRef.current = {
                      ...prev,
                      parties: newExtracted.parties || prev.parties,
                      dates: {
                        ...(prev.dates || {}),
                        ...(newExtracted.dates || {}),
                      },
                      terms: {
                        ...(prev.terms || {}),
                        ...(newExtracted.terms || {}),
                      },
                      provisions:
                        newExtracted.additional_provisions || prev.provisions,
                      document_type:
                        data.result.document_type || prev.document_type,
                    };
                  }

                  if (data.function === "generate_document" && data.result) {
                    const docData = data.result.document_data || {};
                    const extracted = extractedDataRef.current;
                    onDocumentUpdate(
                      {
                        ...extracted,
                        ...docData,
                        document_type: data.result.document_type,
                        effective_date:
                          docData.effective_date ||
                          extracted.dates?.effective_date,
                        end_date: docData.end_date || extracted.dates?.end_date,
                        duration: docData.duration || extracted.dates?.duration,
                        dates: {
                          ...(extracted.dates || {}),
                          ...(docData.dates || {}),
                        },
                      },
                      null
                    );
                  }

                  if (data.function === "apply_edits" && data.result) {
                    onDocumentUpdate(null, {
                      type: data.result.edit_type,
                      section: data.result.target_section,
                      original: data.result.original_value,
                      new: data.result.new_value,
                      reason: data.result.reason,
                    });
                  }
                  break;

                case "done":
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, isStreaming: false }
                        : msg
                    )
                  );
                  break;

                case "error":
                  setConnectionError(data.error);
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, isStreaming: false, error: data.error }
                        : msg
                    )
                  );
                  break;

                default:
                  break;
              }
            } catch (parseError) {
              console.error("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setConnectionError(error.message);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
                error:
                  "Connection failed. Please ensure the backend server is running.",
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestedPrompts = [
    "I need to create a Non-Disclosure Agreement",
    "Help me draft an employment agreement",
    "I want to appoint a new director to the board",
  ];

  return (
    <div className="chat-interface">
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">⚖</div>
            <h2>Welcome to Lexiden</h2>
            <p>
              Your AI-powered legal document assistant. I can help you create
              NDAs, employment agreements, board resolutions, and more.
            </p>
            <div className="suggested-prompts">
              <h3>Get started with:</h3>
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="suggested-prompt"
                  onClick={() => {
                    setInputValue(prompt);
                    inputRef.current?.focus();
                  }}
                >
                  <span className="prompt-icon">→</span>
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {connectionError && (
        <div className="connection-error">
          <span className="error-icon">⚠</span>
          {connectionError}
        </div>
      )}

      <div className="input-container">
        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Describe the legal document you need..."
            disabled={isStreaming}
            rows={1}
          />
          <button
            className="send-button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isStreaming}
          >
            {isStreaming ? (
              <span className="loading-dots">
                <span>•</span>
                <span>•</span>
                <span>•</span>
              </span>
            ) : (
              <span className="send-icon">↑</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
