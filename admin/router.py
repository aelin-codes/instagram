from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from settings.database import get_db
from admin.schemas.role_schemas import RoleCreate, RoleUpdate, RoleResponse
from admin.schemas.user_role_schemas import UserRoleCreate, UserRoleResponse
from admin.crud.roles_crud import RoleCRUD
from admin.crud.user_roles_crud import UserRoleCRUD
from users.crud.users_crud import UserCRUD

adminrouter = APIRouter()


def _not_found(resource, name: str):
    if not resource:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{name} not found")
    return resource


# ══════════════════════════════════════════════════════════════════════
#  ROLE ROUTES  —  prefix: /core
# ══════════════════════════════════════════════════════════════════════

@adminrouter.get("/roles", response_model=list[RoleResponse])
async def get_roles(db: AsyncSession = Depends(get_db)):
    return await RoleCRUD.get_all(db)


@adminrouter.get("/roles/{role_id}", response_model=RoleResponse)
async def get_role(role_id: int, db: AsyncSession = Depends(get_db)):
    role = await RoleCRUD.get_by_id(db, role_id)
    return _not_found(role, "Role")


@adminrouter.post("/roles", response_model=RoleResponse, status_code=status.HTTP_201_CREATED)
async def create_role(role: RoleCreate, db: AsyncSession = Depends(get_db)):
    existing = await RoleCRUD.get_by_role_name(db, role.role_name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Role '{role.role_name}' already exists",
        )
    return await RoleCRUD.create(db, **role.model_dump())


@adminrouter.put("/roles/{role_id}", response_model=RoleResponse)
async def update_role(role_id: int, role: RoleUpdate, db: AsyncSession = Depends(get_db)):
    updated = await RoleCRUD.update(db, role_id, **role.model_dump(exclude_unset=True))
    return _not_found(updated, "Role")


@adminrouter.delete("/roles/{role_id}")
async def delete_role(role_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await RoleCRUD.delete(db, role_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    return {"deleted": True}


# ══════════════════════════════════════════════════════════════════════
#  USER ROLE ROUTES  —  prefix: /core
# ══════════════════════════════════════════════════════════════════════

@adminrouter.post("/user-roles", response_model=UserRoleResponse, status_code=status.HTTP_201_CREATED)
async def assign_role(user_role: UserRoleCreate, db: AsyncSession = Depends(get_db)):
    # 1. Verify user exists
    user = await UserCRUD.get_by_id(db, user_role.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_role.user_id} does not exist",
        )

    # 2. Verify role exists
    role = await RoleCRUD.get_by_id(db, user_role.role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role with ID {user_role.role_id} does not exist",
        )

    # 3. Verify they don't already have this role assignment
    existing = await UserRoleCRUD.get_existing(db, user_role.user_id, user_role.role_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user already has this role",
        )
    return await UserRoleCRUD.create(db, **user_role.model_dump())


@adminrouter.get("/user-roles/{user_role_id}", response_model=UserRoleResponse)
async def get_user_role(user_role_id: int, db: AsyncSession = Depends(get_db)):
    user_role = await UserRoleCRUD.get_by_id(db, user_role_id)
    return _not_found(user_role, "UserRole")


@adminrouter.get("/users/{user_id}/roles", response_model=list[UserRoleResponse])
async def get_user_roles(user_id: int, db: AsyncSession = Depends(get_db)):
    return await UserRoleCRUD.get_user_roles(db, user_id)


@adminrouter.delete("/user-roles/{user_role_id}")
async def delete_user_role(user_role_id: int, db: AsyncSession = Depends(get_db)):
    deleted = await UserRoleCRUD.delete(db, user_role_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User role not found")
    return {"deleted": True}
