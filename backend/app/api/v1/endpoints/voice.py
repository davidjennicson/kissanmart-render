from fastapi import APIRouter, Depends, UploadFile, File, Form, status
from pydantic import BaseModel, ConfigDict
from typing import Optional
from sqlalchemy.orm import Session

from app.api.deps import SessionDep
from app.services import gemma_agent

router = APIRouter(prefix="/voice", tags=["Gemma AI Call Agent"])


class VoiceQueryRequest(BaseModel):
    query: str
    language: str = "mr"  # "mr", "en", "hi"
    farmer_id: int = 1


class VoiceQueryResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    query: str
    response_text: str
    category: str
    allowed: bool
    model_used: str
    context: Optional[dict] = None


@router.post("/query", response_model=VoiceQueryResponse)
async def query_call_agent(payload: VoiceQueryRequest, db: SessionDep):
    """Query the Gemma AI Call Agent with conversational agricultural speech."""
    result = await gemma_agent.query_gemma_call_agent(
        query=payload.query,
        language=payload.language,
        farmer_id=payload.farmer_id,
        db=db,
    )
    return VoiceQueryResponse(
        query=result["query"],
        response_text=result["response_text"],
        category=result["category"],
        allowed=result["allowed"],
        model_used=result["model_used"],
        context=result.get("context"),
    )


@router.post("/call-stream")
async def stream_audio_call(
    db: SessionDep,
    audio_file: UploadFile = File(...),
    language: str = Form("mr"),
    query_text: Optional[str] = Form(None),
):
    """Receive client microphone audio stream, process voice input, and return AI spoken response."""
    # Read audio bytes (used for server-side logging/streaming)
    audio_bytes = await audio_file.read()

    # If query text was passed along from client-side streaming speech recognition
    spoken_prompt = query_text or "What is today's crop price and rainfall forecast?"

    result = await gemma_agent.query_gemma_call_agent(
        query=spoken_prompt,
        language=language,
        farmer_id=1,
        db=db,
    )

    return {
        "status": "success",
        "audio_bytes_received": len(audio_bytes),
        "content_type": audio_file.content_type,
        "query": spoken_prompt,
        "response_text": result["response_text"],
        "category": result["category"],
        "allowed": result["allowed"],
        "model_used": result["model_used"],
    }


@router.get("/context")
def get_agri_context(db: SessionDep):
    """Get live grounded context about crop prices, farm Gat 142, rainfall alerts, and bids."""
    return gemma_agent.get_live_agri_context(db, farmer_id=1)
