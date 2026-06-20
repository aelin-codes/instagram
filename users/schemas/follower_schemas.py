from datetime import datetime
from pydantic import BaseModel


class FollowerCreate(BaseModel):
    follower_id: int
    following_id: int


class FollowerResponse(BaseModel):
    follow_id: int
    follower_id: int
    following_id: int
    created_at: datetime

    model_config = {"from_attributes": True}
