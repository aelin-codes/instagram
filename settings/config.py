import os
from dotenv import load_dotenv

# Load .env from the project root (two levels up from this file)
_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(dotenv_path=_env_path)

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:database123@localhost:5432/instagram_db",
)

# ── JWT ───────────────────────────────────────────────────────────────
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "changeme-insecure-default")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
