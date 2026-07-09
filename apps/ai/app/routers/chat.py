from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import verify_token

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    context: dict | None = None

class ChatResponse(BaseModel):
    reply: str
    model: str

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, user_id: str = Depends(verify_token)):
    return ChatResponse(reply=f"Received: {request.message}", model="placeholder")
