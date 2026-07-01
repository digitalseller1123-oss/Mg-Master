"""Companies + Users (trainers, company users, learners as users) routes."""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from .auth import get_current_user, require_roles, hash_password
from .db import get_db, serialize, oid
from .models import CompanyCreate, CompanyUpdate, UserCreate, UserUpdate

router = APIRouter(tags=["entities"])


# ============== COMPANIES ==============
@router.get("/companies")
async def list_companies(user: dict = Depends(get_current_user)):
    db = get_db()
    q = {} if user["role"] == "super_admin" else {"_id": ObjectId(user.get("company_id"))} if user.get("company_id") else {"_id": None}
    docs = await db.companies.find(q).sort("name", 1).to_list(1000)
    return [serialize(d) for d in docs]


@router.post("/companies")
async def create_company(payload: CompanyCreate, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    existing = await db.companies.find_one({"nit": payload.nit})
    if existing:
        raise HTTPException(status_code=400, detail="NIT ya registrado")
    doc = {
        "name": payload.name,
        "nit": payload.nit,
        "legal_representative": payload.legal_representative,
        "arl": payload.arl,
        "address": payload.address or "",
        "phone": payload.phone or "",
        "email": (payload.email or "").lower(),
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.companies.insert_one(doc)
    company_id = str(res.inserted_id)

    created_user = None
    if payload.create_user and payload.user_email and payload.user_password:
        email = payload.user_email.lower()
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="Email de usuario ya existe")
        user_doc = {
            "email": email,
            "password_hash": hash_password(payload.user_password),
            "name": payload.legal_representative,
            "role": "empresa",
            "company_id": company_id,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        u_res = await db.users.insert_one(user_doc)
        created_user = {"id": str(u_res.inserted_id), "email": email}

    doc["id"] = company_id
    doc.pop("_id", None)
    return {"company": doc, "user": created_user}


@router.patch("/companies/{company_id}")
async def update_company(company_id: str, payload: CompanyUpdate, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if not updates:
        return {"ok": True}
    await db.companies.update_one({"_id": oid(company_id)}, {"$set": updates})
    doc = await db.companies.find_one({"_id": oid(company_id)})
    return serialize(doc)


@router.delete("/companies/{company_id}")
async def delete_company(company_id: str, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    await db.companies.delete_one({"_id": oid(company_id)})
    await db.users.delete_many({"role": "empresa", "company_id": company_id})
    return {"ok": True}


# ============== USERS (trainers, company users) ==============
@router.get("/users")
async def list_users(role: str | None = None, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    q = {}
    if role:
        q["role"] = role
    docs = await db.users.find(q, {"password_hash": 0}).sort("created_at", -1).to_list(1000)
    return [serialize(d) for d in docs]


@router.post("/users")
async def create_user(payload: UserCreate, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    doc = {
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name,
        "role": payload.role,
        "phone": payload.phone or "",
        "sst_license": payload.sst_license or "",
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if payload.company_id:
        doc["company_id"] = payload.company_id
    res = await db.users.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


@router.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if updates:
        await db.users.update_one({"_id": oid(user_id)}, {"$set": updates})
    doc = await db.users.find_one({"_id": oid(user_id)}, {"password_hash": 0})
    return serialize(doc)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    await db.users.delete_one({"_id": oid(user_id)})
    return {"ok": True}
