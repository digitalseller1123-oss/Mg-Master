"""End-to-end backend tests for MG Master Group SaaS.

Covers: health, auth (super admin + learner), course-levels, companies, users (trainers),
learners, programming/groups, trainer assignment, documents, attendance,
certificates, public lookup/verify, dashboard stats, and basic role-based access control.
"""
import os
import time
import base64
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://certifica-alturas.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@mgmastergroup.com"
ADMIN_PASSWORD = "MGAdmin2026!"

UNIQUE = str(int(time.time()))


# ============== FIXTURES ==============
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("role") == "super_admin"
    # access_token cookie must be set
    assert "access_token" in s.cookies, "access_token cookie not set"
    assert "refresh_token" in s.cookies, "refresh_token cookie not set"
    return s


@pytest.fixture(scope="session")
def state():
    """Holds IDs created during the test run for cross-test reuse."""
    return {}


# ============== HEALTH ==============
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "ok"


# ============== AUTH ==============
class TestAuth:
    def test_login_super_admin(self, admin_session):
        # also verify /me
        r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u.get("role") == "super_admin"
        assert u.get("email") == ADMIN_EMAIL

    def test_me_without_cookies_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_login_invalid(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"username": ADMIN_EMAIL, "password": "wrong"}, timeout=15)
        assert r.status_code == 401


