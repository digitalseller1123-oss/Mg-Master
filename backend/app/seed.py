"""Seed initial super admin user and write test credentials."""
import os
from datetime import datetime, timezone
from pathlib import Path
from .db import get_db
from .auth import hash_password, verify_password


async def seed_admin():
    db = get_db()
    email = os.environ["ADMIN_EMAIL"].lower()
    password = os.environ["ADMIN_PASSWORD"]
    name = os.environ.get("ADMIN_NAME", "Super Administrador")

    existing = await db.users.find_one({"email": email})
    if existing is None:
        await db.users.insert_one({
            "email": email,
            "password_hash": hash_password(password),
            "name": name,
            "role": "super_admin",
            "active": True,
            "phone": "",
            "sst_license": os.environ.get("SST_LICENSE", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(password, existing["password_hash"]):
        await db.users.update_one(
            {"_id": existing["_id"]},
            {"$set": {"password_hash": hash_password(password)}},
        )

    # Indexes
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("document_number", sparse=True)
    await db.companies.create_index("nit", unique=True)
    await db.learners.create_index("document_number", unique=True)
    await db.groups.create_index([("course_level", 1), ("start_date", 1)])
    await db.attendance.create_index([("group_id", 1), ("learner_id", 1), ("day_index", 1)], unique=True)
    await db.certificates.create_index("cert_number", unique=True)
    await db.documents.create_index([("learner_id", 1), ("doc_type", 1)])


def write_test_credentials():
    mem = Path("/app/memory")
    mem.mkdir(parents=True, exist_ok=True)
    creds = mem / "test_credentials.md"
    content = f"""# Test Credentials — MG Master Group

## Super Administrador (creado automáticamente al iniciar)
- email: `{os.environ.get('ADMIN_EMAIL','admin@mgmastergroup.com')}`
- password: `{os.environ.get('ADMIN_PASSWORD','MGAdmin2026!')}`
- role: `super_admin`

## Aprendices
- Los aprendices inician sesión con su NÚMERO DE CÉDULA como usuario y como contraseña inicial.

## Empresas
- El super admin crea las empresas y, opcionalmente, una cuenta de usuario asociada.
- Si se autocrea, el usuario por defecto es `<email>` y la contraseña es la cédula del NIT o la indicada al crear.

## Entrenadores
- Los crea el super admin con email/contraseña personalizados.

## Endpoints relevantes
- POST `/api/auth/login` — body: `{{ "username": "<email_o_cedula>", "password": "..." }}`
- GET `/api/auth/me`
- POST `/api/auth/logout`
- POST `/api/auth/change-password`
"""
    creds.write_text(content, encoding="utf-8")
