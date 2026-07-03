"""Course programming + groups + documents + attendance routes."""
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId
from datetime import datetime, timezone, timedelta, date
from typing import List
from .auth import get_current_user, require_roles
from .db import get_db, serialize, oid
from .models import (
    ProgramCourseIn, AssignTrainerIn, AddLearnersIn, DocumentUploadIn, DocumentReviewIn,
    AttendanceIn, COURSE_LEVELS, DOC_LABELS,
)

router = APIRouter(tags=["courses"])

MAX_PER_GROUP = 30


@router.get("/course-levels")
async def course_levels():
    return [{"code": k, **v} for k, v in COURSE_LEVELS.items()]


# ============== GROUPS ==============
async def _ensure_group(db, course_level: str, start_date: str, company_id: str | None):
    """Find or create a group for the given course+start_date with space < MAX_PER_GROUP."""
    cursor = db.groups.find({
        "course_level": course_level,
        "start_date": start_date,
    }).sort("group_index", 1)
    candidates = await cursor.to_list(50)
    for g in candidates:
        if len(g.get("learner_ids", [])) < MAX_PER_GROUP:
            return g
    # create new
    next_index = (candidates[-1]["group_index"] + 1) if candidates else 1
    meta = COURSE_LEVELS[course_level]
    doc = {
        "course_level": course_level,
        "course_name": meta["name"],
        "course_hours": meta["hours"],
        "course_days": meta["days"],
        "start_date": start_date,
        "group_index": next_index,
        "learner_ids": [],
        "trainer_id": None,
        "company_ids": [company_id] if company_id else [],
        "status": "programado",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.groups.insert_one(doc)
    doc["_id"] = res.inserted_id
    return doc


@router.post("/programming")
async def program_course(payload: ProgramCourseIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    if payload.course_level not in COURSE_LEVELS:
        raise HTTPException(status_code=400, detail="Nivel inválido")
    if not payload.learner_ids:
        raise HTTPException(status_code=400, detail="Selecciona al menos un aprendiz")

    db = get_db()
    _ = payload.company_id if user["role"] == "super_admin" else user.get("company_id")

    assigned_groups = []
    for lid in payload.learner_ids:
        learner = await db.learners.find_one({"_id": oid(lid)})
        if not learner:
            continue
        # avoid duplicate enrollment for same course+date
        existing = await db.groups.find_one({
            "course_level": payload.course_level,
            "start_date": payload.start_date,
            "learner_ids": lid,
        })
        if existing:
            assigned_groups.append(str(existing["_id"]))
            continue
        g = await _ensure_group(db, payload.course_level, payload.start_date, learner.get("company_id"))
        await db.groups.update_one({"_id": g["_id"]}, {
            "$addToSet": {"learner_ids": lid, "company_ids": learner.get("company_id")},
        })
        assigned_groups.append(str(g["_id"]))
    return {"group_ids": list(set(assigned_groups))}


@router.get("/groups")
async def list_groups(user: dict = Depends(get_current_user)):
    db = get_db()
    q = {}
    if user["role"] == "empresa":
        q = {"company_ids": user.get("company_id")}
    elif user["role"] == "entrenador":
        q = {"trainer_id": user["id"]}
    elif user["role"] == "aprendiz":
        q = {"learner_ids": user.get("learner_id")}
    docs = await db.groups.find(q).sort("start_date", -1).limit(500).to_list(500)
    out = []
    trainer_ids = list({d.get("trainer_id") for d in docs if d.get("trainer_id")})
    trainers_map = {}
    if trainer_ids:
        cur = db.users.find({"_id": {"$in": [ObjectId(t) for t in trainer_ids]}}, {"password_hash": 0})
        async for t in cur:
            trainers_map[str(t["_id"])] = t.get("name")
    for d in docs:
        s = serialize(d)
        s["learners_count"] = len(d.get("learner_ids", []))
        s["trainer_name"] = trainers_map.get(d.get("trainer_id"), "")
        out.append(s)
    return out


@router.get("/groups/{group_id}")
async def get_group(group_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    g = await db.groups.find_one({"_id": oid(group_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    learners = []
    if g.get("learner_ids"):
        cur = db.learners.find({"_id": {"$in": [ObjectId(lid) for lid in g["learner_ids"]]}})
        async for lr in cur:
            learners.append(serialize(lr))
    trainer = None
    if g.get("trainer_id"):
        t = await db.users.find_one({"_id": ObjectId(g["trainer_id"])}, {"password_hash": 0})
        trainer = serialize(t) if t else None
    s = serialize(g)
    s["learners"] = learners
    s["trainer"] = trainer
    return s


@router.patch("/groups/{group_id}/trainer")
async def assign_trainer(group_id: str, payload: AssignTrainerIn,
                         user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    trainer = await db.users.find_one({"_id": oid(payload.trainer_id), "role": "entrenador"})
    if not trainer:
        raise HTTPException(status_code=404, detail="Entrenador no encontrado")
    await db.groups.update_one({"_id": oid(group_id)}, {"$set": {"trainer_id": payload.trainer_id}})
    return {"ok": True}

@router.post("/groups/{group_id}/learners")
async def add_learners_to_group(group_id: str, payload: AddLearnersIn,
                                 user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    g = await db.groups.find_one({"_id": oid(group_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    current = g.get("learner_ids", [])
    space = MAX_PER_GROUP - len(current)
    if space <= 0:
        raise HTTPException(status_code=400, detail="El grupo ya está lleno (30/30)")
    added = []
    for lid in payload.learner_ids[:space]:
        if lid in current:
            continue
        learner = await db.learners.find_one({"_id": oid(lid)})
        if not learner:
            continue
        if user["role"] == "empresa" and learner.get("company_id") != user.get("company_id"):
            continue
        await db.groups.update_one({"_id": g["_id"]}, {
            "$addToSet": {"learner_ids": lid, "company_ids": learner.get("company_id")},
        })
        added.append(lid)
    return {"added": added, "count": len(added)}

</parameter>
@router.delete("/groups/{group_id}/learners/{learner_id}")
async def remove_learner_from_group(group_id: str, learner_id: str,
                                    user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    await db.groups.update_one({"_id": oid(group_id)}, {"$pull": {"learner_ids": learner_id}})
    return {"ok": True}


# ============== DOCUMENTS ==============
@router.post("/documents")
async def upload_document(payload: DocumentUploadIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "empresa", "aprendiz"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    learner = await db.learners.find_one({"_id": oid(payload.learner_id)})
    if not learner:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    if user["role"] == "empresa" and learner.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    if payload.doc_type not in DOC_LABELS:
        raise HTTPException(status_code=400, detail="Tipo de documento inválido")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "learner_id": payload.learner_id,
        "company_id": learner.get("company_id"),
        "doc_type": payload.doc_type,
        "doc_label": DOC_LABELS[payload.doc_type],
        "file_name": payload.file_name,
        "file_data": payload.file_data,
        "status": "pendiente",
        "uploaded_by": user["id"],
        "uploaded_at": now,
        "review_note": "",
    }
    # Replace existing pending or any of this doc_type for this learner
    await db.documents.delete_many({"learner_id": payload.learner_id, "doc_type": payload.doc_type})
    res = await db.documents.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    doc["file_data"] = "<binary>"
    return doc


@router.get("/documents")
async def list_documents(learner_id: str | None = None, status: str | None = None,
                          user: dict = Depends(get_current_user)):
    db = get_db()
    q = {}
    if learner_id:
        q["learner_id"] = learner_id
    if status:
        q["status"] = status
    if user["role"] == "empresa":
        q["company_id"] = user.get("company_id")
    elif user["role"] == "aprendiz":
        q["learner_id"] = user.get("learner_id")
    docs = await db.documents.find(q, {"file_data": 0}).sort("uploaded_at", -1).limit(500).to_list(500)
    return [serialize(d) for d in docs]


@router.get("/documents/{doc_id}/file")
async def get_document_file(doc_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    d = await db.documents.find_one({"_id": oid(doc_id)})
    if not d:
        raise HTTPException(status_code=404, detail="No encontrado")
    if user["role"] == "empresa" and d.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    if user["role"] == "aprendiz" and d.get("learner_id") != user.get("learner_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    return {"file_name": d.get("file_name"), "file_data": d.get("file_data")}


@router.patch("/documents/{doc_id}/review")
async def review_document(doc_id: str, payload: DocumentReviewIn,
                          user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    await db.documents.update_one(
        {"_id": oid(doc_id)},
        {"$set": {
            "status": payload.status,
            "review_note": payload.review_note or "",
            "reviewed_by": user["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    d = await db.documents.find_one({"_id": oid(doc_id)}, {"file_data": 0})
    return serialize(d)


# ============== ATTENDANCE ==============
@router.post("/attendance")
async def register_attendance(payload: AttendanceIn, user: dict = Depends(get_current_user)):
    if user["role"] not in ("super_admin", "entrenador"):
        raise HTTPException(status_code=403, detail="No autorizado")
    db = get_db()
    g = await db.groups.find_one({"_id": oid(payload.group_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if user["role"] == "entrenador" and g.get("trainer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Grupo no asignado")
    if payload.learner_id not in g.get("learner_ids", []):
        raise HTTPException(status_code=400, detail="Aprendiz no pertenece al grupo")
    if payload.day_index >= g.get("course_days", 1):
        raise HTTPException(status_code=400, detail="Día fuera de rango del curso")

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "group_id": payload.group_id,
        "learner_id": payload.learner_id,
        "day_index": payload.day_index,
        "signature_data": payload.signature_data,
        "fingerprint_data": payload.fingerprint_data,
        "photo_evidence": payload.photo_evidence,
        "note": payload.note or "",
        "registered_by": user["id"],
        "registered_at": now,
    }
    await db.attendance.update_one(
        {"group_id": payload.group_id, "learner_id": payload.learner_id, "day_index": payload.day_index},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@router.get("/attendance")
async def list_attendance(group_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    g = await db.groups.find_one({"_id": oid(group_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if user["role"] == "entrenador" and g.get("trainer_id") != user["id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    docs = await db.attendance.find({"group_id": group_id}).to_list(2000)
    out = []
    for d in docs:
        s = serialize(d)
        # don't ship raw signature data in list; only flag presence
        s["has_signature"] = bool(d.get("signature_data"))
        s["has_fingerprint"] = bool(d.get("fingerprint_data"))
        s["has_photo"] = bool(d.get("photo_evidence"))
        s.pop("signature_data", None)
        s.pop("fingerprint_data", None)
        s.pop("photo_evidence", None)
        out.append(s)
    return out
