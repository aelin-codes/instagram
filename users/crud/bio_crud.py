from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Bio
from .base_crud import CRUDBase


class BioCRUD(CRUDBase):
    model = Bio
    pk_field = Bio.bio_id

    @classmethod
    async def get_current_bio(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Bio)
            .where(Bio.user_id == user_id, Bio.current.is_(True))
            .order_by(Bio.created_at.desc())
        )
        return result.scalars().first()
