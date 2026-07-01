# MG Master Group — Plataforma Integral de Gestión SST

## Problem Statement (original — Feb 2026)
Sistema web profesional y responsive para la administración integral del Centro de Entrenamiento "MG Master Group" (Trabajo Seguro en Alturas). Incluye gestión de empresas clientes, aprendices, programación de cursos (niveles 4272), generación de certificados con QR, firma digital, evaluaciones, permisos de trabajo, remisiones y portal público de consulta. Compatible con Res. 4272/2021 MinTrabajo y NTC 6072:2014.

## Stack
- Frontend: React 19 + Tailwind + shadcn/ui + react-router 7
- Backend: FastAPI (Python) + Motor (MongoDB async)
- Auth: JWT (cookies httpOnly secure samesite=none) + bcrypt
- PDF: ReportLab + QR (qrcode/PIL)
- Brand: Oswald (titulares), Roboto (cuerpo), Open Sans (formularios/tablas)
- Colores: #1E4484, #004DA6, #3D3D3D, #737373, #FFFFFF

## Roles (user personas)
1. **Super Admin** (MG Master Group): control total — empresas, entrenadores, aprendices, programación, documentos, certificados.
2. **Empresa cliente**: gestiona sus aprendices, programa cursos, sube documentos, consulta certificados.
3. **Entrenador**: ve sus grupos, registra asistencia + firma diaria.
4. **Aprendiz**: ve sus certificados/historial, descarga PDF. Login con cédula como usuario y contraseña inicial.

## P0 — Implementado en esta primera entrega (Feb 2026)
- [x] Autenticación JWT multi-rol (4 roles) con cookies seguras + bcrypt
- [x] Seed automático del Super Admin al iniciar (`admin@mgmastergroup.com` / `MGAdmin2026!`)
- [x] Auto-creación de cuenta de aprendiz al crear ficha (cédula = usuario = pass inicial)
- [x] CRUD Empresas (con creación opcional de cuenta usuario empresa)
- [x] CRUD Entrenadores (gestión por Super Admin)
- [x] CRUD Aprendices (ficha completa: datos personales, médicos, contacto emergencia)
- [x] Programación de cursos: 4 niveles 4272 con docs requeridos y horas
- [x] Grupos automáticos máx 30 personas (auto-incremento de grupo cuando se llena)
- [x] Asignación de entrenadores a grupos
- [x] Subida de documentos (PDF/imagen base64) con estados pendiente/aprobado/rechazado
- [x] Revisión de documentos (aprobar/rechazar + nota)
- [x] Asistencia diaria con firma digital táctil (canvas, compatible tablet/móvil)
- [x] Captura de huella + foto evidencia para personas que no firman
- [x] Generación de Certificados PDF con QR (ReportLab) y número único `MG-{año}-{hex}`
- [x] PDF de certificado incluye toda la info normativa: organismo, resolución, licencia SST, etc.
- [x] Portal público "Consulta tu certificado" por cédula
- [x] Verificación pública `/verify/{cert_number}`
- [x] Dashboard por rol con KPIs visuales
- [x] Landing page institucional + CTAs (login + consulta pública)
- [x] Responsive total (sidebar drawer en mobile, layouts adaptados)

## Próximos pasos (Backlog priorizado)

### P1 — Siguiente iteración
- [ ] Constructor de Evaluaciones dinámico (Falso/Verdadero, Selección múltiple, Apareamiento, Respuesta única)
- [ ] Banco de preguntas + temporizador + calificación automática
- [ ] Permisos de Trabajo en Alturas (checklist dinámico, hasta 10 personas, PDF)
- [ ] Remisiones por NIT (selección de aprendices, PDF con nombre/cédula/curso/fecha)
- [ ] Reportes/Consultas avanzadas (por cédula, NIT, rango fechas, nivel)
- [ ] Exportación CSV MinTrabajo + Excel/PDF
- [ ] Cambio de contraseña primer ingreso (forzar al aprendiz cambiar su cédula como pass)
- [ ] Alertas de vencimiento de certificados (1 año por nivel)
- [ ] Ficha PDF individual por aprendiz (asistencia + firmas + evidencias)

### P2 — Más adelante
- [ ] Modo oscuro completo (CSS variables ya preparadas)
- [ ] Integración de email (Resend/SendGrid) para notificaciones
- [ ] Logs de auditoría visualizables
- [ ] Respaldo automático
- [ ] Object Storage real (S3/MinIO) para PDFs grandes — actualmente base64 en MongoDB
- [ ] SEO + sitemap del landing institucional

## Credenciales de prueba
Ver `/app/memory/test_credentials.md`.

## Arquitectura de carpetas
```
backend/
  server.py              # Entry FastAPI
  app/
    db.py                # Mongo + helpers
    auth.py              # JWT, bcrypt, get_current_user, require_roles
    models.py            # Pydantic + COURSE_LEVELS catálogo
    seed.py              # Seed admin + indexes
    routes_auth.py       # /auth/*
    routes_entities.py   # /companies, /users
    routes_learners.py   # /learners
    routes_courses.py    # /programming, /groups, /documents, /attendance
    routes_certificates.py # /certificates, /public/*
    routes_stats.py      # /stats/dashboard

frontend/src/
  App.js                 # Router
  components/
    DashboardLayout.jsx  # Sidebar + topbar
    Logo.jsx
    ProtectedRoute.jsx
    SignaturePad.jsx     # Canvas táctil
    ui/                  # shadcn
  contexts/AuthContext.jsx
  lib/api.js             # axios withCredentials
  pages/
    Landing.jsx, Login.jsx, PublicCheck.jsx, VerifyCert.jsx
    Dashboard.jsx, Companies.jsx, Trainers.jsx, Learners.jsx
    Programming.jsx, Groups.jsx, Documents.jsx, Certificates.jsx, Attendance.jsx
```
