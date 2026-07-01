"""Dashboard stats and reports."""
from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta
from .auth import get_current_user, require_roles
from .db import get_db

router = APIRouter(tags=["stats"])


@router.get("/stats/dashboard")
async def dashboard(user: dict = Depends(get_current_user)):
    db = get_db()
    role = user["role"]
    if role == "super_admin":
        companies = await db.companies.count_documents({})
        learners = await db.learners.count_documents({})
        trainers = await db.users.count_documents({"role": "entrenador"})
        groups_active = await db.groups.count_documents({"status": {"$ne": "completado"}})
        certs = await db.certificates.count_documents({})
        pending_docs = await db.documents.count_documents({"status": "pendiente"})
        # recent certs
        recent_cur = db.certificates.find({}, {"pdf_b64": 0}).sort("issued_at", -1).limit(5)
        recent = []
        async for c in recent_cur:
            recent.append({
                "cert_number": c.get("cert_number"),
                "course_name": c.get("course_name"),
                "issued_at": c.get("issued_at"),
            })
        return {
            "companies": companies,
            "learners": learners,
            "trainers": trainers,
            "groups_active": groups_active,
            "certificates": certs,
            "pending_docs": pending_docs,
            "recent_certificates": recent,
        }
    if role == "empresa":
        cid = user.get("company_id")
        learners = await db.learners.count_documents({"company_id": cid})
        groups = await db.groups.count_documents({"company_ids": cid})
        certs = await db.certificates.count_documents({"company_id": cid})
        pending_docs = await db.documents.count_documents({"company_id": cid, "status": "pendiente"})
        return {
            "learners": learners,
            "groups": groups,
            "certificates": certs,
            "pending_docs": pending_docs,
        }
    if role == "entrenador":
        groups = await db.groups.count_documents({"trainer_id": user["id"]})
        # learners count across assigned groups
        cur = db.groups.find({"trainer_id": user["id"]})
        total_l = 0
        async for g in cur:
            total_l += len(g.get("learner_ids", []))
        return {"groups": groups, "learners": total_l}
    if role == "aprendiz":
        lid = user.get("learner_id")
        certs = await db.certificates.count_documents({"learner_id": lid})
        groups = await db.groups.count_documents({"learner_ids": lid})
        return {"certificates": certs, "groups": groups}
    return {}
