"""Learner document uploads and review routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from .auth import get_current_user, require_roles
from .db import get_db, serialize, oid

router = APIRouter(prefix="/documents", tags=["documents"])

DOC_LABELS = {
    "cedula": "Cédula",
    "examen_medico": "Examen médico de alturas",
    "seguridad_social": "Seguridad social",
    "certificado_alturas": "Certificado previo de alturas",
}


class DocumentCreate(BaseModel):
    learner_id: str
    doc_type: str
    file_name: str
    file_data: str


class DocumentReview(BaseModel):
    status: str
    review_note: Optional[str] = None


def _scope_filter(user: dict) -> dict:
    if user["role"] == "super_admin":
        return {}
    if user["role"] == "empresa":
        return {"company_id": user.get("company_id")}
    if user["role"] == "aprendiz":
        return {"learner_id": user.get("learner_id")}
    return {"_id": None}


@router.get("")
async def list_documents(user: dict = Depends(get_current_user)):
    db = get_db()
    filt = _scope_filter(user)
    docs = await db.documents.find(filt, {"file_data": 0}).sort("created_at", -1).to_list(1000)
    out = []
    for d in docs:
        s = serialize(d)
        s["doc_label"] = DOC_LABELS.get(d.get("doc_type"), d.get("doc_type"))
        out.append(s)
    return out


@router.post("")
async def upload_document(payload: DocumentCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    learner = await db.learners.find_one({"_id": oid(payload.learner_id)})
    if not learner:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")
    if user["role"] == "empresa" and str(learner.get("company_id")) != str(user.get("company_id")):
        raise HTTPException(status_code=403, detail="No autorizado")
    if user["role"] == "aprendiz" and str(payload.learner_id) != str(user.get("learner_id")):
        raise HTTPException(status_code=403, detail="No autorizado")

    doc = {
        "learner_id": payload.learner_id,
        "company_id": learner.get("company_id"),
        "doc_type": payload.doc_type,
        "file_name": payload.file_name,
        "file_data": payload.file_data,
        "status": "pendiente",
        "review_note": None,
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    res = await db.documents.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    doc.pop("file_data", None)
    doc["doc_label"] = DOC_LABELS.get(payload.doc_type, payload.doc_type)
    return doc


@router.get("/{doc_id}/file")
async def get_document_file(doc_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    filt = _scope_filter(user)
    filt["_id"] = oid(doc_id)
    d = await db.documents.find_one(filt)
    if not d:
        raise HTTPException(status_code=404, detail="No encontrado")
    return {"file_data": d.get("file_data"), "file_name": d.get("file_name")}


@router.patch("/{doc_id}/review")
async def review_document(doc_id: str, payload: DocumentReview,
                           user: dict = Depends(require_roles("super_admin"))):
    if payload.status not in ("aprobado", "rechazado"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    db = get_db()
    await db.documents.update_one(
        {"_id": oid(doc_id)},
        {"$set": {
            "status": payload.status,
            "review_note": payload.review_note,
            "reviewed_by": user["id"],
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    d = await db.documents.find_one({"_id": oid(doc_id)}, {"file_data": 0})
    s = serialize(d)
    s["doc_label"] = DOC_LABELS.get(d.get("doc_type"), d.get("doc_type"))
    return s
