from datetime import datetime
from pydantic import BaseModel


class CommentCreate(BaseModel):
    user_id: int
    post_id: int | None = None
    reel_id: int | None = None
    text: str


class CommentUpdate(BaseModel):
    text: str  # required — empty update makes no sense


class CommentResponse(BaseModel):
    comment_id: int
    user_id: int
    post_id: int | None
    reel_id: int | None
    text: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
