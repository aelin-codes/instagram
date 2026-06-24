from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    CheckConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship


def _utcnow():
    """Return timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


# ── Roles ──────────────────────────────────────────────────────────────

class Role(Base):
    __tablename__ = "roles"

    role_id = Column(Integer, primary_key=True, autoincrement=True)
    role_name = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    users = relationship("UserRole", back_populates="role", cascade="all, delete-orphan")


# ── Users ──────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "user"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    status = Column(String(50))
    email = Column(String(255), unique=True)
    phone = Column(String(20))
    full_name = Column(String(255))
    profile_pic = Column(String(500))
    avatar_url = Column(String, nullable=True)

    memberships = relationship("ChatMember", back_populates="user")
    messages = relationship("Message", back_populates="sender")
    roles = relationship("UserRole", back_populates="user", cascade="all, delete-orphan")
    bios = relationship("Bio", back_populates="user", cascade="all, delete-orphan")
    usernames = relationship("Username", back_populates="user", cascade="all, delete-orphan")
    privacies = relationship("Privacy", back_populates="user", cascade="all, delete-orphan")
    posts = relationship("Post", back_populates="creator", cascade="all, delete-orphan")
    reels = relationship("Reel", back_populates="user", cascade="all, delete-orphan")
    saved_posts = relationship("SavedPost", back_populates="user", cascade="all, delete-orphan")
    saved_reels = relationship("SavedReel", back_populates="user", cascade="all, delete-orphan")
    post_likes = relationship("PostLike", back_populates="user", cascade="all, delete-orphan")
    reel_likes = relationship("ReelLike", back_populates="user", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    following = relationship(
        "Follower",
        foreign_keys="Follower.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    followers = relationship(
        "Follower",
        foreign_keys="Follower.following_id",
        back_populates="following",
        cascade="all, delete-orphan",
    )


# ── UserRole ───────────────────────────────────────────────────────────

class UserRole(Base):
    __tablename__ = "user_role"

    __table_args__ = (UniqueConstraint("user_id", "role_id"),)

    user_role_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.role_id", ondelete="CASCADE"), nullable=False)

    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


# ── Username ───────────────────────────────────────────────────────────

class Username(Base):
    __tablename__ = "username"

    user_name_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    username = Column(String(100), unique=True)
    changed_at = Column(DateTime(timezone=True), default=_utcnow)
    current = Column(Boolean, default=True)

    user = relationship("User", back_populates="usernames")


# ── Bio ────────────────────────────────────────────────────────────────

class Bio(Base):
    __tablename__ = "bio"

    bio_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    b_txt = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    current = Column(Boolean, default=True)

    user = relationship("User", back_populates="bios")


# ── Post ───────────────────────────────────────────────────────────────

class Post(Base):
    __tablename__ = "posts"

    post_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    image_url = Column(String, nullable=False)
    caption = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    status = Column(String(50), default="active")
    type = Column(String, nullable=False, default="post")  # "post" or "reel"
    thumbnail_url = Column(String, nullable=True)  # Cover image for reels
    likes_count = Column(Integer, default=0)

    creator = relationship("User", back_populates="posts")
    shared_messages = relationship("Message", back_populates="shared_post")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")
    saved_by = relationship("SavedPost", back_populates="post", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")


# ── PostLike ───────────────────────────────────────────────────────────

class PostLike(Base):
    __tablename__ = "post_likes"

    __table_args__ = (UniqueConstraint("post_id", "user_id"),)

    like_id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    is_liked = Column(Boolean, default=True)

    post = relationship("Post", back_populates="likes")
    user = relationship("User", back_populates="post_likes")


# ── Reel ───────────────────────────────────────────────────────────────

class Reel(Base):
    __tablename__ = "reels"

    reel_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    video_url = Column(String(500))
    caption = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    status = Column(String(50), default="active")

    user = relationship("User", back_populates="reels")
    likes = relationship("ReelLike", back_populates="reel", cascade="all, delete-orphan")
    saved_by = relationship("SavedReel", back_populates="reel", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="reel", cascade="all, delete-orphan")


# ── ReelLike ───────────────────────────────────────────────────────────

class ReelLike(Base):
    __tablename__ = "reel_likes"

    __table_args__ = (UniqueConstraint("reel_id", "user_id"),)

    like_id = Column(Integer, primary_key=True, autoincrement=True)
    reel_id = Column(Integer, ForeignKey("reels.reel_id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    is_liked = Column(Boolean, default=True)

    reel = relationship("Reel", back_populates="likes")
    user = relationship("User", back_populates="reel_likes")


# ── Follower ───────────────────────────────────────────────────────────

class Follower(Base):
    __tablename__ = "followers"

    __table_args__ = (UniqueConstraint("follower_id", "following_id"),)

    follow_id = Column(Integer, primary_key=True, autoincrement=True)
    follower_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    following_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")


# ── Privacy ────────────────────────────────────────────────────────────

class Privacy(Base):
    __tablename__ = "privacy"

    priv_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    priv_status = Column(String(50))
    changed_at = Column(DateTime(timezone=True), default=_utcnow)
    current = Column(Boolean, default=True)

    user = relationship("User", back_populates="privacies")


# ── SavedPost ──────────────────────────────────────────────────────────

class SavedPost(Base):
    __tablename__ = "saved_posts"

    __table_args__ = (UniqueConstraint("user_id", "post_id"),)

    saved_post_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime(timezone=True), default=_utcnow)
    is_saved = Column(Boolean, default=True)

    user = relationship("User", back_populates="saved_posts")
    post = relationship("Post", back_populates="saved_by")


# ── SavedReel ──────────────────────────────────────────────────────────

class SavedReel(Base):
    __tablename__ = "saved_reels"

    __table_args__ = (UniqueConstraint("user_id", "reel_id"),)

    saved_reel_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    reel_id = Column(Integer, ForeignKey("reels.reel_id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime(timezone=True), default=_utcnow)
    is_saved = Column(Boolean, default=True)

    user = relationship("User", back_populates="saved_reels")
    reel = relationship("Reel", back_populates="saved_by")


# ── Comment ────────────────────────────────────────────────────────────

class Comment(Base):
    """A comment on either a Post or a Reel (mutually exclusive)."""

    __tablename__ = "comments"

    __table_args__ = (
        CheckConstraint(
            "(post_id IS NOT NULL AND reel_id IS NULL) OR "
            "(post_id IS NULL AND reel_id IS NOT NULL)",
            name="ck_comment_post_or_reel",
        ),
    )

    comment_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="CASCADE"), nullable=True)
    reel_id = Column(Integer, ForeignKey("reels.reel_id", ondelete="CASCADE"), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    user = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    reel = relationship("Reel", back_populates="comments")

# ── Chat ────────────────────────────────────────────────────────────

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)  # Group name (null for DMs)
    is_group = Column(Boolean, default=False)
    avatar_url = Column(String, nullable=True)  # Group avatar or generic icon

    # Relationships
    members = relationship("ChatMember", back_populates="chat", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")

# ── Chat Member ────────────────────────────────────────────────────────────

class ChatMember(Base):
    __tablename__ = "chat_members"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)

    # Relationships
    chat = relationship("Chat", back_populates="members")
    user = relationship("User", back_populates="memberships")

# ── Messages ────────────────────────────────────────────────────────────

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    chat_id = Column(Integer, ForeignKey("chats.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("user.user_id", ondelete="CASCADE"), nullable=False)
    content = Column(String, nullable=True)  # Message text
    shared_post_id = Column(Integer, ForeignKey("posts.post_id", ondelete="SET NULL"), nullable=True)  # Shared post
    shared_reel_id = Column(Integer, ForeignKey("reels.reel_id", ondelete="SET NULL"), nullable=True)  # Shared reel
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    chat = relationship("Chat", back_populates="messages")
    sender = relationship("User", back_populates="messages")
    shared_post = relationship("Post", back_populates="shared_messages")
    shared_reel = relationship("Reel")

