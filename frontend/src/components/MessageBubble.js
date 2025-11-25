import React from "react";
import "./MessageBubble.css";

const MessageBubble = ({ message }) => {
  const { role, content, isStreaming, toolCalls, error } = message;

  const formatToolName = (name) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getToolIcon = (toolName) => {
    switch (toolName) {
      case "extract_information":
        return "📋";
      case "generate_document":
        return "📄";
      case "apply_edits":
        return "✏️";
      default:
        return "⚙️";
    }
  };

  return (
    <div className={`message-bubble ${role}`}>
      {role === "assistant" && (
        <div className="avatar">
          <span>⚖</span>
        </div>
      )}

      <div className="message-content-wrapper">
        {toolCalls && toolCalls.length > 0 && (
          <div className="tool-calls">
            {toolCalls.map((tool, index) => (
              <div key={index} className={`tool-call ${tool.status}`}>
                <div className="tool-header">
                  <span className="tool-icon">
                    {getToolIcon(tool.function)}
                  </span>
                  <span className="tool-name">
                    {formatToolName(tool.function)}
                  </span>
                  <span className={`tool-status ${tool.status}`}>
                    {tool.status === "calling" ? "Processing..." : "Complete"}
                  </span>
                </div>

                {tool.arguments && Object.keys(tool.arguments).length > 0 && (
                  <div className="tool-details">
                    {tool.function === "extract_information" &&
                      tool.arguments.extracted_data && (
                        <div className="extracted-data">
                          {tool.arguments.document_type && (
                            <span className="data-tag document-type">
                              {tool.arguments.document_type
                                .replace("_", " ")
                                .toUpperCase()}
                            </span>
                          )}
                          {tool.arguments.ready_to_generate && (
                            <span className="data-tag ready">
                              Ready to Generate
                            </span>
                          )}
                        </div>
                      )}

                    {tool.function === "generate_document" && (
                      <div className="generate-info">
                        <span className="data-tag generating">
                          Generating{" "}
                          {tool.arguments.document_type?.replace("_", " ")}...
                        </span>
                      </div>
                    )}

                    {tool.function === "apply_edits" && (
                      <div className="edit-info">
                        <span className="data-tag edit">
                          {tool.arguments.edit_type}:{" "}
                          {tool.arguments.target_section}
                        </span>
                        {tool.arguments.new_value && (
                          <div className="edit-preview">
                            <span className="edit-arrow">→</span>
                            <span className="new-value">
                              {tool.arguments.new_value}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {content && (
          <div className="message-content">
            <p>{content}</p>
            {isStreaming && <span className="cursor">▊</span>}
          </div>
        )}

        {error && (
          <div className="message-error">
            <span className="error-icon">⚠</span>
            {error}
          </div>
        )}

        {isStreaming && !content && !toolCalls?.length && (
          <div className="streaming-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {role === "user" && (
        <div className="avatar user-avatar">
          <span>👤</span>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
