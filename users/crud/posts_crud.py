from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Post, PostLike
from .base_crud import CRUDBase


class PostCRUD(CRUDBase):
    model = Post
    pk_field = Post.post_id

    @classmethod
    async def get_user_posts(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
        )
        return result.scalars().all()


class PostLikeCRUD(CRUDBase):
    model = PostLike
    pk_field = PostLike.like_id

    @classmethod
    async def get_post_likes(cls, db: AsyncSession, post_id: int):
        result = await db.execute(select(PostLike).where(PostLike.post_id == post_id))
        return result.scalars().all()

    @classmethod
    async def get_existing(cls, db: AsyncSession, post_id: int, user_id: int):
        """Check for duplicate like to return 409 instead of DB 500."""
        result = await db.execute(
            select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user_id)
        )
        return result.scalar_one_or_none()
