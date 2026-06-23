from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from models import UserRole
from .base_crud import CRUDBase


class UserRoleCRUD(CRUDBase):
    model = UserRole
    pk_field = UserRole.user_role_id

    @classmethod
    async def get_user_roles(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(UserRole)
            .options(joinedload(UserRole.role))
            .where(UserRole.user_id == user_id)
        )
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, user_id: int, role_id: int):
        """Check if a user-role mapping already exists (to avoid duplicate 500s)."""
        result = await db.execute(
            select(UserRole).where(
                UserRole.user_id == user_id,
                UserRole.role_id == role_id,
            )
        )
        return result.scalar_one_or_none()
