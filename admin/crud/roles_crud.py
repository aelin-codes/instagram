from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Role
from .base_crud import CRUDBase


class RoleCRUD(CRUDBase):
    model = Role
    pk_field = Role.role_id

    @classmethod
    async def get_by_role_name(cls, db: AsyncSession, role_name: str):
        result = await db.execute(select(Role).where(Role.role_name == role_name))
        return result.scalar_one_or_none()
