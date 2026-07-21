from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import verify_token

router = APIRouter()


class SummarizeRequest(BaseModel):
    text: str = Field(..., max_length=50_000, description="Text to summarize")
    max_length: int = Field(default=200, ge=50, le=2_000, description="Target word count")


class SummarizeResponse(BaseModel):
    summary: str


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(
    request: SummarizeRequest, user_id: str = Depends(verify_token)
) -> SummarizeResponse:
    """Summarize a block of text."""
    return SummarizeResponse(summary=f"Summary ({len(request.text)} chars): placeholder")
