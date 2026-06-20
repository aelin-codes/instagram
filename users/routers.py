from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from settings.database import get_db

# ── Schemas ────────────────────────────────────────────────────────────
from users.schemas.user_schemas import UserCreate, UserUpdate, UserResponse
from users.schemas.username_schemas import UsernameCreate, UsernameUpdate, UsernameResponse
from users.schemas.bio_schemas import BioCreate, BioUpdate, BioResponse
from users.schemas.privacy_schemas import PrivacyCreate, PrivacyUpdate, PrivacyResponse
from users.schemas.post_schemas import (
    PostCreate, PostUpdate, PostResponse,
    PostLikeCreate, PostLikeResponse,
)
from users.schemas.reel_schemas import (
    ReelCreate, ReelUpdate, ReelResponse,
    ReelLikeCreate, ReelLikeResponse,
)
from users.schemas.comment_schemas import CommentCreate, CommentUpdate, CommentResponse
from users.schemas.follower_schemas import FollowerCreate, FollowerResponse
from users.schemas.saved_schemas import (
    SavedPostCreate, SavedPostResponse,
    SavedReelCreate, SavedReelResponse,
)

# ── CRUDs ──────────────────────────────────────────────────────────────
from users.crud.users_crud import UserCRUD
from users.crud.username_crud import UsernameCRUD
from users.crud.bio_crud import BioCRUD
from users.crud.privacy_crud import PrivacyCRUD
from users.crud.posts_crud import PostCRUD
from users.crud.reels_crud import ReelCRUD
from users.crud.comments_crud import CommentCRUD
from users.crud.followers_crud import FollowerCRUD
from users.crud.saved_crud import SavedPostCRUD, SavedReelCRUD
from users.crud.mongo_likes_crud import MongoPostLikeCRUD, MongoReelLikeCRUD
from settings.mongodb import get_mongo_db

user_router = APIRouter()


def _not_found(resource, name: str):
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{name} not found")
    return resource


#========USER ROUTES========#

@user_router.get("/users", response_model=list[UserResponse])
async def get_users(db: AsyncSession = Depends(get_db)):
    return await UserCRUD.get_all(db)


@user_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await UserCRUD.get_by_id(db, user_id)
    return _not_found(user, "User")


@user_router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await UserCRUD.get_by_email(db, user.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )
    return await UserCRUD.create(db, **user.model_dump())


@user_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user: UserUpdate, db: AsyncSession = Depends(get_db)):
    updated = await UserCRUD.update(db, user_id, **user.model_dump(exclude_unset=True))
    return _not_found(updated, "User")


@user_router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await UserCRUD.delete(db, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"deleted": True}


#========USERNAME ROUTES========#

@user_router.post("/usernames", response_model=UsernameResponse, status_code=status.HTTP_201_CREATED)
async def create_username(username: UsernameCreate, db: AsyncSession = Depends(get_db)):
    return await UsernameCRUD.create(db, **username.model_dump())


@user_router.get("/users/{user_id}/username", response_model=UsernameResponse)
async def get_current_username(user_id: int, db: AsyncSession = Depends(get_db)):
    username = await UsernameCRUD.get_current_username(db, user_id)
    return _not_found(username, "Username")


@user_router.put("/usernames/{username_id}", response_model=UsernameResponse)
async def update_username(username_id: int, username: UsernameUpdate, db: AsyncSession = Depends(get_db)):
    updated = await UsernameCRUD.update(db, username_id, **username.model_dump(exclude_unset=True))
    return _not_found(updated, "Username")


