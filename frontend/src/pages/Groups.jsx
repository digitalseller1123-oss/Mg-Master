import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Layers, Users, UserCheck, Award, ClipboardCheck, X } from "lucide-react";
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
      // open pdf
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
                <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openDetail(g.id)} data-testid={`group-open-${g.id}`}>
                    Ver detalle
                  </Button>
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
                <div className="text-overline text-[#1E4484] mb-2">Aprendices ({detail.learners?.length || 0})</div>
                <div className="border border-[#E2E8F0] rounded-md divide-y divide-[#E2E8F0]">
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
