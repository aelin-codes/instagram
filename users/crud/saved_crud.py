from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import SavedPost, SavedReel
from .base_crud import CRUDBase


class SavedPostCRUD(CRUDBase):
    model = SavedPost
    pk_field = SavedPost.saved_post_id

    @classmethod
    async def get_user_saved_posts(cls, db: AsyncSession, user_id: int):
        result = await db.execute(select(SavedPost).where(SavedPost.user_id == user_id))
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, user_id: int, post_id: int):
        """Check for duplicate save to return 409 instead of DB 500."""
        result = await db.execute(
            select(SavedPost).where(SavedPost.user_id == user_id, SavedPost.post_id == post_id)
        )
        return result.scalar_one_or_none()


class SavedReelCRUD(CRUDBase):
    model = SavedReel
    pk_field = SavedReel.saved_reel_id

    @classmethod
    async def get_user_saved_reels(cls, db: AsyncSession, user_id: int):
        result = await db.execute(select(SavedReel).where(SavedReel.user_id == user_id))
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, user_id: int, reel_id: int):
        """Check for duplicate save to return 409 instead of DB 500."""
        result = await db.execute(
            select(SavedReel).where(SavedReel.user_id == user_id, SavedReel.reel_id == reel_id)
        )
        return result.scalar_one_or_none()
