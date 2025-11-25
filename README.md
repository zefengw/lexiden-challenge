# Lexiden - Legal Document Assistant

A conversational AI interface for generating legal documents using SSE streaming, LLM function calling, and prompt engineering.

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- OpenAI API Key

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
echo "OPENAI_API_KEY=sk-your-key-here" > .env
python app.py
```

Backend runs on `http://localhost:5001`

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on `http://localhost:3000`

---

## Project Structure & File Explanations

```
lexiden-challenge/
├── backend/
│   ├── app.py          # Flask server - SSE streaming & API endpoints
│   ├── prompts.py      # System prompt with engineering documentation
│   ├── tools.py        # Function definitions for LLM tool calling
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.js                    # Main layout with header & panels
│       ├── App.css                   # Global styles & design system
│       └── components/
│           ├── ChatInterface.js/css  # Chat UI with SSE handling
│           ├── MessageBubble.js/css  # Message display + tool indicators
│           └── DocumentPreview.js/css # Document viewer + edit history
└── README.md
```

### Backend Files

#### `app.py` - Flask Server (Main Entry Point)

- **Lines 37-53**: Session management functions for conversation and document storage
- **Lines 56-139**: `execute_function_call()` - Handles the three LLM functions
- **Lines 142-311**: `generate_sse_stream()` - Core SSE streaming logic with OpenAI
- **Lines 314-378**: API endpoints (`/api/chat`, `/api/conversation`, `/api/document`, `/api/health`)

#### `prompts.py` - System Prompt

Contains the carefully engineered system prompt that defines:

- Conversation phases (Intent → Gathering → Generation → Revision)
- Required information per document type
- Function calling rules
- Edge case handling instructions

#### `tools.py` - Function Definitions

Defines three OpenAI-compatible function schemas:

1. `extract_information` - Structures user data
2. `generate_document` - Creates the document
3. `apply_edits` - Modifies existing documents

### Frontend Files

#### `App.js` - Main Application

- State management for document and edit history
- Session ID generation for conversation tracking
- Layout with header, chat panel, and document panel

#### `ChatInterface.js` - Chat Component

- **Lines 27-207**: `handleSendMessage()` - Sends message and processes SSE stream
- **Lines 74-188**: SSE parsing loop that handles content, tool_call, tool_result, done, error events
- Real-time message updates as tokens stream in

#### `MessageBubble.js` - Message Display

- Renders user/assistant messages
- Shows tool call indicators with status (Processing/Complete)
- Displays streaming cursor animation

#### `DocumentPreview.js` - Document Viewer

- Renders document from structured data
- Highlights recently edited sections
- Shows edit history panel with version tracking

## API Reference

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| POST   | `/api/chat`             | SSE streaming chat       |
| GET    | `/api/conversation/:id` | Get conversation history |
| DELETE | `/api/conversation/:id` | Clear conversation       |
| GET    | `/api/document/:id`     | Get current document     |
| GET    | `/api/health`           | Health check             |
