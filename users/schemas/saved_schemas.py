from datetime import datetime
from pydantic import BaseModel


class SavedPostCreate(BaseModel):
    user_id: int
    post_id: int


class SavedPostResponse(BaseModel):
    saved_post_id: int
    user_id: int
    post_id: int
    saved_at: datetime
    is_saved: bool

    model_config = {"from_attributes": True}


class SavedReelCreate(BaseModel):
    user_id: int
    reel_id: int


class SavedReelResponse(BaseModel):
    saved_reel_id: int
    user_id: int
    reel_id: int
    saved_at: datetime
    is_saved: bool

    model_config = {"from_attributes": True}
