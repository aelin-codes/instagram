from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from settings.database import get_db
from settings.security import decode_token
from users.crud.users_crud import UserCRUD

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login/form")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
):
    payload = decode_token(token, expected_type="access")
    user_id = int(payload["sub"])

    user = await UserCRUD.get_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
