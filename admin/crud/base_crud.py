from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class CRUDBase:
    """Generic async CRUD — subclasses must set `model` and `pk_field`."""

    model = None
    pk_field = None

    @classmethod
    async def create(cls, db: AsyncSession, **kwargs):
        obj = cls.model(**kwargs)
        db.add(obj)
        await db.commit()
        await db.refresh(obj)
        return obj

    @classmethod
    async def get_by_id(cls, db: AsyncSession, pk):
        result = await db.execute(select(cls.model).where(cls.pk_field == pk))
        return result.scalar_one_or_none()

    @classmethod
    async def get_all(cls, db: AsyncSession):
        result = await db.execute(select(cls.model))
        return result.scalars().all()

    @classmethod
    async def update(cls, db: AsyncSession, pk, **kwargs):
        obj = await cls.get_by_id(db, pk)
        if not obj:
            return None
        for key, value in kwargs.items():
            setattr(obj, key, value)
        await db.commit()
        await db.refresh(obj)
        return obj

    @classmethod
    async def delete(cls, db: AsyncSession, pk):
        obj = await cls.get_by_id(db, pk)
        if not obj:
            return False
        await db.delete(obj)
        await db.commit()
        return True
