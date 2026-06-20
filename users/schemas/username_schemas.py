from datetime import datetime
from pydantic import BaseModel


class UsernameCreate(BaseModel):
    user_id: int
    username: str


class UsernameUpdate(BaseModel):
    # user_id intentionally excluded to prevent ownership changes
    username: str


class UsernameResponse(BaseModel):
    user_name_id: int
    user_id: int
    username: str
    changed_at: datetime
    current: bool

    model_config = {"from_attributes": True}
