from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Reel, ReelLike
from .base_crud import CRUDBase


class ReelCRUD(CRUDBase):
    model = Reel
    pk_field = Reel.reel_id

    @classmethod
    async def get_user_reels(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Reel).where(Reel.user_id == user_id).order_by(Reel.created_at.desc())
        )
        return result.scalars().all()


class ReelLikeCRUD(CRUDBase):
    model = ReelLike
    pk_field = ReelLike.like_id

    @classmethod
    async def get_reel_likes(cls, db: AsyncSession, reel_id: int):
        result = await db.execute(select(ReelLike).where(ReelLike.reel_id == reel_id))
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, reel_id: int, user_id: int):
        """Check for duplicate like to return 409 instead of DB 500."""
        result = await db.execute(
            select(ReelLike).where(ReelLike.reel_id == reel_id, ReelLike.user_id == user_id)
        )
        return result.scalar_one_or_none()
