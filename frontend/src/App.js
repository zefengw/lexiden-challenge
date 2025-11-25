import React, { useState, useCallback } from "react";
import ChatInterface from "./components/ChatInterface";
import DocumentPreview from "./components/DocumentPreview";
import "./App.css";

function App() {
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentHistory, setDocumentHistory] = useState([]);
  const [sessionId] = useState(() => `session_${Date.now()}`);

  const handleDocumentUpdate = useCallback((doc, editInfo = null) => {
    if (doc) {
      setCurrentDocument(doc);
    }

    if (editInfo) {
      setDocumentHistory((prev) => [...prev, editInfo]);

      setCurrentDocument((prevDoc) => {
        if (!prevDoc) return prevDoc;

        const section = editInfo.section.toLowerCase().replace(/\s+/g, "_");
        const newValue = editInfo.new;
        const updatedDoc = { ...prevDoc };

        const sectionPatterns = [
          {
            patterns: ["effective_date", "effective", "start_date"],
            key: "effective_date",
          },
          { patterns: ["end_date", "termination", "expiry"], key: "end_date" },
          {
            patterns: ["duration", "confidentiality", "term", "period"],
            key: "duration",
          },
          {
            patterns: ["jurisdiction", "governing_law", "law"],
            key: "jurisdiction",
          },
          { patterns: ["title", "name", "document_title"], key: "title" },
        ];

        let mappedProperty = section;
        for (const { patterns, key } of sectionPatterns) {
          if (patterns.some((p) => section.includes(p))) {
            mappedProperty = key;
            break;
          }
        }

        if (
          mappedProperty === "duration" ||
          mappedProperty === "effective_date" ||
          mappedProperty === "end_date"
        ) {
          updatedDoc[mappedProperty] = newValue;
          if (updatedDoc.dates) {
            updatedDoc.dates = {
              ...updatedDoc.dates,
              [mappedProperty]: newValue,
            };
          } else {
            updatedDoc.dates = { [mappedProperty]: newValue };
          }
        } else if (mappedProperty in updatedDoc) {
          updatedDoc[mappedProperty] = newValue;
        } else if (updatedDoc.terms) {
          updatedDoc.terms = {
            ...updatedDoc.terms,
            [mappedProperty]: newValue,
          };
        } else {
          updatedDoc[mappedProperty] = newValue;
        }

        return updatedDoc;
      });
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    try {
      await fetch(`http://localhost:5001/api/conversation/${sessionId}`, {
        method: "DELETE",
      });
      setCurrentDocument(null);
      setDocumentHistory([]);
      window.location.reload();
    } catch (error) {
      console.error("Failed to clear conversation:", error);
    }
  }, [sessionId]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚖</span>
            <h1>Lexiden</h1>
            <span className="tagline">Legal Document Assistant</span>
          </div>
          <button onClick={handleNewChat} className="new-chat-btn">
            <span>✦</span> New Conversation
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="chat-panel">
          <ChatInterface
            sessionId={sessionId}
            onDocumentUpdate={handleDocumentUpdate}
          />
        </div>

        <div className="document-panel">
          <DocumentPreview
            document={currentDocument}
            editHistory={documentHistory}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
