from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Privacy
from .base_crud import CRUDBase


class PrivacyCRUD(CRUDBase):
    model = Privacy
    pk_field = Privacy.priv_id

    @classmethod
    async def get_current_privacy(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Privacy)
            .where(Privacy.user_id == user_id, Privacy.current.is_(True))
            .order_by(Privacy.changed_at.desc())
        )
        return result.scalars().first()
