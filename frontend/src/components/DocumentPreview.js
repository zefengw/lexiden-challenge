import React, { useState, useMemo } from "react";
import "./DocumentPreview.css";

const DocumentPreview = ({ document, editHistory }) => {
  const [showHistory, setShowHistory] = useState(false);

  const formatDocumentType = (type) => {
    if (!type) return "Document";
    return type
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getDocumentIcon = (type) => {
    switch (type) {
      case "nda":
        return "🔒";
      case "employment_agreement":
        return "💼";
      case "board_resolution":
        return "📋";
      case "service_agreement":
        return "🤝";
      case "consulting_agreement":
        return "💡";
      default:
        return "📄";
    }
  };

  const documentContent = useMemo(() => {
    if (!document) return null;

    const parties = document.parties || [];
    const docType = document.document_type;

    const effectiveDate =
      document.effective_date || document.dates?.effective_date;
    const endDate = document.end_date || document.dates?.end_date;
    const duration = document.duration || document.dates?.duration;

    let sections = [];

    sections.push({
      id: "title",
      type: "title",
      content: document.title || formatDocumentType(docType),
    });

    if (parties.length > 0) {
      sections.push({
        id: "parties",
        type: "section",
        heading: "PARTIES",
        content: parties
          .map((p) => `${p.name} ("${p.role}")`)
          .join("\n\nAND\n\n"),
      });
    }

    let datesClauses = [];
    if (effectiveDate) {
      datesClauses.push(`Effective Date: ${effectiveDate}`);
    }
    if (endDate) {
      datesClauses.push(`End Date: ${endDate}`);
    }
    if (duration) {
      datesClauses.push(`Duration: ${duration}`);
    }

    if (datesClauses.length > 0) {
      sections.push({
        id: "dates",
        type: "section",
        heading: "DATES & DURATION",
        content: datesClauses.join("\n\n"),
      });
    }

    const terms = document.terms || {};
    if (Object.keys(terms).length > 0) {
      sections.push({
        id: "terms",
        type: "section",
        heading: "TERMS",
        content: Object.entries(terms)
          .map(
            ([key, value]) =>
              `${key.replace(/_/g, " ").toUpperCase()}: ${
                typeof value === "object" ? JSON.stringify(value) : value
              }`
          )
          .join("\n\n"),
      });
    }

    if (document.provisions && document.provisions.length > 0) {
      sections.push({
        id: "provisions",
        type: "section",
        heading: "ADDITIONAL PROVISIONS",
        content: document.provisions
          .map((p, i) => `${i + 1}. ${p}`)
          .join("\n\n"),
      });
    }

    if (document.jurisdiction) {
      sections.push({
        id: "jurisdiction",
        type: "clause",
        content: `This agreement shall be governed by the laws of ${document.jurisdiction}.`,
      });
    }

    if (parties.length > 0) {
      sections.push({
        id: "signatures",
        type: "signatures",
        parties: parties,
      });
    }

    return sections;
  }, [document]);

  const isRecentlyEdited = (sectionId) => {
    if (!editHistory || editHistory.length === 0) return false;
    const lastEdit = editHistory[editHistory.length - 1];
    return lastEdit && lastEdit.section === sectionId;
  };

  if (!document) {
    return (
      <div className="document-preview empty">
        <div className="empty-state">
          <div className="empty-icon">📄</div>
          <h3>Document Preview</h3>
          <p>
            Your generated document will appear here as you chat with the
            assistant.
          </p>
          <div className="empty-features">
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>Real-time document generation</span>
            </div>
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>Edit highlighting</span>
            </div>
            <div className="feature">
              <span className="feature-icon">✓</span>
              <span>Version history tracking</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-preview">
      <div className="preview-header">
        <div className="doc-info">
          <span className="doc-icon">
            {getDocumentIcon(document.document_type)}
          </span>
          <div>
            <h2>
              {document.title || formatDocumentType(document.document_type)}
            </h2>
            <span className="doc-meta">
              {editHistory.length > 0
                ? `Version ${editHistory.length + 1} • ${
                    editHistory.length
                  } edit${editHistory.length !== 1 ? "s" : ""}`
                : "Draft"}
            </span>
          </div>
        </div>

        <div className="preview-actions">
          {editHistory.length > 0 && (
            <button
              className={`history-toggle ${showHistory ? "active" : ""}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              <span>📝</span> History
            </button>
          )}
        </div>
      </div>

      {showHistory && editHistory.length > 0 && (
        <div className="history-panel">
          <h4>Edit History</h4>
          <div className="history-list">
            {editHistory.map((edit, index) => (
              <div key={index} className="history-item">
                <div className="history-badge">{edit.type}</div>
                <div className="history-details">
                  <span className="history-section">{edit.section}</span>
                  {edit.original && (
                    <div className="history-change">
                      <span className="old-value">{edit.original}</span>
                      <span className="change-arrow">→</span>
                      <span className="new-value">{edit.new}</span>
                    </div>
                  )}
                  {edit.reason && (
                    <p className="history-reason">{edit.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="document-content">
        {documentContent &&
          documentContent.map((section) => (
            <div
              key={section.id}
              className={`document-section ${section.type} ${
                isRecentlyEdited(section.id) ? "recently-edited" : ""
              }`}
            >
              {section.type === "title" && (
                <h1 className="doc-title">{section.content}</h1>
              )}

              {section.type === "section" && (
                <>
                  <h3 className="section-heading">{section.heading}</h3>
                  <div className="section-content">
                    {section.content.split("\n").map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                </>
              )}

              {section.type === "clause" && (
                <p className="clause">{section.content}</p>
              )}

              {section.type === "signatures" && (
                <div className="signatures-section">
                  <h3 className="section-heading">SIGNATURES</h3>
                  <div className="signature-blocks">
                    {section.parties.map((party, i) => (
                      <div key={i} className="signature-block">
                        <div className="signature-line"></div>
                        <p className="signer-name">{party.name}</p>
                        <p className="signer-role">{party.role}</p>
                        <p className="date-line">Date: _____________</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

        {!documentContent && (
          <div className="document-generating">
            <div className="generating-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p>Generating document...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentPreview;
