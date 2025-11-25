import os
import json
import time
from flask import Flask, request, Response, stream_with_context, jsonify
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

from prompts import LEGAL_ASSISTANT_SYSTEM_PROMPT
from tools import TOOLS, get_template

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

conversations = {}
documents = {}


def get_or_create_conversation(session_id: str) -> list:
    if session_id not in conversations:
        conversations[session_id] = [
            {"role": "system", "content": LEGAL_ASSISTANT_SYSTEM_PROMPT}
        ]
    return conversations[session_id]


def get_current_document(session_id: str) -> dict | None:
    return documents.get(session_id)


def save_document(session_id: str, document: dict):
    documents[session_id] = document


def execute_function_call(function_name: str, arguments: dict, session_id: str) -> dict:
    if function_name == "extract_information":
        result = {
            "status": "success",
            "message": "Information extracted and stored",
            "extracted_data": arguments.get("extracted_data", {}),
            "document_type": arguments.get("document_type"),
            "ready_to_generate": arguments.get("ready_to_generate", False),
            "missing_fields": arguments.get("missing_fields", [])
        }

        if session_id not in documents:
            documents[session_id] = {"extracted_data": {}, "document_type": None, "content": None}

        documents[session_id]["extracted_data"] = arguments.get("extracted_data", {})
        documents[session_id]["document_type"] = arguments.get("document_type")

        return result

    elif function_name == "generate_document":
        document_type = arguments.get("document_type", "nda")
        document_data = arguments.get("document_data", {})

        template = get_template(document_type)

        doc_info = {
            "type": document_type,
            "data": document_data,
            "content": template,
            "version": 1,
            "history": []
        }
        save_document(session_id, doc_info)

        return {
            "status": "success",
            "message": f"Generating {document_type.replace('_', ' ').title()}",
            "document_type": document_type,
            "document_data": document_data,
            "template_available": True
        }

    elif function_name == "apply_edits":
        edit_type = arguments.get("edit_type")
        target_section = arguments.get("target_section")
        original_value = arguments.get("original_value", "")
        new_value = arguments.get("new_value")
        reason = arguments.get("reason", "")

        current_doc = get_current_document(session_id)

        if current_doc:
            if "history" not in current_doc:
                current_doc["history"] = []
            current_doc["history"].append({
                "edit_type": edit_type,
                "target_section": target_section,
                "original_value": original_value,
                "new_value": new_value,
                "reason": reason,
                "timestamp": time.time()
            })
            current_doc["version"] = current_doc.get("version", 1) + 1
            save_document(session_id, current_doc)

        return {
            "status": "success",
            "message": f"Applied {edit_type} to {target_section}",
            "edit_type": edit_type,
            "target_section": target_section,
            "original_value": original_value,
            "new_value": new_value,
            "reason": reason
        }

    return {"status": "error", "message": f"Unknown function: {function_name}"}


