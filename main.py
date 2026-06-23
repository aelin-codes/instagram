import os
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from admin.router import adminrouter
from auth.router import auth_router
from users.routers import user_router

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend")

# Ensure upload and frontend directories exist before they are mounted
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "posts"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "reels"), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_DIR, "profiles"), exist_ok=True)
os.makedirs(FRONTEND_DIR, exist_ok=True)

from settings.mongodb import ensure_indexes


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(
    title="Instagram Backend",
    description="Instagram Clone API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes → /auth/login, /auth/register, /auth/refresh, /auth/me
app.include_router(auth_router, prefix="/auth", tags=["Auth"])

# Admin routes → /core/roles, /core/user-roles, /core/users/{id}/roles
app.include_router(adminrouter, prefix="/core", tags=["Admin"])

# User routes → /user/users, /user/posts, /user/reels, etc.
app.include_router(user_router, prefix="/user", tags=["Users"])


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Accept a file upload and return the local URL."""
    ext = os.path.splitext(file.filename or "file")[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = os.path.join(UPLOAD_DIR, "posts", unique_name)
    content = await file.read()
    with open(dest, "wb") as f:
        f.write(content)
    return {"url": f"/uploads/posts/{unique_name}"}


# Serve uploaded media files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Serve frontend static files (must be last mount so it doesn't shadow API)
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")

