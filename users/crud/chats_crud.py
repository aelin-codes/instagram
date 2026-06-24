from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from models import Chat, ChatMember, Message, User, Post, Reel
from .base_crud import CRUDBase


class ChatCRUD(CRUDBase):
    model = Chat
    pk_field = Chat.id

    @classmethod
    async def get_chats_by_ids(cls, db: AsyncSession, chat_ids: List[int]) -> List[Chat]:
        """Retrieve chats matching a list of chat IDs."""
        result = await db.execute(select(Chat).where(Chat.id.in_(chat_ids)))
        return result.scalars().all()


class ChatMemberCRUD(CRUDBase):
    model = ChatMember
    pk_field = ChatMember.id

    @classmethod
    async def get_chat_membership(cls, db: AsyncSession, chat_id: int, user_id: int) -> Optional[ChatMember]:
        """Retrieve a specific chat membership mapping."""
        result = await db.execute(
            select(ChatMember).where(
                ChatMember.chat_id == chat_id,
                ChatMember.user_id == user_id
            )
        )
        return result.scalar_one_or_none()

    @classmethod
    async def get_user_memberships(cls, db: AsyncSession, user_id: int) -> List[ChatMember]:
        """Retrieve all chat memberships for a specific user ID."""
        result = await db.execute(select(ChatMember).where(ChatMember.user_id == user_id))
        return result.scalars().all()

    @classmethod
    async def get_chat_members(cls, db: AsyncSession, chat_id: int) -> List[User]:
        """Retrieve all users belonging to a chat."""
        result = await db.execute(
            select(User).join(ChatMember).where(ChatMember.chat_id == chat_id)
        )
        return result.scalars().all()


class MessageCRUD(CRUDBase):
    model = Message
    pk_field = Message.id

    @classmethod
    async def get_messages_by_chat_id(cls, db: AsyncSession, chat_id: int) -> List[Message]:
        """Retrieve messages for a chat, preloading sender, shared post and shared reel relationships."""
        result = await db.execute(
            select(Message)
            .options(
                joinedload(Message.sender),
                joinedload(Message.shared_post).joinedload(Post.creator),
                joinedload(Message.shared_reel).joinedload(Reel.user)
            )
            .where(Message.chat_id == chat_id)
            .order_by(Message.created_at.asc())
        )
        return result.scalars().all()

    @classmethod
    async def create_message(
        cls,
        db: AsyncSession,
        chat_id: int,
        sender_id: int,
        content: Optional[str] = None,
        shared_post_id: Optional[int] = None,
        shared_reel_id: Optional[int] = None,
        commit: bool = True
    ) -> Message:
        """Create a new message with option to defer transaction commit."""
        db_message = Message(
            chat_id=chat_id,
            sender_id=sender_id,
            content=content,
            shared_post_id=shared_post_id,
            shared_reel_id=shared_reel_id
        )
        db.add(db_message)
        if commit:
            await db.commit()
            await db.refresh(db_message)
        return db_message
