from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models import User
from .base_crud import CRUDBase


class UserCRUD(CRUDBase):
    model = User
    pk_field = User.user_id

    @classmethod
    async def get_by_email(cls, db: AsyncSession, email: str):
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    @classmethod
    async def get_by_phone(cls, db: AsyncSession, phone: str):
        result = await db.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    @classmethod
    async def search_users(cls, db: AsyncSession, query: str):
        """Case-insensitive search on email and full_name."""
        like = f"%{query}%"
        result = await db.execute(
            select(User).where(
                or_(
                    User.email.ilike(like),
                    User.full_name.ilike(like),
                )
            )
        )
        return result.scalars().all()

    @classmethod
    async def delete(cls, db: AsyncSession, pk: int):
        """
        ORM-level delete — relies on cascade="all, delete-orphan" defined
        on User relationships and ondelete="CASCADE" on all FK columns.
        No manual child deletion needed.
        """
        user = await cls.get_by_id(db, pk)
        if not user:
            return False
        await db.delete(user)
        await db.commit()
        return True
