from datetime import datetime
from pydantic import BaseModel


class RoleCreate(BaseModel):
    role_name: str
    description: str | None = None


class RoleUpdate(BaseModel):
    role_name: str | None = None
    description: str | None = None


class RoleResponse(BaseModel):
    role_id: int
    role_name: str
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
