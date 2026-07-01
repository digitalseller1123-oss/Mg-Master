"""Learners (Aprendices) routes."""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone
from .auth import get_current_user, require_roles, hash_password
from .db import get_db, serialize, oid
from .models import LearnerCreate, LearnerUpdate

router = APIRouter(prefix="/learners", tags=["learners"])


def _scope(user: dict) -> dict:
    """Build a Mongo filter limiting learners to the caller's scope."""
    if user["role"] == "super_admin":
        return {}
    if user["role"] == "empresa":
        return {"company_id": user.get("company_id")}
    if user["role"] == "aprendiz":
        return {"_id": ObjectId(user.get("learner_id"))} if user.get("learner_id") else {"_id": None}
    return {}


@router.get("")
async def list_learners(q: str | None = None, company_id: str | None = None,
                        user: dict = Depends(get_current_user)):
    db = get_db()
    filt = _scope(user)
    if company_id and user["role"] == "super_admin":
        filt["company_id"] = company_id
    if q:
        filt["$or"] = [
            {"document_number": {"$regex": q, "$options": "i"}},
            {"first_name": {"$regex": q, "$options": "i"}},
            {"last_name": {"$regex": q, "$options": "i"}},
        ]
    docs = await db.learners.find(filt).sort("last_name", 1).limit(500).to_list(500)
    # join company name
    company_ids = {d.get("company_id") for d in docs if d.get("company_id")}
    companies = {}
    if company_ids:
        cur = db.companies.find({"_id": {"$in": [ObjectId(c) for c in company_ids if c]}})
        async for c in cur:
            companies[str(c["_id"])] = c.get("name")
    out = []
    for d in docs:
        s = serialize(d)
        s["company_name"] = companies.get(d.get("company_id"), "")
        out.append(s)
    return out


@router.post("")
async def create_learner(payload: LearnerCreate, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    if await db.learners.find_one({"document_number": payload.document_number}):
        raise HTTPException(status_code=400, detail="Documento ya registrado")
    company_id = payload.company_id if user["role"] == "super_admin" else user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=400, detail="Empresa requerida")
    doc = payload.model_dump()
    doc["company_id"] = company_id
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["created_by"] = user["id"]
    res = await db.learners.insert_one(doc)
    learner_id = str(res.inserted_id)

    # Auto-create login user for the learner: cédula / cédula
    if not await db.users.find_one({"document_number": payload.document_number}):
        await db.users.insert_one({
            "email": None,
            "document_number": payload.document_number,
            "password_hash": hash_password(payload.document_number),
            "name": f"{payload.first_name} {payload.last_name}",
            "role": "aprendiz",
            "learner_id": learner_id,
            "company_id": company_id,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    doc["id"] = learner_id
    doc.pop("_id", None)
    return doc


@router.get("/{learner_id}")
async def get_learner(learner_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    filt = _scope(user)
    filt["_id"] = oid(learner_id)
    d = await db.learners.find_one(filt)
    if not d:
        raise HTTPException(status_code=404, detail="No encontrado")
    s = serialize(d)
    if d.get("company_id"):
        c = await db.companies.find_one({"_id": ObjectId(d["company_id"])})
        s["company"] = serialize(c) if c else None
    return s


@router.patch("/{learner_id}")
async def update_learner(learner_id: str, payload: LearnerUpdate, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    filt = _scope(user)
    filt["_id"] = oid(learner_id)
    if updates:
        await db.learners.update_one(filt, {"$set": updates})
    d = await db.learners.find_one({"_id": oid(learner_id)})
    return serialize(d)


@router.delete("/{learner_id}")
async def delete_learner(learner_id: str, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    filt = _scope(user)
    filt["_id"] = oid(learner_id)
    res = await db.learners.delete_one(filt)
    if res.deleted_count:
        await db.users.delete_many({"learner_id": learner_id})
    return {"ok": True}
