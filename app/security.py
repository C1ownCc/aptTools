import os
from fastapi import Header, HTTPException, status, Depends

API_KEY = os.getenv("APP_API_KEY", "devkey123")
API_KEY_HEADER = "X-API-Key"


def get_api_key(x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER)):
    if x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
    return x_api_key


def require_api_key(api_key: str = Depends(get_api_key)):
    return api_key
