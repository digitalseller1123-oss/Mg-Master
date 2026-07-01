"""Auth routes (login, me, logout, change-password)."""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from bson import ObjectId
from datetime import datetime, timezone
from .auth import (
    verify_password, hash_password, set_auth_cookies, clear_auth_cookies,
    get_current_user,
)
from .db import get_db, serialize
from .models import LoginIn, ChangePasswordIn

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(payload: LoginIn, response: Response):
    db = get_db()
    username = payload.username.strip().lower()
    # try email then document_number (for aprendices)
    user = await db.users.find_one({"email": username})
    if not user:
        user = await db.users.find_one({"document_number": payload.username.strip()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if user.get("active") is False:
        raise HTTPException(status_code=403, detail="Cuenta deshabilitada")
    set_auth_cookies(response, str(user["_id"]), user["role"])
    out = serialize(user)
    out.pop("password_hash", None)
    return out


@router.post("/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@router.post("/change-password")
async def change_password(payload: ChangePasswordIn, user: dict = Depends(get_current_user)):
    db = get_db()
    full = await db.users.find_one({"_id": ObjectId(user["id"])})
    if not full or not verify_password(payload.current_password, full["password_hash"]):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    await db.users.update_one(
        {"_id": full["_id"]},
        {"$set": {"password_hash": hash_password(payload.new_password),
                   "password_changed_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}
