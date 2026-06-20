from datetime import datetime
from pydantic import BaseModel


class PostCreate(BaseModel):
    user_id: int
    image_url: str | None = None
    caption: str | None = None
    status: str | None = None


class PostUpdate(BaseModel):
    image_url: str | None = None
    caption: str | None = None
    status: str | None = None


class PostResponse(BaseModel):
    post_id: int
    user_id: int
    image_url: str | None
    caption: str | None
    status: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PostLikeCreate(BaseModel):
    post_id: int
    user_id: int


class PostLikeResponse(BaseModel):
    like_id: int
    post_id: int
    user_id: int
    created_at: datetime
    is_liked: bool

    model_config = {"from_attributes": True}
