import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import SignaturePad from "../components/SignaturePad";
import { ClipboardCheck, Check, Camera, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

export default function Attendance() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(searchParams.get("group") || "");
  const [group, setGroup] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [dayIndex, setDayIndex] = useState(0);
  const [active, setActive] = useState(null); // learner being signed
  const sigRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const [fingerprint, setFingerprint] = useState(false);

  useEffect(() => {
    api.get("/groups").then(({ data }) => {
      setGroups(data);
      if (!groupId && data.length) setGroupId(data[0].id);
    });
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const { data: g } = await api.get(`/groups/${groupId}`);
      setGroup(g);
      const { data: att } = await api.get(`/attendance`, { params: { group_id: groupId } });
      const map = {};
      att.forEach((a) => { map[`${a.learner_id}_${a.day_index}`] = a; });
      setAttendance(map);
    })();
  }, [groupId]);

  const photoFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result);
    r.readAsDataURL(f);
  };

  const submitAttendance = async () => {
    if (!active) return;
    const sig = sigRef.current?.getDataUrl();
    if (!sig && !photo && !fingerprint) {
      toast.error("Captura al menos firma, huella o foto evidencia");
      return;
    }
    try {
      await api.post("/attendance", {
        group_id: groupId,
        learner_id: active.id,
        day_index: dayIndex,
        signature_data: sig || null,
        fingerprint_data: fingerprint ? "captured" : null,
        photo_evidence: photo || null,
      });
      toast.success("Asistencia registrada");
      // refresh
      const { data: att } = await api.get(`/attendance`, { params: { group_id: groupId } });
      const map = {};
      att.forEach((a) => { map[`${a.learner_id}_${a.day_index}`] = a; });
      setAttendance(map);
      setActive(null); setPhoto(null); setFingerprint(false);
      sigRef.current?.clear();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-overline text-[#1E4484]">— Operación</div>
        <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Asistencia y firma diaria</h1>
      </div>

      <Card className="border-[#E2E8F0] p-5">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label>Grupo</Label>
            <select className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                    value={groupId} onChange={(e) => setGroupId(e.target.value)} data-testid="att-group-select">
              <option value="">— Selecciona —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.course_name} · Grupo {g.group_index} · {g.start_date}
                </option>
              ))}
            </select>
          </div>
          {group && (
            <div>
              <Label>Día del curso</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {Array.from({ length: group.course_days || 1 }, (_, i) => (
                  <button key={i} type="button" onClick={() => setDayIndex(i)}
                          className={`px-3 h-9 rounded-md border text-sm font-data ${dayIndex === i ? "bg-[#1E4484] text-white border-[#1E4484]" : "border-[#E2E8F0] text-[#3D3D3D]"}`}
                          data-testid={`att-day-${i}`}>
                    Día {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {group && (
        <Card className="border-[#E2E8F0] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="text-overline text-[#1E4484]">{group.course_name}</div>
            <div className="font-display text-lg text-[#3D3D3D]">
              Grupo {group.group_index} — Día {dayIndex + 1}
            </div>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {(group.learners || []).map((l) => {
              const att = attendance[`${l.id}_${dayIndex}`];
              return (
                <div key={l.id} className="px-4 py-3 flex items-center justify-between text-sm font-data">
                  <div>
                    <div className="text-[#3D3D3D] font-medium">{l.first_name} {l.last_name}</div>
                    <div className="text-xs text-[#737373]">{l.document_type} {l.document_number}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {att ? (
                      <span className="text-xs text-[#16A34A] inline-flex items-center gap-1">
                        <Check className="w-4 h-4" /> Registrado
                      </span>
                    ) : (
                      (user.role === "super_admin" || (user.role === "entrenador" && group.trainer_id === user.id)) && (
                        <Button size="sm" onClick={() => setActive(l)} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                                data-testid={`att-sign-${l.document_number}`}>
                          <ClipboardCheck className="w-4 h-4 mr-1" /> Registrar firma
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
            {(group.learners || []).length === 0 && (
              <div className="text-center py-10 text-[#737373]">Sin aprendices en este grupo.</div>
            )}
          </div>
        </Card>
      )}

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-xl">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  Firma · {active.first_name} {active.last_name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="text-xs text-[#737373] font-data">
                  Día {dayIndex + 1} · {group?.course_name}
                </div>
                <div>
                  <Label className="text-[#3D3D3D]">Firma digital</Label>
                  <div className="mt-1"><SignaturePad ref={sigRef} /></div>
                </div>
                {active.can_sign === false && (
                  <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-[#E2E8F0]">
                    <div>
                      <Label>Huella dactilar</Label>
                      <Button type="button" variant={fingerprint ? "default" : "outline"} className={`mt-1 w-full ${fingerprint ? "bg-[#16A34A] hover:bg-[#138438] text-white" : ""}`}
                              onClick={() => setFingerprint(!fingerprint)}>
                        <Fingerprint className="w-4 h-4 mr-2" /> {fingerprint ? "Capturada" : "Capturar"}
                      </Button>
                    </div>
                    <div>
                      <Label>Foto evidencia</Label>
                      <Input type="file" accept="image/*" capture="environment" onChange={photoFile} className="mt-1" data-testid="att-photo-input" />
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setActive(null)}>Cancelar</Button>
                <Button onClick={submitAttendance} className="bg-[#1E4484] hover:bg-[#173566] text-white" data-testid="att-submit-btn">
                  Guardar asistencia
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
