from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import verify_token

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., max_length=10_000, description="User message")
    context: dict | None = Field(default=None, description="Optional conversation context")


class ChatResponse(BaseModel):
    reply: str
    model: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(verify_token)) -> ChatResponse:
    """Send a message and receive an AI-generated reply."""
    return ChatResponse(reply=f"Received: {request.message}", model="placeholder")
