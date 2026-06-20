from datetime import datetime
from pydantic import BaseModel


class PrivacyCreate(BaseModel):
    user_id: int
    priv_status: str


class PrivacyUpdate(BaseModel):
    priv_status: str | None = None
    current: bool | None = None


class PrivacyResponse(BaseModel):
    priv_id: int
    user_id: int
    priv_status: str | None
    changed_at: datetime
    current: bool

    model_config = {"from_attributes": True}
