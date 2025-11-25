TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "extract_information",
            "description": "Extract and structure information from the conversation for document generation. Call this whenever the user provides new information that should be captured.",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_type": {
                        "type": "string",
                        "enum": ["nda", "employment_agreement", "board_resolution", "service_agreement", "consulting_agreement", "partnership_agreement", "other"],
                        "description": "The type of legal document being created"
                    },
                    "extracted_data": {
                        "type": "object",
                        "description": "Structured data extracted from conversation",
                        "properties": {
                            "parties": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "role": {"type": "string"},
                                        "address": {"type": "string"},
                                        "entity_type": {"type": "string", "enum": ["individual", "corporation", "llc", "partnership", "other"]}
                                    }
                                },
                                "description": "Parties involved in the document"
                            },
                            "dates": {
                                "type": "object",
                                "properties": {
                                    "effective_date": {"type": "string"},
                                    "end_date": {"type": "string"},
                                    "duration": {"type": "string"}
                                },
                                "description": "Relevant dates and timeframes"
                            },
                            "terms": {
                                "type": "object",
                                "description": "Document-specific terms"
                            },
                            "additional_provisions": {
                                "type": "array",
                                "items": {"type": "string"},
                                "description": "Any additional clauses or provisions requested"
                            }
                        }
                    },
                    "missing_fields": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of required fields still needed from the user"
                    },
                    "ready_to_generate": {
                        "type": "boolean",
                        "description": "Whether all required information has been collected"
                    }
                },
                "required": ["document_type", "extracted_data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_document",
            "description": "Generate a complete legal document based on extracted information. Only call this when all required information has been collected and confirmed with the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "document_type": {
                        "type": "string",
                        "enum": ["nda", "employment_agreement", "board_resolution", "service_agreement", "consulting_agreement", "partnership_agreement"],
                        "description": "The type of legal document to generate"
                    },
                    "document_data": {
                        "type": "object",
                        "description": "All structured data for document generation",
                        "properties": {
                            "title": {"type": "string"},
                            "parties": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "name": {"type": "string"},
                                        "role": {"type": "string"},
                                        "address": {"type": "string"},
                                        "entity_type": {"type": "string"}
                                    }
                                }
                            },
                            "effective_date": {"type": "string"},
                            "terms": {"type": "object"},
                            "provisions": {"type": "array", "items": {"type": "string"}},
                            "jurisdiction": {"type": "string"}
                        }
                    },
                    "format": {
                        "type": "string",
                        "enum": ["formal", "simple"],
                        "description": "Document formatting style"
                    }
                },
                "required": ["document_type", "document_data"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "apply_edits",
            "description": "Apply edits to an existing document based on user request. Call this when the user wants to modify, add, or remove content from a generated document.",
            "parameters": {
                "type": "object",
                "properties": {
                    "edit_type": {
                        "type": "string",
                        "enum": ["modify", "add", "remove", "replace"],
                        "description": "The type of edit being made"
                    },
                    "target_section": {
                        "type": "string",
                        "description": "The section or clause being edited"
                    },
                    "original_value": {
                        "type": "string",
                        "description": "The current/original text or value being changed"
                    },
                    "new_value": {
                        "type": "string",
                        "description": "The new text or value to replace the original"
                    },
                    "reason": {
                        "type": "string",
                        "description": "Brief explanation of why this edit is being made"
                    },
                    "affected_clauses": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of other clauses that may be affected by this change"
                    }
                },
                "required": ["edit_type", "target_section", "new_value"]
            }
        }
    }
]


def get_template(document_type: str) -> str:
    templates = {
        "nda": "Non-Disclosure Agreement Template",
        "employment_agreement": "Employment Agreement Template",
        "board_resolution": "Board Resolution Template",
        "service_agreement": "Service Agreement Template",
        "consulting_agreement": "Consulting Agreement Template",
        "partnership_agreement": "Partnership Agreement Template"
    }
    return templates.get(document_type, "Legal Document Template")
