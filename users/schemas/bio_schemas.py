from datetime import datetime
from pydantic import BaseModel


class BioCreate(BaseModel):
    user_id: int
    b_txt: str | None = None


class BioUpdate(BaseModel):
    b_txt: str | None = None
    current: bool | None = None


class BioResponse(BaseModel):
    bio_id: int
    user_id: int
    b_txt: str | None
    created_at: datetime
    current: bool

    model_config = {"from_attributes": True}
