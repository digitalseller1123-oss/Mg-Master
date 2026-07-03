"""Certificate generation (PDF + QR) and public verification."""
import os
import io
import base64
import secrets
from datetime import datetime, timezone, date
from fastapi import APIRouter, HTTPException, Depends, Response
from bson import ObjectId
import qrcode
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.lib.units import inch, mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

from .auth import get_current_user, require_roles
from .db import get_db, serialize, oid
from .models import IssueCertificateIn, COURSE_LEVELS

router = APIRouter(tags=["certificates"])

PRIMARY = colors.HexColor("#1E4484")
SECONDARY = colors.HexColor("#004DA6")
DARK_GRAY = colors.HexColor("#3D3D3D")
MID_GRAY = colors.HexColor("#737373")


def _gen_cert_number() -> str:
    yr = datetime.now(timezone.utc).year
    return f"MG-{yr}-{secrets.token_hex(4).upper()}"


def _verify_url(cert_number: str) -> str:
    base = os.environ.get("PUBLIC_VERIFY_BASE", "").rstrip("/")
    if not base:
        base = "https://mgmastergroup.app"
    return f"{base}/verify/{cert_number}"


def _qr_png_bytes(text: str) -> bytes:
    img = qrcode.make(text)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
    def _decode_dataurl(data_url: str) -> bytes:
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    return base64.b64decode(data_url)


