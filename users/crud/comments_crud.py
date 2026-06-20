from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Comment
from .base_crud import CRUDBase


class CommentCRUD(CRUDBase):
    model = Comment
    pk_field = Comment.comment_id

    @classmethod
    async def get_post_comments(cls, db: AsyncSession, post_id: int):
        result = await db.execute(
            select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at.asc())
        )
        return result.scalars().all()

    @classmethod
    async def get_reel_comments(cls, db: AsyncSession, reel_id: int):
        result = await db.execute(
            select(Comment).where(Comment.reel_id == reel_id).order_by(Comment.created_at.asc())
        )
        return result.scalars().all()