# ============== COURSE LEVELS ==============
def test_course_levels(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/course-levels", timeout=15)
    assert r.status_code == 200
    levels = r.json()
    codes = {l["code"] for l in levels}
    assert codes == {"REENTRENAMIENTO_4272", "TRABAJADOR_AUTORIZADO",
                     "COORDINADOR_4272", "ADMINISTRATIVO_JEFES"}
    for lvl in levels:
        assert "hours" in lvl and "required_docs" in lvl and "days" in lvl


# ============== COMPANIES ==============
class TestCompanies:
    def test_create_company(self, admin_session, state):
        nit = f"TEST{UNIQUE}"
        payload = {
            "name": f"TEST_Acme {UNIQUE}",
            "nit": nit,
            "legal_representative": "Juan Pérez",
            "arl": "SURA",
            "address": "Calle 1",
            "phone": "3001234567",
            "email": f"acme_{UNIQUE}@example.com",
            "create_user": True,
            "user_email": f"acme_user_{UNIQUE}@example.com",
            "user_password": "Acme2026!",
        }
        r = admin_session.post(f"{BASE_URL}/api/companies", json=payload, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "company" in data
        assert data["company"]["nit"] == nit
        assert data["user"] is not None
        state["company_id"] = data["company"]["id"]
        state["company_nit"] = nit

    def test_create_company_duplicate_nit_returns_400(self, admin_session, state):
        payload = {
            "name": "TEST_dup",
            "nit": state["company_nit"],
            "legal_representative": "X",
            "arl": "SURA",
        }
        r = admin_session.post(f"{BASE_URL}/api/companies", json=payload, timeout=15)
        assert r.status_code == 400

    def test_list_companies(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/companies", timeout=15)
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert state["company_id"] in ids


# ============== USERS (TRAINERS) ==============
class TestTrainers:
    def test_create_trainer(self, admin_session, state):
        email = f"trainer_{UNIQUE}@example.com"
        r = admin_session.post(f"{BASE_URL}/api/users", json={
            "email": email,
            "password": "Trainer2026!",
            "name": "TEST Entrenador",
            "role": "entrenador",
            "sst_license": "SST-9999",
        }, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "entrenador"
        state["trainer_id"] = data["id"]
        state["trainer_email"] = email

    def test_list_trainers(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/users?role=entrenador", timeout=15)
        assert r.status_code == 200
        ids = [u["id"] for u in r.json()]
        assert state["trainer_id"] in ids


# ============== LEARNERS ==============
class TestLearners:
    def test_create_learner(self, admin_session, state):
        doc_num = f"CC{UNIQUE}1"
        r = admin_session.post(f"{BASE_URL}/api/learners", json={
            "first_name": "Pedro",
            "last_name": "TEST_Gomez",
            "document_type": "CC",
            "document_number": doc_num,
            "company_id": state["company_id"],
            "phone": "3009999999",
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["document_number"] == doc_num
        state["learner_id"] = data["id"]
        state["learner_doc"] = doc_num

    def test_learner_can_login_with_cedula(self, state):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"username": state["learner_doc"], "password": state["learner_doc"]}, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()
        assert u.get("role") == "aprendiz"
        assert "access_token" in s.cookies

    def test_create_second_learner(self, admin_session, state):
        doc_num = f"CC{UNIQUE}2"
        r = admin_session.post(f"{BASE_URL}/api/learners", json={
            "first_name": "Ana",
            "last_name": "TEST_Lopez",
            "document_type": "CC",
            "document_number": doc_num,
            "company_id": state["company_id"],
        }, timeout=15)
        assert r.status_code == 200
        state["learner2_id"] = r.json()["id"]


# ============== PROGRAMMING / GROUPS ==============
class TestProgramming:
    def test_program_course(self, admin_session, state):
        r = admin_session.post(f"{BASE_URL}/api/programming", json={
            "course_level": "TRABAJADOR_AUTORIZADO",
            "start_date": "2026-02-10",
            "learner_ids": [state["learner_id"], state["learner2_id"]],
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "group_ids" in data and len(data["group_ids"]) >= 1
        state["group_id"] = data["group_ids"][0]

    def test_list_groups(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/groups", timeout=15)
        assert r.status_code == 200
        ids = [g["id"] for g in r.json()]
        assert state["group_id"] in ids

    def test_get_group_detail(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/groups/{state['group_id']}", timeout=15)
        assert r.status_code == 200
        g = r.json()
        assert g["course_level"] == "TRABAJADOR_AUTORIZADO"
        assert len(g["learners"]) == 2

    def test_assign_trainer(self, admin_session, state):
        r = admin_session.patch(f"{BASE_URL}/api/groups/{state['group_id']}/trainer",
                                json={"trainer_id": state["trainer_id"]}, timeout=15)
        assert r.status_code == 200


# ============== DOCUMENTS ==============
class TestDocuments:
    def test_upload_doc(self, admin_session, state):
        b64 = "data:text/plain;base64," + base64.b64encode(b"hello").decode()
        r = admin_session.post(f"{BASE_URL}/api/documents", json={
            "learner_id": state["learner_id"],
            "doc_type": "cedula",
            "file_name": "cedula.txt",
            "file_data": b64,
        }, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["status"] == "pendiente"
        state["doc_id"] = data["id"]

    def test_review_doc(self, admin_session, state):
        r = admin_session.patch(f"{BASE_URL}/api/documents/{state['doc_id']}/review",
                                json={"status": "aprobado", "review_note": "ok"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["status"] == "aprobado"


# ============== ATTENDANCE ==============
class TestAttendance:
    def test_register_attendance(self, admin_session, state):
        r = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "group_id": state["group_id"],
            "learner_id": state["learner_id"],
            "day_index": 0,
            "signature_data": "data:image/png;base64,AAAA",
            "note": "ok",
        }, timeout=15)
        assert r.status_code == 200

    def test_attendance_out_of_range_day(self, admin_session, state):
        r = admin_session.post(f"{BASE_URL}/api/attendance", json={
            "group_id": state["group_id"],
            "learner_id": state["learner_id"],
            "day_index": 99,
        }, timeout=15)
        assert r.status_code == 400


# ============== CERTIFICATES ==============
class TestCertificates:
    def test_issue_certificate(self, admin_session, state):
        r = admin_session.post(f"{BASE_URL}/api/certificates/issue", json={
            "group_id": state["group_id"],
            "learner_id": state["learner_id"],
        }, timeout=30)
        assert r.status_code == 200, r.text
        cert = r.json()
        assert cert.get("cert_number", "").startswith("MG-")
        assert cert.get("pdf_b64")
        # verify it's a real PDF
        pdf_bytes = base64.b64decode(cert["pdf_b64"])
        assert pdf_bytes.startswith(b"%PDF")
        state["cert_id"] = cert["id"]
        state["cert_number"] = cert["cert_number"]

    def test_list_certificates(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/certificates", timeout=15)
        assert r.status_code == 200
        nums = [c["cert_number"] for c in r.json()]
        assert state["cert_number"] in nums

    def test_get_certificate_pdf(self, admin_session, state):
        r = admin_session.get(f"{BASE_URL}/api/certificates/{state['cert_id']}/pdf", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["file_name"].endswith(".pdf")
        assert base64.b64decode(d["pdf_b64"]).startswith(b"%PDF")


# ============== PUBLIC ENDPOINTS ==============
class TestPublic:
    def test_public_lookup(self, state):
        r = requests.get(f"{BASE_URL}/api/public/lookup",
                         params={"document_number": state["learner_doc"]}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["found"] is True
        nums = [c["cert_number"] for c in data["certificates"]]
        assert state["cert_number"] in nums

    def test_public_lookup_not_found(self):
        r = requests.get(f"{BASE_URL}/api/public/lookup",
                         params={"document_number": "DOES_NOT_EXIST_99999"}, timeout=15)
        assert r.status_code == 200
        assert r.json()["found"] is False

    def test_public_verify(self, state):
        r = requests.get(f"{BASE_URL}/api/public/verify/{state['cert_number']}", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] is True
        assert data["cert_number"] == state["cert_number"]

    def test_public_verify_invalid(self):
        r = requests.get(f"{BASE_URL}/api/public/verify/MG-2026-FAKEFAKE", timeout=15)
        assert r.status_code == 200
        assert r.json()["valid"] is False


# ============== STATS ==============
def test_stats_dashboard(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/stats/dashboard", timeout=15)
    assert r.status_code == 200
    s = r.json()
    for k in ["companies", "learners", "trainers", "groups_active",
              "certificates", "pending_docs", "recent_certificates"]:
        assert k in s, f"missing dashboard key: {k}"
    assert isinstance(s["recent_certificates"], list)


# ============== RBAC ==============
class TestRBAC:
    def test_trainer_cannot_create_company(self, state):
        # Login as trainer
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"username": state["trainer_email"], "password": "Trainer2026!"}, timeout=15)
        assert r.status_code == 200
        r2 = s.post(f"{BASE_URL}/api/companies", json={
            "name": "Hack", "nit": f"HACK{UNIQUE}", "legal_representative": "x", "arl": "x",
        }, timeout=15)
        assert r2.status_code == 403

    def test_learner_only_sees_self(self, state):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login",
                   json={"username": state["learner_doc"], "password": state["learner_doc"]}, timeout=15)
        assert r.status_code == 200
        r2 = s.get(f"{BASE_URL}/api/learners", timeout=15)
        assert r2.status_code == 200
        learners = r2.json()
        # learner can only see themselves at most
        assert len(learners) <= 1
