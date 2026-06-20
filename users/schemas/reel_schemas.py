from datetime import datetime
from pydantic import BaseModel


class ReelCreate(BaseModel):
    user_id: int
    video_url: str
    caption: str | None = None
    status: str | None = None


class ReelUpdate(BaseModel):
    video_url: str | None = None
    caption: str | None = None
    status: str | None = None


class ReelResponse(BaseModel):
    reel_id: int
    user_id: int
    video_url: str | None
    caption: str | None
    status: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ReelLikeCreate(BaseModel):
    reel_id: int
    user_id: int


class ReelLikeResponse(BaseModel):
    like_id: int
    reel_id: int
    user_id: int
    created_at: datetime
    is_liked: bool

    model_config = {"from_attributes": True}
