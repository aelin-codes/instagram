from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Follower
from .base_crud import CRUDBase


class FollowerCRUD(CRUDBase):
    model = Follower
    pk_field = Follower.follow_id

    @classmethod
    async def get_followers(cls, db: AsyncSession, user_id: int):
        result = await db.execute(select(Follower).where(Follower.following_id == user_id))
        return result.scalars().all()

    @classmethod
    async def get_following(cls, db: AsyncSession, user_id: int):
        result = await db.execute(select(Follower).where(Follower.follower_id == user_id))
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, follower_id: int, following_id: int):
        """Check for duplicate follow to return 409 instead of DB 500."""
        result = await db.execute(
            select(Follower).where(
                Follower.follower_id == follower_id,
                Follower.following_id == following_id,
            )
        )
        return result.scalar_one_or_none()
