from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Username
from .base_crud import CRUDBase


class UsernameCRUD(CRUDBase):
    model = Username
    pk_field = Username.user_name_id

    @classmethod
    async def get_current_username(cls, db: AsyncSession, user_id: int):
        result = await db.execute(
            select(Username)
            .where(Username.user_id == user_id, Username.current.is_(True))
            .order_by(Username.changed_at.desc())
        )
        return result.scalars().first()
