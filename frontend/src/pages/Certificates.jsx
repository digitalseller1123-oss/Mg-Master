import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Award, Download, Search } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

export default function Certificates() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  const load = async () => {
    const { data } = await api.get("/certificates", { params: q ? { q } : {} });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  const download = async (c) => {
    try {
      const { data } = await api.get(`/certificates/${c.id}/pdf`);
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdf_b64}`;
      link.download = data.file_name;
      link.click();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-overline text-[#1E4484]">— Emisión</div>
          <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Certificados</h1>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, cédula o N°"
                 className="pl-9 w-80" data-testid="cert-search-input" />
        </div>
      </div>

      <Card className="border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-data">
            <thead className="bg-[#F1F5F9] text-[#737373] text-overline">
              <tr>
                <th className="text-left px-4 py-3">N° Certificado</th>
                <th className="text-left px-4 py-3">Aprendiz</th>
                <th className="text-left px-4 py-3">Documento</th>
                <th className="text-left px-4 py-3">Curso</th>
                <th className="text-left px-4 py-3">Emitido</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length === 0 && (
                <tr><td colSpan="6" className="text-center py-10 text-[#737373]">
                  <Award className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2">Aún no se han emitido certificados.</div>
                </td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]" data-testid={`cert-row-${c.cert_number}`}>
                  <td className="px-4 py-3 text-[#1E4484] font-medium">{c.cert_number}</td>
                  <td className="px-4 py-3 text-[#3D3D3D]">{c.learner_name}</td>
                  <td className="px-4 py-3 text-[#737373] font-mono-tabular">{c.document_number}</td>
                  <td className="px-4 py-3 text-[#737373]">{c.course_name}</td>
                  <td className="px-4 py-3 text-[#737373]">{(c.issued_at || "").split("T")[0]}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => download(c)} data-testid={`cert-download-${c.cert_number}`}>
                      <Download className="w-4 h-4 mr-1" /> PDF
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-[#E2E8F0] p-4 bg-[#F8FAFC] flex items-start gap-3">
        <Award className="w-5 h-5 text-[#1E4484] shrink-0 mt-0.5" />
        <div className="text-sm text-[#737373] font-data">
          Los certificados se emiten desde el detalle de cada grupo (módulo <strong>Grupos</strong>). Cada certificado
          incluye <strong>código QR</strong> de validación pública con número único.
        </div>
      </Card>
    </div>
  );
}