def generate_sse_stream(session_id: str, user_message: str):
    messages = get_or_create_conversation(session_id)
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            stream=True
        )

        full_response = ""
        tool_calls = {}
        current_tool_id = None

        for chunk in response:
            if not chunk.choices:
                continue

            delta = chunk.choices[0].delta
            finish_reason = chunk.choices[0].finish_reason

            if delta.content:
                full_response += delta.content
                yield f"data: {json.dumps({'type': 'content', 'content': delta.content})}\n\n"

            if delta.tool_calls:
                for tool_call in delta.tool_calls:
                    tool_id = tool_call.id or current_tool_id

                    if tool_call.id:
                        current_tool_id = tool_call.id
                        tool_calls[tool_id] = {
                            "id": tool_id,
                            "function": {
                                "name": tool_call.function.name if tool_call.function else "",
                                "arguments": ""
                            }
                        }

                    if tool_call.function:
                        if tool_call.function.name:
                            tool_calls[tool_id]["function"]["name"] = tool_call.function.name
                        if tool_call.function.arguments:
                            tool_calls[tool_id]["function"]["arguments"] += tool_call.function.arguments

            if finish_reason == "tool_calls":
                for tool_id, tool_call_data in tool_calls.items():
                    function_name = tool_call_data["function"]["name"]

                    try:
                        arguments = json.loads(tool_call_data["function"]["arguments"])
                    except json.JSONDecodeError:
                        arguments = {}

                    yield f"data: {json.dumps({'type': 'tool_call', 'function': function_name, 'arguments': arguments})}\n\n"

                    result = execute_function_call(function_name, arguments, session_id)

                    yield f"data: {json.dumps({'type': 'tool_result', 'function': function_name, 'result': result})}\n\n"

                    messages.append({
                        "role": "assistant",
                        "content": full_response if full_response else None,
                        "tool_calls": [{
                            "id": tool_id,
                            "type": "function",
                            "function": {
                                "name": function_name,
                                "arguments": tool_call_data["function"]["arguments"]
                            }
                        }]
                    })

                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_id,
                        "content": json.dumps(result)
                    })

                full_response = ""

                follow_up = client.chat.completions.create(
                    model="gpt-4o",
                    messages=messages,
                    tools=TOOLS,
                    tool_choice="auto",
                    stream=True
                )

                for follow_chunk in follow_up:
                    if not follow_chunk.choices:
                        continue

                    follow_delta = follow_chunk.choices[0].delta

                    if follow_delta.content:
                        full_response += follow_delta.content
                        yield f"data: {json.dumps({'type': 'content', 'content': follow_delta.content})}\n\n"

                    if follow_delta.tool_calls:
                        for tool_call in follow_delta.tool_calls:
                            tool_id = tool_call.id or current_tool_id

                            if tool_call.id:
                                current_tool_id = tool_call.id
                                tool_calls[tool_id] = {
                                    "id": tool_id,
                                    "function": {
                                        "name": tool_call.function.name if tool_call.function else "",
                                        "arguments": ""
                                    }
                                }

                            if tool_call.function:
                                if tool_call.function.name:
                                    tool_calls[tool_id]["function"]["name"] = tool_call.function.name
                                if tool_call.function.arguments:
                                    tool_calls[tool_id]["function"]["arguments"] += tool_call.function.arguments

                    if follow_chunk.choices[0].finish_reason == "tool_calls":
                        for tool_id, tool_call_data in tool_calls.items():
                            if tool_id in [m.get("tool_call_id") for m in messages if m.get("role") == "tool"]:
                                continue

                            function_name = tool_call_data["function"]["name"]

                            try:
                                arguments = json.loads(tool_call_data["function"]["arguments"])
                            except json.JSONDecodeError:
                                arguments = {}

                            yield f"data: {json.dumps({'type': 'tool_call', 'function': function_name, 'arguments': arguments})}\n\n"

                            result = execute_function_call(function_name, arguments, session_id)

                            yield f"data: {json.dumps({'type': 'tool_result', 'function': function_name, 'result': result})}\n\n"

        if full_response:
            messages.append({"role": "assistant", "content": full_response})

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    except Exception as e:
        error_msg = str(e)
        yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.json
    user_message = data.get("message", "")
    session_id = data.get("session_id", "default")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    return Response(
        stream_with_context(generate_sse_stream(session_id, user_message)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.route("/api/conversation/<session_id>", methods=["GET"])
def get_conversation(session_id):
    messages = conversations.get(session_id, [])
    display_messages = [m for m in messages if m.get("role") != "system"]
    return jsonify({"messages": display_messages})


@app.route("/api/conversation/<session_id>", methods=["DELETE"])
def clear_conversation(session_id):
    if session_id in conversations:
        conversations[session_id] = [
            {"role": "system", "content": LEGAL_ASSISTANT_SYSTEM_PROMPT}
        ]
    if session_id in documents:
        del documents[session_id]
    return jsonify({"status": "cleared"})


@app.route("/api/document/<session_id>", methods=["GET"])
def get_document(session_id):
    doc = documents.get(session_id)
    if doc:
        return jsonify(doc)
    return jsonify({"error": "No document found"}), 404


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY"))
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    print(f"Starting Legal Document Assistant API on port {port}")
    print(f"OpenAI API Key configured: {bool(os.getenv('OPENAI_API_KEY'))}")
    app.run(host="0.0.0.0", port=port, debug=True)