@user_router.delete("/usernames/{username_id}")
async def delete_username(username_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await UsernameCRUD.delete(db, username_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Username not found")
    return {"deleted": True}


#========BIO ROUTES========#

@user_router.post("/bios", response_model=BioResponse, status_code=status.HTTP_201_CREATED)
async def create_bio(bio: BioCreate, db: AsyncSession = Depends(get_db)):
    return await BioCRUD.create(db, **bio.model_dump())


@user_router.get("/users/{user_id}/bio", response_model=BioResponse)
async def get_current_bio(user_id: int, db: AsyncSession = Depends(get_db)):
    bio = await BioCRUD.get_current_bio(db, user_id)
    return _not_found(bio, "Bio")


@user_router.put("/bios/{bio_id}", response_model=BioResponse)
async def update_bio(bio_id: int, bio: BioUpdate, db: AsyncSession = Depends(get_db)):
    updated = await BioCRUD.update(db, bio_id, **bio.model_dump(exclude_unset=True))
    return _not_found(updated, "Bio")


@user_router.delete("/bios/{bio_id}")
async def delete_bio(bio_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await BioCRUD.delete(db, bio_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bio not found")
    return {"deleted": True}


#=========PRIVACY ROUTES========#

@user_router.post("/privacy", response_model=PrivacyResponse, status_code=status.HTTP_201_CREATED)
async def create_privacy(privacy: PrivacyCreate, db: AsyncSession = Depends(get_db)):
    return await PrivacyCRUD.create(db, **privacy.model_dump())


@user_router.get("/users/{user_id}/privacy", response_model=PrivacyResponse)
async def get_current_privacy(user_id: int, db: AsyncSession = Depends(get_db)):
    privacy = await PrivacyCRUD.get_current_privacy(db, user_id)
    return _not_found(privacy, "Privacy")


@user_router.put("/privacy/{priv_id}", response_model=PrivacyResponse)
async def update_privacy(priv_id: int, privacy: PrivacyUpdate, db: AsyncSession = Depends(get_db)):
    updated = await PrivacyCRUD.update(db, priv_id, **privacy.model_dump(exclude_unset=True))
    return _not_found(updated, "Privacy")


@user_router.delete("/privacy/{priv_id}")
async def delete_privacy(priv_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await PrivacyCRUD.delete(db, priv_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Privacy record not found")
    return {"deleted": True}


#========POST ROUTES========#

@user_router.get("/posts", response_model=list[PostResponse])
async def get_posts(db: AsyncSession = Depends(get_db)):
    return await PostCRUD.get_all(db)


@user_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: int, db: AsyncSession = Depends(get_db)):
    post = await PostCRUD.get_by_id(db, post_id)
    return _not_found(post, "Post")


@user_router.get("/users/{user_id}/posts", response_model=list[PostResponse])
async def get_user_posts(user_id: int, db: AsyncSession = Depends(get_db)):
    return await PostCRUD.get_user_posts(db, user_id)


@user_router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(post: PostCreate, db: AsyncSession = Depends(get_db)):
    return await PostCRUD.create(db, **post.model_dump())


@user_router.put("/posts/{post_id}", response_model=PostResponse)
async def update_post(post_id: int, post: PostUpdate, db: AsyncSession = Depends(get_db)):
    updated = await PostCRUD.update(db, post_id, **post.model_dump(exclude_unset=True))
    return _not_found(updated, "Post")


@user_router.delete("/posts/{post_id}")
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await PostCRUD.delete(db, post_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return {"deleted": True}


#========POST LIKE ROUTES (MongoDB)========#

@user_router.post("/post-likes", response_model=PostLikeResponse, status_code=status.HTTP_201_CREATED)
async def like_post(post_like: PostLikeCreate, mongo_db=Depends(get_mongo_db)):
    existing = await MongoPostLikeCRUD.get_existing(mongo_db, post_like.post_id, post_like.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User has already liked this post",
        )
    return await MongoPostLikeCRUD.create(mongo_db, post_like.post_id, post_like.user_id)


@user_router.get("/posts/{post_id}/likes", response_model=list[PostLikeResponse])
async def get_post_likes(post_id: int, mongo_db=Depends(get_mongo_db)):
    return await MongoPostLikeCRUD.get_post_likes(mongo_db, post_id)


@user_router.delete("/post-likes/{like_id}")
async def delete_post_like(like_id: str, mongo_db=Depends(get_mongo_db)):
    deleted = await MongoPostLikeCRUD.delete(mongo_db, like_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post like not found")
    return {"deleted": True}


#========REEL ROUTES========#

@user_router.get("/reels", response_model=list[ReelResponse])
async def get_reels(db: AsyncSession = Depends(get_db)):
    return await ReelCRUD.get_all(db)


@user_router.get("/reels/{reel_id}", response_model=ReelResponse)
async def get_reel(reel_id: int, db: AsyncSession = Depends(get_db)):
    reel = await ReelCRUD.get_by_id(db, reel_id)
    return _not_found(reel, "Reel")


@user_router.get("/users/{user_id}/reels", response_model=list[ReelResponse])
async def get_user_reels(user_id: int, db: AsyncSession = Depends(get_db)):
    return await ReelCRUD.get_user_reels(db, user_id)


@user_router.post("/reels", response_model=ReelResponse, status_code=status.HTTP_201_CREATED)
async def create_reel(reel: ReelCreate, db: AsyncSession = Depends(get_db)):
    return await ReelCRUD.create(db, **reel.model_dump())


@user_router.put("/reels/{reel_id}", response_model=ReelResponse)
async def update_reel(reel_id: int, reel: ReelUpdate, db: AsyncSession = Depends(get_db)):
    updated = await ReelCRUD.update(db, reel_id, **reel.model_dump(exclude_unset=True))
    return _not_found(updated, "Reel")


@user_router.delete("/reels/{reel_id}")
async def delete_reel(reel_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await ReelCRUD.delete(db, reel_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel not found")
    return {"deleted": True}


#========REEL LIKE ROUTES (MongoDB)========#

@user_router.post("/reel-likes", response_model=ReelLikeResponse, status_code=status.HTTP_201_CREATED)
async def like_reel(reel_like: ReelLikeCreate, mongo_db=Depends(get_mongo_db)):
    existing = await MongoReelLikeCRUD.get_existing(mongo_db, reel_like.reel_id, reel_like.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User has already liked this reel",
        )
    return await MongoReelLikeCRUD.create(mongo_db, reel_like.reel_id, reel_like.user_id)


@user_router.get("/reels/{reel_id}/likes", response_model=list[ReelLikeResponse])
async def get_reel_likes(reel_id: int, mongo_db=Depends(get_mongo_db)):
    return await MongoReelLikeCRUD.get_reel_likes(mongo_db, reel_id)


@user_router.delete("/reel-likes/{like_id}")
async def delete_reel_like(like_id: str, mongo_db=Depends(get_mongo_db)):
    deleted = await MongoReelLikeCRUD.delete(mongo_db, like_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reel like not found")
    return {"deleted": True}


#========FOLLOWER ROUTES========#

@user_router.post("/followers", response_model=FollowerResponse, status_code=status.HTTP_201_CREATED)
async def create_follower(follower: FollowerCreate, db: AsyncSession = Depends(get_db)):
    if follower.follower_id == follower.following_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user cannot follow themselves",
        )
    
    # 1. Verify follower user exists
    f_user = await UserCRUD.get_by_id(db, follower.follower_id)
    if not f_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follower user with ID {follower.follower_id} does not exist",
        )
        
    # 2. Verify following user exists
    fol_user = await UserCRUD.get_by_id(db, follower.following_id)
    if not fol_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Following user with ID {follower.following_id} does not exist",
        )

    existing = await FollowerCRUD.get_existing(db, follower.follower_id, follower.following_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already following this user",
        )
    return await FollowerCRUD.create(db, **follower.model_dump())


@user_router.get("/users/{user_id}/followers", response_model=list[FollowerResponse])
async def get_followers(user_id: int, db: AsyncSession = Depends(get_db)):
    return await FollowerCRUD.get_followers(db, user_id)


@user_router.get("/users/{user_id}/following", response_model=list[FollowerResponse])
async def get_following(user_id: int, db: AsyncSession = Depends(get_db)):
    return await FollowerCRUD.get_following(db, user_id)


@user_router.delete("/followers/{follow_id}")
async def delete_follower(follow_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await FollowerCRUD.delete(db, follow_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follower entry not found")
    return {"deleted": True}


#========SAVED POST ROUTES========#

@user_router.post("/saved-posts", response_model=SavedPostResponse, status_code=status.HTTP_201_CREATED)
async def save_post(saved_post: SavedPostCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify user exists
    user = await UserCRUD.get_by_id(db, saved_post.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {saved_post.user_id} does not exist",
        )

    # 2. Verify post exists
    post = await PostCRUD.get_by_id(db, saved_post.post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Post with ID {saved_post.post_id} does not exist",
        )

    existing = await SavedPostCRUD.get_existing(db, saved_post.user_id, saved_post.post_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Post already saved by this user",
        )
    return await SavedPostCRUD.create(db, **saved_post.model_dump())


@user_router.get("/users/{user_id}/saved-posts", response_model=list[SavedPostResponse])
async def get_user_saved_posts(user_id: int, db: AsyncSession = Depends(get_db)):
    return await SavedPostCRUD.get_user_saved_posts(db, user_id)


@user_router.delete("/saved-posts/{saved_post_id}")
async def delete_saved_post(saved_post_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await SavedPostCRUD.delete(db, saved_post_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved post not found")
    return {"deleted": True}


#========SAVED REEL ROUTES========#

@user_router.post("/saved-reels", response_model=SavedReelResponse, status_code=status.HTTP_201_CREATED)
async def save_reel(saved_reel: SavedReelCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify user exists
    user = await UserCRUD.get_by_id(db, saved_reel.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {saved_reel.user_id} does not exist",
        )

    # 2. Verify reel exists
    reel = await ReelCRUD.get_by_id(db, saved_reel.reel_id)
    if not reel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Reel with ID {saved_reel.reel_id} does not exist",
        )

    existing = await SavedReelCRUD.get_existing(db, saved_reel.user_id, saved_reel.reel_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Reel already saved by this user",
        )
    return await SavedReelCRUD.create(db, **saved_reel.model_dump())


@user_router.get("/users/{user_id}/saved-reels", response_model=list[SavedReelResponse])
async def get_user_saved_reels(user_id: int, db: AsyncSession = Depends(get_db)):
    return await SavedReelCRUD.get_user_saved_reels(db, user_id)


@user_router.delete("/saved-reels/{saved_reel_id}")
async def delete_saved_reel(saved_reel_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await SavedReelCRUD.delete(db, saved_reel_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved reel not found")
    return {"deleted": True}


#========COMMENT ROUTES========#

@user_router.post("/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(comment: CommentCreate, db: AsyncSession = Depends(get_db)):
    if not comment.post_id and not comment.reel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either post_id or reel_id must be provided",
        )
    if comment.post_id and comment.reel_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only one of post_id or reel_id can be provided, not both",
        )
    return await CommentCRUD.create(db, **comment.model_dump())


@user_router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
async def get_post_comments(post_id: int, db: AsyncSession = Depends(get_db)):
    return await CommentCRUD.get_post_comments(db, post_id)


@user_router.get("/reels/{reel_id}/comments", response_model=list[CommentResponse])
async def get_reel_comments(reel_id: int, db: AsyncSession = Depends(get_db)):
    return await CommentCRUD.get_reel_comments(db, reel_id)


@user_router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(comment_id: int, comment: CommentUpdate, db: AsyncSession = Depends(get_db)):
    updated = await CommentCRUD.update(db, comment_id, **comment.model_dump(exclude_unset=True))
    return _not_found(updated, "Comment")


@user_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await CommentCRUD.delete(db, comment_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return {"deleted": True}
