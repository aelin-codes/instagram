import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL: str = os.getenv("MONGO_URL", "mongodb://localhost:27017")
MONGO_DB_NAME: str = os.getenv("MONGO_DB_NAME", "instagram_likes_db")

_client: AsyncIOMotorClient | None = None


def get_mongo_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=2000)
    return _client


def get_mongo_db():
    return get_mongo_client()[MONGO_DB_NAME]


async def ensure_indexes():
    db = get_mongo_db()
    await db.post_likes.create_index(
        [("post_id", 1), ("user_id", 1)], unique=True
    )
    await db.reel_likes.create_index(
        [("reel_id", 1), ("user_id", 1)], unique=True
    )
