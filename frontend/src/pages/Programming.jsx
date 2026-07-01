import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { BookOpen, Check } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

export default function Programming() {
  const { user } = useAuth();
  const [levels, setLevels] = useState([]);
  const [learners, setLearners] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [level, setLevel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/course-levels").then(({ data }) => setLevels(data));
    if (user.role === "super_admin") {
      api.get("/companies").then(({ data }) => setCompanies(data));
    }
  }, [user]);

  useEffect(() => {
    const params = {};
    if (user.role === "super_admin" && companyId) params.company_id = companyId;
    api.get("/learners", { params }).then(({ data }) => setLearners(data));
  }, [companyId, user]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!level || !startDate) { toast.error("Selecciona nivel y fecha"); return; }
    if (selected.size === 0) { toast.error("Selecciona al menos un aprendiz"); return; }
    setSubmitting(true);
    try {
      const payload = {
        course_level: level,
        start_date: startDate,
        learner_ids: Array.from(selected),
      };
      if (user.role === "super_admin") payload.company_id = companyId || null;
      const { data } = await api.post("/programming", payload);
      toast.success(`Programado en ${data.group_ids.length} grupo(s)`);
      setSelected(new Set());
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSubmitting(false); }
  };

  const lvlMeta = levels.find((l) => l.code === level);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-overline text-[#1E4484]">— Operación</div>
        <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Programación de cursos</h1>
        <p className="text-sm text-[#737373] mt-2">
          Asigna aprendices a un nivel y fecha. El sistema crea grupos automáticos de máximo 30 personas.
        </p>
      </div>

      <Card className="border-[#E2E8F0] p-5">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {user.role === "super_admin" && (
              <div>
                <Label>Empresa</Label>
                <select className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                        value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                        data-testid="prog-company-select">
                  <option value="">— Todas —</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <Label>Nivel de curso</Label>
              <select required className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                      value={level} onChange={(e) => setLevel(e.target.value)} data-testid="prog-level-select">
                <option value="">— Selecciona —</option>
                {levels.map((l) => <option key={l.code} value={l.code}>{l.name} ({l.hours}h)</option>)}
              </select>
            </div>
            <div>
              <Label>Fecha de inicio</Label>
              <Input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)}
                     data-testid="prog-date-input" />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={submitting} className="w-full h-10 bg-[#1E4484] hover:bg-[#173566] text-white"
                      data-testid="prog-submit-btn">
                {submitting ? "Programando…" : `Programar (${selected.size})`}
              </Button>
            </div>
          </div>

          {lvlMeta && (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-4 font-data text-sm">
              <div className="text-overline text-[#1E4484] mb-2">Requisitos del curso</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <div><strong>{lvlMeta.hours}</strong> horas · <strong>{lvlMeta.days}</strong> día(s)</div>
                <div>Documentos requeridos:</div>
              </div>
              <ul className="mt-2 list-disc list-inside text-[#737373] text-xs">
                {lvlMeta.required_docs.map((d) => <li key={d}>{d.replace("_", " ")}</li>)}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Aprendices disponibles ({learners.length})</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set(learners.map((l) => l.id)))}>
                Seleccionar todos
              </Button>
            </div>
            <div className="border border-[#E2E8F0] rounded-md max-h-96 overflow-y-auto scrollbar-thin divide-y divide-[#E2E8F0]">
              {learners.length === 0 && (
                <div className="text-center py-10 text-[#737373]">
                  <BookOpen className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2 text-sm">No hay aprendices disponibles.</div>
                </div>
              )}
              {learners.map((l) => {
                const sel = selected.has(l.id);
                return (
                  <button type="button" key={l.id} onClick={() => toggle(l.id)}
                          data-testid={`prog-learner-${l.document_number}`}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${sel ? "bg-[#1E4484]/10" : "hover:bg-[#F8FAFC]"}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${sel ? "bg-[#1E4484] border-[#1E4484]" : "border-[#E2E8F0]"}`}>
                      {sel && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 font-data text-sm">
                      <div className="text-[#3D3D3D] font-medium">{l.first_name} {l.last_name}</div>
                      <div className="text-xs text-[#737373]">{l.document_type} {l.document_number} · {l.company_name || "—"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
