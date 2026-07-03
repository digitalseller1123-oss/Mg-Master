"""Pydantic models / schemas."""
from typing import Optional, List, Literal, Any
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime

Role = Literal["super_admin", "empresa", "entrenador", "aprendiz"]
CourseLevel = Literal[
    "REENTRENAMIENTO_4272",
    "TRABAJADOR_AUTORIZADO",
    "COORDINADOR_4272",
    "ADMINISTRATIVO_JEFES",
]

COURSE_LEVELS = {
    "REENTRENAMIENTO_4272": {
        "name": "Reentrenamiento Sectorial 4272",
        "hours": 20,
        "days": 1,
        "required_docs": ["cedula", "examen_medico", "seguridad_social", "certificado_alturas"],
    },
    "TRABAJADOR_AUTORIZADO": {
        "name": "Trabajador Autorizado",
        "hours": 32,
        "days": 4,
        "required_docs": ["cedula", "examen_medico", "seguridad_social"],
    },
    "COORDINADOR_4272": {
        "name": "Coordinador 4272",
        "hours": 80,
        "days": 8,
        "required_docs": ["cedula", "examen_medico", "seguridad_social"],
    },
    "ADMINISTRATIVO_JEFES": {
        "name": "Administrativo - Jefes de Área",
        "hours": 8,
        "days": 1,
        "required_docs": ["cedula", "seguridad_social"],
    },
}

DOC_LABELS = {
    "cedula": "Cédula de Ciudadanía",
    "examen_medico": "Examen Médico de Alturas",
    "seguridad_social": "Seguridad Social (EPS/ARL)",
    "certificado_alturas": "Certificado Previo de Curso de Alturas",
}


# ============== AUTH ==============
class LoginIn(BaseModel):
    username: str  # email OR cédula
    password: str


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str


# ============== USER ==============
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: Role
    phone: Optional[str] = None
    sst_license: Optional[str] = None
    company_id: Optional[str] = None  # only if role == 'empresa' (links to company)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    active: Optional[bool] = None
    sst_license: Optional[str] = None
    signature_data: Optional[str] = None


# ============== COMPANY ==============
class CompanyCreate(BaseModel):
    name: str
    nit: str
    legal_representative: str
    arl: str
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    # Optional user account auto-create
    create_user: Optional[bool] = True
    user_email: Optional[str] = None
    user_password: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    nit: Optional[str] = None
    legal_representative: Optional[str] = None
    arl: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ============== LEARNER ==============
class LearnerCreate(BaseModel):
    first_name: str
    last_name: str
    document_type: str = "CC"
    document_number: str
    labor: Optional[str] = ""
    literacy_level: Optional[str] = ""
    education_level: Optional[str] = ""
    blood_group: Optional[str] = ""
    rh: Optional[str] = ""
    birth_date: Optional[str] = ""
    phone: Optional[str] = ""
    allergies: Optional[str] = ""
    medications: Optional[str] = ""
    injuries: Optional[str] = ""
    illnesses: Optional[str] = ""
    emergency_contact_name: Optional[str] = ""
    emergency_contact_phone: Optional[str] = ""
    gender: Optional[str] = ""
    country: Optional[str] = "Colombia"
    economic_sector: Optional[str] = ""
    current_position: Optional[str] = ""
    company_id: Optional[str] = None  # required for super_admin, auto for empresa
    can_sign: Optional[bool] = True


class LearnerUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    labor: Optional[str] = None
    phone: Optional[str] = None
    allergies: Optional[str] = None
    medications: Optional[str] = None
    injuries: Optional[str] = None
    illnesses: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    education_level: Optional[str] = None
    blood_group: Optional[str] = None
    rh: Optional[str] = None
    birth_date: Optional[str] = None
    can_sign: Optional[bool] = None


# ============== PROGRAMMING / GROUPS ==============
class ProgramCourseIn(BaseModel):
    course_level: CourseLevel
    start_date: str  # ISO date
    learner_ids: List[str]
    company_id: Optional[str] = None  # only for super_admin


class AssignTrainerIn(BaseModel):
    trainer_id: str


# ============== DOCUMENTS ==============
class DocumentUploadIn(BaseModel):
    learner_id: str
    doc_type: str  # cedula | examen_medico | seguridad_social | certificado_alturas
    file_name: str
    file_data: str  # base64 dataURL


class DocumentReviewIn(BaseModel):
    status: Literal["aprobado", "rechazado"]
    review_note: Optional[str] = ""


# ============== ATTENDANCE / SIGNATURE ==============
class AttendanceIn(BaseModel):
    group_id: str
    learner_id: str
    day_index: int  # 0-based day of the course
    signature_data: Optional[str] = None  # dataURL of signature canvas
    fingerprint_data: Optional[str] = None  # dataURL or text indicating fingerprint capture
    photo_evidence: Optional[str] = None  # dataURL of photo evidence
    note: Optional[str] = ""


# ============== CERTIFICATES ==============
class IssueCertificateIn(BaseModel):
    group_id: str
    learner_id: str


# ============== PUBLIC ==============
class PublicLookupIn(BaseModel):
    document_number: str
