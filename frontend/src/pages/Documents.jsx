import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { FileCheck2, Upload, Check, X, Eye } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const DOC_TYPES = [
  { code: "cedula", label: "Cédula" },
  { code: "examen_medico", label: "Examen médico de alturas" },
  { code: "seguridad_social", label: "Seguridad social" },
  { code: "certificado_alturas", label: "Certificado previo de alturas" },
];

const STATUS_BADGE = {
  pendiente: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/30",
  aprobado: "bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30",
  rechazado: "bg-[#DC2626]/10 text-[#DC2626] border-[#DC2626]/30",
};

export default function Documents() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [learners, setLearners] = useState([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [learnerId, setLearnerId] = useState("");
  const [docType, setDocType] = useState("cedula");
  const [file, setFile] = useState(null);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [previewing, setPreviewing] = useState(null);

  const load = async () => {
    const { data } = await api.get("/documents");
    setItems(data);
  };
  useEffect(() => {
    load();
    if (user.role !== "aprendiz") {
      api.get("/learners").then(({ data }) => setLearners(data));
    }
  }, [user]);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return setFile(null);
    if (f.size > 5 * 1024 * 1024) { toast.error("Máximo 5MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setFile({ name: f.name, data: reader.result });
    reader.readAsDataURL(f);
  };

  const submitUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Selecciona un archivo"); return; }
    const lid = user.role === "aprendiz" ? user.learner_id : learnerId;
    if (!lid) { toast.error("Selecciona un aprendiz"); return; }
    try {
      await api.post("/documents", {
        learner_id: lid, doc_type: docType,
        file_name: file.name, file_data: file.data,
      });
      toast.success("Documento cargado");
      setUploadOpen(false); setFile(null); setLearnerId(""); setDocType("cedula");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const review = async (status) => {
    try {
      await api.patch(`/documents/${reviewing.id}/review`, { status, review_note: reviewNote });
      toast.success(`Documento ${status}`);
      setReviewing(null); setReviewNote(""); load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const openPreview = async (d) => {
    try {
      const { data } = await api.get(`/documents/${d.id}/file`);
      setPreviewing({ ...d, ...data });
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-overline text-[#1E4484]">— Validación</div>
          <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Documentos</h1>
        </div>
        <Button onClick={() => setUploadOpen(true)} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                data-testid="doc-upload-btn">
          <Upload className="w-4 h-4 mr-1" /> Subir documento
        </Button>
      </div>

      <Card className="border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-data">
            <thead className="bg-[#F1F5F9] text-[#737373] text-overline">
              <tr>
                <th className="text-left px-4 py-3">Aprendiz</th>
                <th className="text-left px-4 py-3">Documento</th>
                <th className="text-left px-4 py-3">Archivo</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length === 0 && (
                <tr><td colSpan="5" className="text-center py-10 text-[#737373]">
                  <FileCheck2 className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2">Sin documentos.</div>
                </td></tr>
              )}
              {items.map((d) => {
                const learner = learners.find((l) => l.id === d.learner_id);
                return (
                  <tr key={d.id} className="hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 text-[#3D3D3D]">
                      {learner ? `${learner.first_name} ${learner.last_name}` : d.learner_id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-[#737373]">{d.doc_label}</td>
                    <td className="px-4 py-3 text-[#737373] truncate max-w-[200px]">{d.file_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded border ${STATUS_BADGE[d.status]}`} data-testid={`doc-status-${d.id}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => openPreview(d)} data-testid={`doc-view-${d.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {user.role === "super_admin" && d.status === "pendiente" && (
                        <Button variant="ghost" size="sm" onClick={() => { setReviewing(d); setReviewNote(""); }}
                                data-testid={`doc-review-${d.id}`}>
                          Revisar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-xl">Subir documento</DialogTitle></DialogHeader>
          <form onSubmit={submitUpload} className="space-y-3 mt-2">
            {user.role !== "aprendiz" && (
              <div>
                <Label>Aprendiz</Label>
                <select required className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                        value={learnerId} onChange={(e) => setLearnerId(e.target.value)} data-testid="doc-learner-select">
                  <option value="">— Selecciona —</option>
                  {learners.map((l) => (
                    <option key={l.id} value={l.id}>{l.document_number} · {l.first_name} {l.last_name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <Label>Tipo de documento</Label>
              <select className="w-full h-10 rounded-md border border-[#E2E8F0] px-3 font-data text-sm bg-white"
                      value={docType} onChange={(e) => setDocType(e.target.value)} data-testid="doc-type-select">
                {DOC_TYPES.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <Label>Archivo (PDF / Imagen — máx 5MB)</Label>
              <Input type="file" accept="application/pdf,image/*" onChange={onFile} required data-testid="doc-file-input" />
              {file && <div className="text-xs text-[#737373] mt-1">{file.name}</div>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-[#1E4484] hover:bg-[#173566] text-white" data-testid="doc-submit-btn">
                Subir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewing} onOpenChange={(v) => !v && setReviewing(null)}>
        <DialogContent>
          {reviewing && (
            <>
              <DialogHeader><DialogTitle className="font-display text-xl">Revisar documento</DialogTitle></DialogHeader>
              <div className="space-y-2 mt-2 text-sm">
                <div><strong>Documento:</strong> {reviewing.doc_label}</div>
                <div><strong>Archivo:</strong> {reviewing.file_name}</div>
                <Label className="mt-3">Nota de revisión (opcional)</Label>
                <Input value={reviewNote} onChange={(e) => setReviewNote(e.target.value)}
                       placeholder="Motivo o comentario" data-testid="doc-review-note" />
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => review("rechazado")} className="text-[#DC2626] border-[#DC2626]/30"
                        data-testid="doc-reject-btn">
                  <X className="w-4 h-4 mr-1" /> Rechazar
                </Button>
                <Button onClick={() => review("aprobado")} className="bg-[#16A34A] hover:bg-[#138438] text-white"
                        data-testid="doc-approve-btn">
                  <Check className="w-4 h-4 mr-1" /> Aprobar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewing} onOpenChange={(v) => !v && setPreviewing(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {previewing && (
            <>
              <DialogHeader><DialogTitle className="font-display text-xl">{previewing.file_name}</DialogTitle></DialogHeader>
              <div className="overflow-auto max-h-[70vh]">
                {previewing.file_data?.startsWith("data:image") ? (
                  <img src={previewing.file_data} alt={previewing.file_name} className="w-full" />
                ) : (
                  <iframe src={previewing.file_data} title="preview" className="w-full h-[70vh]" />
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
