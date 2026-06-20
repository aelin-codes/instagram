from pydantic import BaseModel


class UserRoleCreate(BaseModel):
    user_id: int
    role_id: int


class UserRoleResponse(BaseModel):
    user_role_id: int
    user_id: int
    role_id: int

    model_config = {"from_attributes": True}
