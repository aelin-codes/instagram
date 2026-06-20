from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


def _serialize(doc: dict) -> dict:
    if doc is None:
        return None
    doc["like_id"] = str(doc.pop("_id"))
    return doc


# ── Post Likes ─────────────────────────────────────────────────────────

class MongoPostLikeCRUD:

    @staticmethod
    async def create(db: AsyncIOMotorDatabase, post_id: int, user_id: int) -> dict:
        doc = {
            "post_id": post_id,
            "user_id": user_id,
            "is_liked": True,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.post_likes.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _serialize(doc)

    @staticmethod
    async def get_post_likes(db: AsyncIOMotorDatabase, post_id: int) -> list[dict]:
        cursor = db.post_likes.find({"post_id": post_id})
        return [_serialize(doc) async for doc in cursor]

    @staticmethod
    async def get_existing(db: AsyncIOMotorDatabase, post_id: int, user_id: int) -> dict | None:
        doc = await db.post_likes.find_one({"post_id": post_id, "user_id": user_id})
        return _serialize(doc) if doc else None

    @staticmethod
    async def delete(db: AsyncIOMotorDatabase, like_id: str) -> bool:
        result = await db.post_likes.delete_one({"_id": ObjectId(like_id)})
        return result.deleted_count > 0


# ── Reel Likes ─────────────────────────────────────────────────────────

class MongoReelLikeCRUD:

    @staticmethod
    async def create(db: AsyncIOMotorDatabase, reel_id: int, user_id: int) -> dict:
        doc = {
            "reel_id": reel_id,
            "user_id": user_id,
            "is_liked": True,
            "created_at": datetime.now(timezone.utc),
        }
        result = await db.reel_likes.insert_one(doc)
        doc["_id"] = result.inserted_id
        return _serialize(doc)

    @staticmethod
    async def get_reel_likes(db: AsyncIOMotorDatabase, reel_id: int) -> list[dict]:
        cursor = db.reel_likes.find({"reel_id": reel_id})
        return [_serialize(doc) async for doc in cursor]

    @staticmethod
    async def get_existing(db: AsyncIOMotorDatabase, reel_id: int, user_id: int) -> dict | None:
        doc = await db.reel_likes.find_one({"reel_id": reel_id, "user_id": user_id})
        return _serialize(doc) if doc else None

    @staticmethod
    async def delete(db: AsyncIOMotorDatabase, like_id: str) -> bool:
        result = await db.reel_likes.delete_one({"_id": ObjectId(like_id)})
        return result.deleted_count > 0