def _build_pdf(cert: dict, learner: dict, group: dict, company: dict | None, trainer: dict | None) -> bytes:
    buf = io.BytesIO()
    c = pdfcanvas.Canvas(buf, pagesize=landscape(letter))
    W, H = landscape(letter)

    # Outer frame
    c.setStrokeColor(PRIMARY)
    c.setLineWidth(6)
    c.rect(15, 15, W - 30, H - 30)
    c.setStrokeColor(SECONDARY)
    c.setLineWidth(1)
    c.rect(25, 25, W - 50, H - 50)

    # Top band
    c.setFillColor(PRIMARY)
    c.rect(25, H - 95, W - 50, 60, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(W / 2, H - 65, "MG MASTER GROUP")
    c.setFont("Helvetica", 11)
    c.drawCentredString(W / 2, H - 85, "Centro de Entrenamiento — Trabajo Seguro en Alturas")

    # Title
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(W / 2, H - 130, "CERTIFICADO DE CAPACITACIÓN Y ENTRENAMIENTO")
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(PRIMARY)
    c.drawCentredString(W / 2, H - 155, "PARA TRABAJO EN ALTURA")

    # Body
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 12)
    c.drawCentredString(W / 2, H - 190, "Se certifica que")

    full_name = f"{learner.get('first_name','').upper()} {learner.get('last_name','').upper()}"
    c.setFont("Helvetica-Bold", 22)
    c.setFillColor(PRIMARY)
    c.drawCentredString(W / 2, H - 220, full_name)

    c.setFont("Helvetica", 11)
    c.setFillColor(DARK_GRAY)
    c.drawCentredString(W / 2, H - 240,
                        f"{learner.get('document_type','CC')} N° {learner.get('document_number','')}")

    c.drawCentredString(W / 2, H - 265, "Aprobó satisfactoriamente el nivel")

    course_name = group.get("course_name", "")
    hours = group.get("course_hours", 0)
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(SECONDARY)
    c.drawCentredString(W / 2, H - 290, f"{course_name}".upper())
    c.setFont("Helvetica", 11)
    c.setFillColor(DARK_GRAY)
    c.drawCentredString(W / 2, H - 308, f"Intensidad: {hours} horas")

    # Footer info — left block
    y = 200
    c.setFont("Helvetica-Bold", 9)
    c.drawString(60, y, "EMPRESA:")
    c.setFont("Helvetica", 9)
    c.drawString(60, y - 12, (company.get("name", "") if company else "—"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(60, y - 28, "REPRESENTANTE LEGAL:")
    c.setFont("Helvetica", 9)
    c.drawString(60, y - 40, (company.get("legal_representative", "") if company else "—"))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(60, y - 56, "ARL:")
    c.setFont("Helvetica", 9)
    c.drawString(60, y - 68, (company.get("arl", "") if company else "—"))

    # Center block
    c.setFont("Helvetica-Bold", 9)
    c.drawString(W / 2 - 80, y, "FECHA DE CAPACITACIÓN:")
    c.setFont("Helvetica", 9)
    c.drawString(W / 2 - 80, y - 12, group.get("start_date", ""))
    c.setFont("Helvetica-Bold", 9)
    c.drawString(W / 2 - 80, y - 28, "FECHA DE EXPEDICIÓN:")
    c.setFont("Helvetica", 9)
    c.drawString(W / 2 - 80, y - 40, cert.get("issued_at", "").split("T")[0])
    c.setFont("Helvetica-Bold", 9)
    c.drawString(W / 2 - 80, y - 56, "CIUDAD:")
    c.setFont("Helvetica", 9)
    c.drawString(W / 2 - 80, y - 68, os.environ.get("PROVIDER_ADDRESS", "Bogotá D.C., Colombia"))

    # Right block — provider
    c.setFont("Helvetica-Bold", 9)
    c.drawString(W - 280, y, "PROVEEDOR AUTORIZADO:")
    c.setFont("Helvetica", 9)
    c.drawString(W - 280, y - 12, os.environ.get("PROVIDER_NAME", "MG Master Group SAS"))
    c.drawString(W - 280, y - 24, f"Registro MinTrabajo: {os.environ.get('PROVIDER_REGISTRATION','')}")
    c.drawString(W - 280, y - 36, f"Organismo: {os.environ.get('CERT_BODY','')}")
    c.drawString(W - 280, y - 48, f"Renovación: {os.environ.get('CERT_RENEWAL','')} — Vence: {os.environ.get('CERT_EXPIRY','')}")
    c.drawString(W - 280, y - 60, os.environ.get("RESOLUTION_REF", "Res. 4272/2021 MinTrabajo"))

    # Signatures
    sy = 95
    c.setStrokeColor(DARK_GRAY)
    c.setLineWidth(0.8)
    c.line(80, sy, 260, sy)
    c.line(W - 260, sy, W - 80, sy)
    if trainer and trainer.get("signature_data"):
        try:
            sig_bytes = _decode_dataurl(trainer["signature_data"])
            c.drawImage(ImageReader(io.BytesIO(sig_bytes)), W - 245, sy + 4,
                        width=150, height=42, mask='auto', preserveAspectRatio=True, anchor='s')
        except Exception:
            pass
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(170, sy - 12, "REPRESENTANTE LEGAL")
    c.setFont("Helvetica", 8)
    c.drawCentredString(170, sy - 24, os.environ.get("LEGAL_REPRESENTATIVE", ""))
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W - 170, sy - 12, "ENTRENADOR")
    c.setFont("Helvetica", 8)
    c.drawCentredString(W - 170, sy - 24, (trainer.get("name", "") if trainer else "—"))
    c.drawCentredString(W - 170, sy - 36, f"Licencia SST: {(trainer.get('sst_license','') if trainer else os.environ.get('SST_LICENSE',''))}")

    # QR
    qr_data = _verify_url(cert["cert_number"])
    qr_bytes = _qr_png_bytes(qr_data)
    c.drawImage(ImageReader(io.BytesIO(qr_bytes)), W - 130, sy + 10, width=80, height=80, mask='auto')
    c.setFont("Helvetica", 7)
    c.setFillColor(MID_GRAY)
    c.drawCentredString(W - 90, sy, "Escanea para verificar")

    # Cert number
    c.setFont("Helvetica-Bold", 10)
    c.setFillColor(PRIMARY)
    c.drawString(60, 45, f"Certificado N°: {cert['cert_number']}")
    c.setFillColor(MID_GRAY)
    c.setFont("Helvetica", 8)
    c.drawRightString(W - 60, 45, f"Verificable en: {qr_data}")

    c.showPage()
    c.save()
    return buf.getvalue()


@router.post("/certificates/issue")
async def issue_certificate(payload: IssueCertificateIn,
                            user: dict = Depends(require_roles("super_admin"))):
    db = get_db()
    g = await db.groups.find_one({"_id": oid(payload.group_id)})
    if not g:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    if payload.learner_id not in g.get("learner_ids", []):
        raise HTTPException(status_code=400, detail="Aprendiz no pertenece al grupo")
    learner = await db.learners.find_one({"_id": oid(payload.learner_id)})
    if not learner:
        raise HTTPException(status_code=404, detail="Aprendiz no encontrado")

    company = None
    if learner.get("company_id"):
        company = await db.companies.find_one({"_id": ObjectId(learner["company_id"])})
    trainer = None
    if g.get("trainer_id"):
        trainer = await db.users.find_one({"_id": ObjectId(g["trainer_id"])}, {"password_hash": 0})

    # Reuse cert if already issued for this learner+group
    existing = await db.certificates.find_one({"group_id": payload.group_id, "learner_id": payload.learner_id})
    if existing:
        cert = existing
    else:
        cert_number = _gen_cert_number()
        cert = {
            "cert_number": cert_number,
            "group_id": payload.group_id,
            "learner_id": payload.learner_id,
            "company_id": learner.get("company_id"),
            "course_level": g.get("course_level"),
            "course_name": g.get("course_name"),
            "course_hours": g.get("course_hours"),
            "course_days": g.get("course_days"),
            "start_date": g.get("start_date"),
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "issued_by": user["id"],
            "valid_until": None,  # could be computed (e.g., +1 year)
            "verify_url": _verify_url(cert_number),
        }
        await db.certificates.insert_one(cert)

    pdf_bytes = _build_pdf(cert, learner, g, company, trainer)
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    # store pdf reference (re-generated on each request, so we just keep the latest copy)
    await db.certificates.update_one({"cert_number": cert["cert_number"]},
                                     {"$set": {"pdf_b64": pdf_b64}})
    out = serialize(cert)
    out["pdf_b64"] = pdf_b64
    return out


@router.get("/certificates")
async def list_certificates(learner_id: str | None = None, q: str | None = None,
                            user: dict = Depends(get_current_user)):
    db = get_db()
    filt = {}
    if user["role"] == "empresa":
        filt["company_id"] = user.get("company_id")
    elif user["role"] == "aprendiz":
        filt["learner_id"] = user.get("learner_id")
    if learner_id:
        filt["learner_id"] = learner_id
    docs = await db.certificates.find(filt, {"pdf_b64": 0}).sort("issued_at", -1).limit(500).to_list(500)
    # enrich
    learner_ids = list({d["learner_id"] for d in docs})
    learners_map = {}
    if learner_ids:
        cur = db.learners.find({"_id": {"$in": [ObjectId(lid) for lid in learner_ids]}})
        async for lr in cur:
            learners_map[str(lr["_id"])] = lr
    out = []
    for d in docs:
        s = serialize(d)
        lr = learners_map.get(d["learner_id"], {})
        s["learner_name"] = f"{lr.get('first_name','')} {lr.get('last_name','')}".strip()
        s["document_number"] = lr.get("document_number", "")
        if q:
            blob = f"{s['learner_name']} {s['document_number']} {s.get('cert_number','')}".lower()
            if q.lower() not in blob:
                continue
        out.append(s)
    return out


@router.get("/certificates/{cert_id}/pdf")
async def cert_pdf(cert_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    cert = await db.certificates.find_one({"_id": oid(cert_id)})
    if not cert:
        raise HTTPException(status_code=404, detail="No encontrado")
    if user["role"] == "empresa" and cert.get("company_id") != user.get("company_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    if user["role"] == "aprendiz" and cert.get("learner_id") != user.get("learner_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    pdf_b64 = cert.get("pdf_b64")
    if not pdf_b64:
        # regenerate
        learner = await db.learners.find_one({"_id": ObjectId(cert["learner_id"])})
        g = await db.groups.find_one({"_id": ObjectId(cert["group_id"])})
        company = await db.companies.find_one({"_id": ObjectId(learner["company_id"])}) if learner.get("company_id") else None
        trainer = await db.users.find_one({"_id": ObjectId(g["trainer_id"])}, {"password_hash": 0}) if g.get("trainer_id") else None
        pdf_bytes = _build_pdf(cert, learner, g, company, trainer)
        pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
        await db.certificates.update_one({"_id": cert["_id"]}, {"$set": {"pdf_b64": pdf_b64}})
    return {"file_name": f"{cert['cert_number']}.pdf", "pdf_b64": pdf_b64}


# ============== PUBLIC =================
public_router = APIRouter(prefix="/public", tags=["public"])


@public_router.get("/lookup")
async def public_lookup(document_number: str):
    db = get_db()
    learner = await db.learners.find_one({"document_number": document_number})
    if not learner:
        return {"found": False, "certificates": []}
    docs = await db.certificates.find(
        {"learner_id": str(learner["_id"])},
        {"pdf_b64": 0},
    ).sort("issued_at", -1).to_list(50)
    return {
        "found": True,
        "learner": {
            "name": f"{learner.get('first_name','')} {learner.get('last_name','')}",
            "document_type": learner.get("document_type", "CC"),
            "document_number": learner.get("document_number", ""),
        },
        "certificates": [
            {
                "cert_number": d.get("cert_number"),
                "course_name": d.get("course_name"),
                "course_level": d.get("course_level"),
                "course_hours": d.get("course_hours"),
                "start_date": d.get("start_date"),
                "issued_at": d.get("issued_at"),
                "verify_url": d.get("verify_url"),
                "id": str(d.get("_id")),
            }
            for d in docs
        ],
    }


@public_router.get("/verify/{cert_number}")
async def public_verify(cert_number: str):
    db = get_db()
    cert = await db.certificates.find_one({"cert_number": cert_number}, {"pdf_b64": 0})
    if not cert:
        return {"valid": False}
    learner = await db.learners.find_one({"_id": ObjectId(cert["learner_id"])})
    company = await db.companies.find_one({"_id": ObjectId(learner["company_id"])}) if learner and learner.get("company_id") else None
    return {
        "valid": True,
        "cert_number": cert.get("cert_number"),
        "issued_at": cert.get("issued_at"),
        "course_name": cert.get("course_name"),
        "course_hours": cert.get("course_hours"),
        "start_date": cert.get("start_date"),
        "learner": {
            "name": f"{learner.get('first_name','')} {learner.get('last_name','')}",
            "document_type": learner.get("document_type", "CC"),
            "document_number": learner.get("document_number", ""),
        } if learner else None,
        "company": {
            "name": company.get("name"),
            "nit": company.get("nit"),
        } if company else None,
    }
