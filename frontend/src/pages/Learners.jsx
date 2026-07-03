import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Users, Trash2, Search, Eye, Pencil, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const EMPTY = {
  first_name: "", last_name: "", document_type: "CC", document_number: "",
  labor: "", literacy_level: "Lectoescritura completa", education_level: "",
  blood_group: "O", rh: "+", birth_date: "", phone: "",
  allergies: "", medications: "", injuries: "", illnesses: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  gender: "M", country: "Colombia", economic_sector: "",
  company_id: "",
};

const DOC_TYPES = [
  { code: "cedula", label: "Copia de cédula" },
  { code: "examen_medico", label: "Examen médico para trabajo en alturas" },
  { code: "seguridad_social", label: "Seguridad social" },
  { code: "certificado_alturas", label: "Copia de certificado de alturas" },
];

const EMPTY_DOCS = { cedula: null, examen_medico: null, seguridad_social: null, certificado_alturas: null };

export default function Learners() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [docs, setDocs] = useState(EMPTY_DOCS);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [companyName, setCompanyName] = useState("");

  const load = async () => {
    const { data } = await api.get("/learners", { params: q ? { q } : {} });
    setItems(data);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  useEffect(() => {
    if (user.role === "super_admin") {
      api.get("/companies").then(({ data }) => setCompanies(data));
    } else if (user.company_id) {
      setForm((f) => ({ ...f, company_id: user.company_id }));
    }
  }, [user]);

  const openCreate = () => {
    setEditingId(null);
    setCompanyName("");
    setForm({ ...EMPTY, company_id: user.role === "super_admin" ? "" : user.company_id || "" });
    setDocs(EMPTY_DOCS);
    setOpen(true);
  };

  const fillFormFromLearner = (l) => ({
    first_name: l.first_name || "", last_name: l.last_name || "",
    document_type: l.document_type || "CC", document_number: l.document_number || "",
    labor: l.labor || "", literacy_level: l.literacy_level || "",
    education_level: l.education_level || "", blood_group: l.blood_group || "O",
    rh: l.rh || "+", birth_date: l.birth_date || "", phone: l.phone || "",
    allergies: l.allergies || "", medications: l.medications || "",
    injuries: l.injuries || "", illnesses: l.illnesses || "",
    emergency_contact_name: l.emergency_contact_name || "",
    emergency_contact_phone: l.emergency_contact_phone || "",
    gender: l.gender || "M", country: l.country || "Colombia",
    economic_sector: l.economic_sector || "", company_id: l.company_id || "",
  });

  const openEdit = (l) => {
    setEditingId(l.id);
    setCompanyName(l.company_name || "");
    setForm(fillFormFromLearner(l));
    setDocs(EMPTY_DOCS);
    setOpen(true);
  };

  const checkExistingDocument = async () => {
    if (editingId || !form.document_number) return;
    try {
      const { data } = await api.get("/learners", { params: { q: form.document_number } });
      const match = data.find((l) => l.document_number === form.document_number);
      if (match) {
        setEditingId(match.id);
        setCompanyName(match.company_name || "");
        setForm(fillFormFromLearner(match));
        toast.info("Esta cédula ya está registrada — se cargó la información existente para editarla.");
      }
    } catch { /* silencioso */ }
  };

  const onDocFile = (code, e) => {
    const f = e.target.files?.[0];
    if (!f) { setDocs((d) => ({ ...d, [code]: null })); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB por archivo"); return; }
    const reader = new FileReader();
    reader.onload = () => setDocs((d) => ({ ...d, [code]: { name: f.name, data: reader.result } }));
    reader.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let learnerId;
      if (editingId) {
        await api.patch(`/learners/${editingId}`, {
          first_name: form.first_name, last_name: form.last_name, labor: form.labor,
          literacy_level: form.literacy_level, education_level: form.education_level,
          blood_group: form.blood_group, rh: form.rh, birth_date: form.birth_date,
          phone: form.phone, allergies: form.allergies, medications: form.medications,
          injuries: form.injuries, illnesses: form.illnesses,
          emergency_contact_name: form.emergency_contact_name,
          emergency_contact_phone: form.emergency_contact_phone,
          gender: form.gender, country: form.country, economic_sector: form.economic_sector,
        });
        learnerId = editingId;
      } else {
        const { data: created } = await api.post("/learners", form);
        learnerId = created.id;
      }

      const pending = Object.entries(docs).filter(([, v]) => v);
      for (const [code, f] of pending) {
        try {
          await api.post("/documents", { learner_id: learnerId, doc_type: code, file_name: f.name, file_data: f.data });
        } catch (err) {
          toast.error(`No se pudo subir ${DOC_TYPES.find((t) => t.code === code)?.label}: ${formatApiError(err)}`);
        }
      }

      toast.success(editingId ? "Aprendiz actualizado" : "Aprendiz creado · login con cédula como usuario y contraseña");
      setOpen(false); setEditingId(null); setForm(EMPTY); setDocs(EMPTY_DOCS);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar aprendiz?")) return;
    await api.delete(`/learners/${id}`);
    toast.success("Eliminado"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-overline text-[#1E4484]">— Gestión</div>
          <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Aprendices</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cédula o nombre"
                   className="pl-9 w-72" data-testid="learner-search-input" />
          </div>
          <Button onClick={openCreate} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                  data-testid="learner-create-btn">
            <Plus className="w-4 h-4 mr-1" /> Nuevo aprendiz
          </Button>
        </div>
      </div>

      <Card className="border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-data">
            <thead className="bg-[#F1F5F9] text-[#737373] text-overline">
              <tr>
                <th className="text-left px-4 py-3">Documento</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">Labor</th>
                <th className="text-left px-4 py-3">Tel.</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length === 0 && (
                <tr><td colSpan="6" className="text-center py-10 text-[#737373]">
                  <Users className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2">No hay aprendices.</div>
                </td></tr>
              )}
              {items.map((l) => (
                <tr key={l.id} className="hover:bg-[#F8FAFC]" data-testid={`learner-row-${l.document_number}`}>
                  <td className="px-4 py-3 text-[#3D3D3D] font-mono-tabular">{l.document_type} {l.document_number}</td>
                  <td className="px-4 py-3 text-[#3D3D3D] font-medium">{l.first_name} {l.last_name}</td>
                  <td className="px-4 py-3 text-[#737373]">{l.company_name || "—"}</td>
                  <td className="px-4 py-3 text-[#737373]">{l.labor || "—"}</td>
                  <td className="px-4 py-3 text-[#737373]">{l.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDetail(l)} data-testid={`learner-view-${l.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {(user.role === "super_admin" || user.role === "empresa") && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(l)} data-testid={`learner-edit-${l.id}`}>
                          <Pencil className="w-4 h-4 text-[#1E4484]" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => remove(l.id)}>
                          <Trash2 className="w-4 h-4 text-[#DC2626]" />
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-2xl">
            {editingId ? "Editar aprendiz" : "Nuevo aprendiz"}
          </DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-2">
            <Section title="Identificación">
              <Two>
                <F label="Nombres"><Input required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} data-testid="learner-firstname-input" /></F>
                <F label="Apellidos"><Input required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} data-testid="learner-lastname-input" /></F>
                <F label="Tipo doc.">
                  <select disabled={!!editingId} className="w-full h-9 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white disabled:bg-[#F1F5F9]"
                          value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
                    {["CC", "TI", "CE", "PEP"].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </F>
                <F label="N° documento">
                  <Input required disabled={!!editingId} value={form.document_number}
                         onChange={(e) => setForm({ ...form, document_number: e.target.value })}
                         onBlur={checkExistingDocument}
                         data-testid="learner-docnum-input" />
                </F>
                <F label="Género">
                  <select className="w-full h-9 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                          value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                    <option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
                  </select>
                </F>
                <F label="Fecha nacimiento"><Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} /></F>
                <F label="País"><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></F>
                <F label="Teléfono"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></F>
              </Two>
            </Section>

            <Section title="Datos médicos">
              <Two>
                <F label="Grupo sanguíneo">
                  <select className="w-full h-9 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                          value={form.blood_group} onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                    {["O", "A", "B", "AB"].map((v) => <option key={v}>{v}</option>)}
                  </select>
                </F>
                <F label="RH">
                  <select className="w-full h-9 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                          value={form.rh} onChange={(e) => setForm({ ...form, rh: e.target.value })}>
                    <option>+</option><option>-</option>
                  </select>
                </F>
                <F label="Alergias"><Input value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })} /></F>
                <F label="Medicamentos recientes"><Input value={form.medications} onChange={(e) => setForm({ ...form, medications: e.target.value })} /></F>
                <F label="Lesiones recientes"><Input value={form.injuries} onChange={(e) => setForm({ ...form, injuries: e.target.value })} /></F>
                <F label="Enfermedades actuales"><Input value={form.illnesses} onChange={(e) => setForm({ ...form, illnesses: e.target.value })} /></F>
              </Two>
            </Section>

            <Section title="Laboral / Educación">
              <Two>
                <F label="Labor que desarrolla"><Input value={form.labor} onChange={(e) => setForm({ ...form, labor: e.target.value })} /></F>
                <F label="Sector económico"><Input value={form.economic_sector} onChange={(e) => setForm({ ...form, economic_sector: e.target.value })} /></F>
                <F label="Nivel de formación"><Input value={form.education_level} onChange={(e) => setForm({ ...form, education_level: e.target.value })} /></F>
                <F label="Nivel lectoescritura"><Input value={form.literacy_level} onChange={(e) => setForm({ ...form, literacy_level: e.target.value })} /></F>
                <F label="Empresa">
                  {editingId
                    ? <Input disabled value={companyName} />
                    : user.role === "super_admin"
                      ? (
                        <select required className="w-full h-9 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                                value={form.company_id} onChange={(e) => setForm({ ...form, company_id: e.target.value })}
                                data-testid="learner-company-select">
                          <option value="">— Selecciona —</option>
                          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      )
                      : <Input disabled value={companies.find((c) => c.id === user.company_id)?.name || ""} />}
                </F>
              </Two>
            </Section>

            <Section title="Contacto de emergencia">
              <Two>
                <F label="Nombre"><Input value={form.emergency_contact_name} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></F>
                <F label="Teléfono"><Input value={form.emergency_contact_phone} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></F>
              </Two>
            </Section>

            <Section title="Documentos">
              <div className="grid sm:grid-cols-2 gap-3">
                {DOC_TYPES.map((t) => (
                  <div key={t.code}>
                    <Label className="text-xs flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-[#1E4484]" /> {t.label}
                    </Label>
                    <Input type="file" accept="application/pdf,image/*"
                           onChange={(e) => onDocFile(t.code, e)}
                           data-testid={`learner-doc-${t.code}-input`} />
                    {docs[t.code] && (
                      <div className="text-xs text-[#16A34A] mt-1">✓ {docs[t.code].name}</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-[#737373] mt-2">
                Opcional — también puedes subirlos o revisarlos después desde la pestaña <strong>Documentos</strong>. Máx. 5MB por archivo.
              </div>
            </Section>

            {!editingId && (
              <div className="text-xs text-[#737373] bg-[#F1F5F9] border border-[#E2E8F0] p-3 rounded-md font-data">
                Al crearse, el aprendiz podrá iniciar sesión con su número de cédula como <strong>usuario</strong> y como <strong>contraseña inicial</strong>.
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                      data-testid="learner-submit-btn">
                {loading ? "Guardando…" : editingId ? "Guardar cambios" : "Crear aprendiz"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{detail.first_name} {detail.last_name}</DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 gap-3 mt-3 font-data text-sm">
                {Object.entries({
                  "Documento": `${detail.document_type} ${detail.document_number}`,
                  "Empresa": detail.company_name,
                  "Labor": detail.labor,
                  "Teléfono": detail.phone,
                  "Grupo sanguíneo": `${detail.blood_group}${detail.rh}`,
                  "Fecha nacimiento": detail.birth_date,
                  "Alergias": detail.allergies,
                  "Medicamentos": detail.medications,
                  "Lesiones": detail.injuries,
                  "Enfermedades": detail.illnesses,
                  "Contacto emergencia": `${detail.emergency_contact_name || ""} ${detail.emergency_contact_phone || ""}`,
                }).map(([k, v]) => (
                  <div key={k}>
                    <div className="text-overline text-[#737373]">{k}</div>
                    <div className="text-[#3D3D3D]">{v || "—"}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="text-overline text-[#1E4484] mb-2">— {title}</div>
      {children}
    </div>
  );
}
function Two({ children }) { return <div className="grid sm:grid-cols-2 gap-3">{children}</div>; }
function F({ label, children }) { return <div><Label className="text-xs">{label}</Label>{children}</div>; }
