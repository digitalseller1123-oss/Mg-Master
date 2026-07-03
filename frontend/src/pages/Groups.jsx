import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Layers, Users, UserCheck, Award, ClipboardCheck, X, UserPlus, Search } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import api, { formatApiError } from "../lib/api";

const LEVEL_COLOR = {
  REENTRENAMIENTO_4272: "bg-[#16A34A]",
  TRABAJADOR_AUTORIZADO: "bg-[#1E4484]",
  COORDINADOR_4272: "bg-[#004DA6]",
  ADMINISTRATIVO_JEFES: "bg-[#3D3D3D]",
};

export default function Groups() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [assigning, setAssigning] = useState(null);
  const [trainerId, setTrainerId] = useState("");
  const [issuing, setIssuing] = useState(false);

  const [addingTo, setAddingTo] = useState(null);
  const [allLearners, setAllLearners] = useState([]);
  const [addQuery, setAddQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [addLoading, setAddLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/groups");
    setItems(data);
  };

  useEffect(() => {
    load();
    if (user.role === "super_admin") {
      api.get("/users", { params: { role: "entrenador" } }).then(({ data }) => setTrainers(data));
    }
  }, [user]);

  const openDetail = async (id) => {
    const { data } = await api.get(`/groups/${id}`);
    setDetail(data);
  };

  const assignTrainer = async () => {
    if (!trainerId) return;
    try {
      await api.patch(`/groups/${assigning}/trainer`, { trainer_id: trainerId });
      toast.success("Entrenador asignado");
      setAssigning(null); setTrainerId(""); load();
      if (detail?.id === assigning) openDetail(assigning);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const issueCert = async (learnerId) => {
    if (!detail) return;
    setIssuing(true);
    try {
      const { data } = await api.post("/certificates/issue", {
        group_id: detail.id, learner_id: learnerId,
      });
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdf_b64}`;
      link.download = `${data.cert_number}.pdf`;
      link.click();
      toast.success(`Certificado ${data.cert_number} emitido`);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setIssuing(false); }
  };

  const removeLearner = async (lid) => {
    if (!window.confirm("¿Retirar aprendiz del grupo?")) return;
    try {
      await api.delete(`/groups/${detail.id}/learners/${lid}`);
      openDetail(detail.id); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const openAddLearners = async (groupId) => {
    setAddingTo(groupId);
    setSelected(new Set());
    setAddQuery("");
    try {
      const { data } = await api.get("/learners");
      setAllLearners(data);
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const toggleSelected = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const submitAddLearners = async () => {
    if (selected.size === 0) return;
    setAddLoading(true);
    try {
      const { data } = await api.post(`/groups/${addingTo}/learners`, {
        learner_ids: Array.from(selected),
      });
      toast.success(`${data.count} aprendiz(es) agregado(s) al grupo`);
      setAddingTo(null);
      load();
      if (detail?.id === addingTo) openDetail(addingTo);
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setAddLoading(false); }
  };

  const currentGroupLearnerIds = new Set((detail?.id === addingTo ? detail?.learners : [])?.map((l) => l.id) || []);
  const availableLearners = allLearners.filter((l) => {
    if (currentGroupLearnerIds.has(l.id)) return false;
    if (!addQuery) return true;
    const s = addQuery.toLowerCase();
    return (
      l.first_name?.toLowerCase().includes(s) ||
      l.last_name?.toLowerCase().includes(s) ||
      l.document_number?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="text-overline text-[#1E4484]">— Operación</div>
        <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Grupos de curso</h1>
      </div>

      {items.length === 0 ? (
        <Card className="border-[#E2E8F0] p-10 text-center text-[#737373]">
          <Layers className="w-10 h-10 mx-auto text-[#E2E8F0]" />
          <div className="mt-3">Aún no hay grupos programados.</div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((g) => (
            <Card key={g.id} className="border-[#E2E8F0] overflow-hidden mg-card-hover" data-testid={`group-card-${g.id}`}>
              <div className={`${LEVEL_COLOR[g.course_level] || "bg-[#1E4484]"} text-white p-4`}>
                <div className="text-overline text-white/70">Grupo {g.group_index}</div>
                <div className="font-display text-lg mt-1 leading-tight">{g.course_name}</div>
              </div>
              <div className="p-4 space-y-3 font-data text-sm">
                <Row icon={Layers} label="Inicio" value={g.start_date} />
                <Row icon={Users} label="Aprendices" value={`${g.learners_count} / 30`} />
                <Row icon={UserCheck} label="Entrenador" value={g.trainer_name || "Sin asignar"} />
                <div className="text-xs text-[#737373]">
                  {g.course_hours} horas · {g.course_days} día(s)
                </div>
                <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] flex-wrap">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetail(g.id)} data-testid={`group-open-${g.id}`}>
                    Ver detalle
                  </Button>
                  {(user.role === "super_admin" || user.role === "empresa") && (
                    <Button variant="outline" size="sm" onClick={() => openAddLearners(g.id)} data-testid={`group-add-learners-${g.id}`}>
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  )}
                  {user.role === "super_admin" && (
                    <Button size="sm" className="bg-[#1E4484] hover:bg-[#173566] text-white"
                            onClick={() => { setAssigning(g.id); setTrainerId(g.trainer_id || ""); }}
                            data-testid={`group-assign-${g.id}`}>
                      Entrenador
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">
                  {detail.course_name} · Grupo {detail.group_index}
                </DialogTitle>
              </DialogHeader>
              <div className="grid sm:grid-cols-3 gap-3 mt-2 font-data text-sm">
                <Field label="Inicio" value={detail.start_date} />
                <Field label="Duración" value={`${detail.course_hours}h / ${detail.course_days}d`} />
                <Field label="Entrenador" value={detail.trainer?.name || "Sin asignar"} />
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-overline text-[#1E4484]">Aprendices ({detail.learners?.length || 0} / 30)</div>
                  {(user.role === "super_admin" || user.role === "empresa") && (
                    <Button size="sm" variant="outline" onClick={() => openAddLearners(detail.id)}
                            data-testid="group-detail-add-learners">
                      <UserPlus className="w-4 h-4 mr-1" /> Agregar aprendices
                    </Button>
                  )}
                </div>
                <div className="border border-[#E2E8F0] rounded-md divide-y divide-[#E2E8F0]">
                  {(detail.learners || []).length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-[#737373]">Sin aprendices en este grupo aún.</div>
                  )}
                  {(detail.learners || []).map((l) => (
                    <div key={l.id} className="px-4 py-3 flex items-center justify-between text-sm font-data">
                      <div>
                        <div className="text-[#3D3D3D] font-medium">{l.first_name} {l.last_name}</div>
                        <div className="text-xs text-[#737373]">{l.document_type} {l.document_number}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role === "entrenador" && detail.trainer_id === user.id && (
                          <Link to={`/app/attendance?group=${detail.id}&learner=${l.id}`}>
                            <Button variant="outline" size="sm">
                              <ClipboardCheck className="w-4 h-4 mr-1" /> Asistencia
                            </Button>
                          </Link>
                        )}
                        {user.role === "super_admin" && (
                          <>
                            <Button size="sm" variant="outline" disabled={issuing}
                                    onClick={() => issueCert(l.id)} data-testid={`issue-cert-${l.id}`}>
                              <Award className="w-4 h-4 mr-1" /> Certificado
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeLearner(l.id)}>
                              <X className="w-4 h-4 text-[#DC2626]" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigning} onOpenChange={(v) => !v && setAssigning(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl">Asignar entrenador</DialogTitle></DialogHeader>
          <select className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white mt-2"
                  value={trainerId} onChange={(e) => setTrainerId(e.target.value)} data-testid="assign-trainer-select">
            <option value="">— Selecciona —</option>
            {trainers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAssigning(null)}>Cancelar</Button>
            <Button onClick={assignTrainer} className="bg-[#1E4484] hover:bg-[#173566] text-white" data-testid="assign-trainer-submit">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingTo} onOpenChange={(v) => !v && setAddingTo(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">Agregar aprendices al grupo</DialogTitle></DialogHeader>
          <div className="relative mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <Input value={addQuery} onChange={(e) => setAddQuery(e.target.value)}
                   placeholder="Buscar por nombre o cédula" className="pl-9" />
          </div>
          <div className="border border-[#E2E8F0] rounded-md divide-y divide-[#E2E8F0] mt-3 max-h-80 overflow-y-auto">
            {availableLearners.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-[#737373]">No hay aprendices disponibles para agregar.</div>
            )}
            {availableLearners.map((l) => (
              <label key={l.id} className="px-4 py-2.5 flex items-center gap-3 text-sm font-data cursor-pointer hover:bg-[#F8FAFC]">
                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelected(l.id)}
                       className="w-4 h-4" data-testid={`add-learner-check-${l.id}`} />
                <div className="flex-1">
                  <div className="text-[#3D3D3D] font-medium">{l.first_name} {l.last_name}</div>
                  <div className="text-xs text-[#737373]">{l.document_type} {l.document_number} · {l.company_name || "—"}</div>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddingTo(null)}>Cancelar</Button>
            <Button onClick={submitAddLearners} disabled={addLoading || selected.size === 0}
                    className="bg-[#1E4484] hover:bg-[#173566] text-white" data-testid="add-learners-submit">
              {addLoading ? "Agregando…" : `Agregar (${selected.size})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-[#737373]" />
      <span className="text-[#737373] text-xs flex-1">{label}</span>
      <span className="text-[#3D3D3D] font-medium">{value}</span>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-md p-3">
      <div className="text-overline text-[#737373]">{label}</div>
      <div className="text-[#3D3D3D] mt-1">{value || "—"}</div>
    </div>
  );
}
