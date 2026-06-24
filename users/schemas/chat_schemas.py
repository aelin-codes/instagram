from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, model_validator
from users.schemas.user_schemas import UserResponse

class ChatResponse(BaseModel):
    id: int
    name: Optional[str] = None
    is_group: bool
    avatar_url: Optional[str] = None
    members: List[UserResponse] = []

    model_config = {"from_attributes": True}

class SharedPostResponse(BaseModel):
    post_id: int
    user_id: int
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    type: str = "post"
    creator: Optional[UserResponse] = None

    model_config = {"from_attributes": True}

class MessageResponse(BaseModel):
    id: int
    chat_id: int
    sender_id: int
    content: Optional[str] = None
    shared_post_id: Optional[int] = None
    created_at: datetime
    sender: UserResponse
    shared_post: Optional[SharedPostResponse] = None

    model_config = {"from_attributes": True}

    @model_validator(mode='before')
    @classmethod
    def map_shared_content(cls, data):
        if isinstance(data, dict):
            return data
            
        # Check if we have shared_reel on db object
        if hasattr(data, "shared_reel") and data.shared_reel:
            reel = data.shared_reel
            creator = None
            if hasattr(reel, "user") and reel.user:
                u = reel.user
                creator = {
                    "user_id": u.user_id,
                    "email": u.email,
                    "phone": u.phone,
                    "full_name": u.full_name,
                    "profile_pic": u.profile_pic,
                    "avatar_url": u.avatar_url,
                    "status": u.status,
                    "created_at": u.created_at
                }
            
            return {
                "id": data.id,
                "chat_id": data.chat_id,
                "sender_id": data.sender_id,
                "content": data.content,
                "created_at": data.created_at,
                "sender": data.sender,
                "shared_post_id": reel.reel_id,
                "shared_post": {
                    "post_id": reel.reel_id,
                    "user_id": reel.user_id,
                    "image_url": reel.video_url, # Fallback URL
                    "thumbnail_url": reel.video_url,
                    "caption": reel.caption,
                    "type": "reel",
                    "creator": creator
                }
            }
            
        # Check if we have shared_post on db object
        elif hasattr(data, "shared_post") and data.shared_post:
            post = data.shared_post
            creator = None
            if hasattr(post, "creator") and post.creator:
                u = post.creator
                creator = {
                    "user_id": u.user_id,
                    "email": u.email,
                    "phone": u.phone,
                    "full_name": u.full_name,
                    "profile_pic": u.profile_pic,
                    "avatar_url": u.avatar_url,
                    "status": u.status,
                    "created_at": u.created_at
                }
            
            return {
                "id": data.id,
                "chat_id": data.chat_id,
                "sender_id": data.sender_id,
                "content": data.content,
                "created_at": data.created_at,
                "sender": data.sender,
                "shared_post_id": post.post_id,
                "shared_post": {
                    "post_id": post.post_id,
                    "user_id": post.user_id,
                    "image_url": post.image_url,
                    "thumbnail_url": post.thumbnail_url,
                    "caption": post.caption,
                    "type": "post",
                    "creator": creator
                }
            }
            
        return data

class MessageCreate(BaseModel):
    content: str

class ShareRequest(BaseModel):
    content_type: str  # "post" or "reel"
    content_id: int
    chat_ids: List[int]
