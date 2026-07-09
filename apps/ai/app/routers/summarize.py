from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.security import verify_token

router = APIRouter()

class SummarizeRequest(BaseModel):
    text: str
    max_length: int = 200

class SummarizeResponse(BaseModel):
    summary: str

@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(request: SummarizeRequest, user_id: str = Depends(verify_token)):
    return SummarizeResponse(summary=f"Summary ({len(request.text)} chars): placeholder")
