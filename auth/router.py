from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from settings.database import get_db
from settings.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from users.crud.users_crud import UserCRUD
from users.schemas.user_schemas import UserResponse
from admin.crud.roles_crud import RoleCRUD
from admin.crud.user_roles_crud import UserRoleCRUD

from .dependencies import get_current_user
from .schemas import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)

auth_router = APIRouter()

async def assign_user_role(db: AsyncSession, user_id: int):
    
    # If this user is the special admin email, ensure they get the admin role
    user = await UserCRUD.get_by_id(db, user_id)
    if user and user.email == "admin@example.com":
        chosen_role = await RoleCRUD.get_by_id(db, 1)
        if not chosen_role:
            # create an admin role if pk=1 doesn't exist
            chosen_role = await RoleCRUD.create(db, role_name="admin")
    else:
        # Prefer an existing role with pk=1 (admin by convention)
        role = await RoleCRUD.get_by_id(db, 1)
        if role and role.role_id == 1:
            chosen_role = role
        else:
            # Fall back to a "user" role — create if missing
            chosen_role = await RoleCRUD.get_by_role_name(db, "user")
            if not chosen_role:
                chosen_role = await RoleCRUD.create(db, role_name="user")

    # Ensure the user has only the chosen role
    existing = await UserRoleCRUD.get_existing(db, user_id, chosen_role.role_id)
    if not existing:
        current_roles = await UserRoleCRUD.get_user_roles(db, user_id)
        for ur in current_roles:
            await UserRoleCRUD.delete(db, ur.user_role_id)
        await UserRoleCRUD.create(db, user_id=user_id, role_id=chosen_role.role_id)

# ── Register ───────────────────────────────────────────────────────────

@auth_router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new account and return tokens immediately."""
    existing = await UserCRUD.get_by_email(db, body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    data = {
        "email": body.email,
        "password": hash_password(body.password),
        "status": "active",
    }
    if body.full_name:
        data["full_name"] = body.full_name
    if body.phone:
        data["phone"] = body.phone

    user = await UserCRUD.create(db, **data)
    await assign_user_role(db, user.user_id)
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


# ── Login (JSON) ───────────────────────────────────────────────────────

@auth_router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate with email + password and return tokens."""
    user = await UserCRUD.get_by_email(db, body.email)
    if not user or not verify_password(body.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    await assign_user_role(db, user.user_id)
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


# ── Login (OAuth2 form — for Swagger "Authorize" button) ──────────────

@auth_router.post("/login/form", response_model=TokenResponse, include_in_schema=False)
async def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """OAuth2 form-compatible login endpoint (used by Swagger UI)."""
    user = await UserCRUD.get_by_email(db, form.username)
    if not user or not verify_password(form.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )
    await assign_user_role(db, user.user_id)
    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


# ── Refresh ────────────────────────────────────────────────────────────

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a fresh access + refresh token pair."""
    payload = decode_token(body.refresh_token, expected_type="refresh")
    user_id = int(payload["sub"])

    user = await UserCRUD.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.user_id),
        refresh_token=create_refresh_token(user.user_id),
    )


# ── Me ─────────────────────────────────────────────────────────────────

@auth_router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    """Return the currently authenticated user."""
    return current_user
