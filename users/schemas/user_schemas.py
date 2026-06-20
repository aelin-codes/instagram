from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    password: str
    status: str | None = None
    email: EmailStr
    phone: str | None = None
    full_name: str | None = None
    profile_pic: str | None = None


class UserUpdate(BaseModel):
    password: str | None = None
    status: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    full_name: str | None = None
    profile_pic: str | None = None


class UserResponse(BaseModel):
    user_id: int
    status: str | None
    email: EmailStr | None
    phone: str | None
    full_name: str | None
    profile_pic: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
