import { useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Search, ArrowLeft, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import Logo from "../components/Logo";
import api from "../lib/api";

export default function PublicCheck() {
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(""); setResult(null); setLoading(true);
    try {
      const { data } = await api.get(`/public/lookup`, { params: { document_number: doc.trim() } });
      setResult(data);
    } catch (e) {
      setError("No fue posible consultar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0F0F10] border-b border-black/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size={36} textColor="text-white" />
          <Link to="/" className="text-sm text-white/80 hover:text-white inline-flex items-center" data-testid="public-back-link">
            <ArrowLeft className="w-4 h-4 mr-1" /> Inicio
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="text-overline text-[#1E4484]">— Portal público</div>
        <h1 className="font-display text-4xl sm:text-5xl text-[#3D3D3D] mt-3">Consulta tu certificado</h1>
        <p className="mt-3 text-[#737373] max-w-2xl">
          Ingresa tu número de cédula para verificar los certificados emitidos por MG Master Group.
          Los resultados son oficiales y verificables ante terceros.
        </p>

        <Card className="mt-8 p-6 lg:p-8 border-[#E2E8F0]">
          <form onSubmit={onSubmit} className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <Label htmlFor="doc" className="text-[#3D3D3D]">Número de cédula</Label>
              <Input id="doc" data-testid="public-doc-input" value={doc}
                onChange={(e) => setDoc(e.target.value)} placeholder="Ej: 1023456789"
                className="mt-1 h-12 text-base" required />
            </div>
            <Button type="submit" disabled={loading || !doc.trim()} data-testid="public-search-btn"
              className="h-12 px-6 bg-[#1E4484] hover:bg-[#173566] text-white">
              <Search className="w-4 h-4 mr-2" />
              {loading ? "Consultando…" : "Consultar"}
            </Button>
          </form>
        </Card>

        {error && <div className="mt-6 text-sm text-red-700">{error}</div>}

        {result && (
          <Card className="mt-8 p-6 lg:p-8 border-[#E2E8F0]" data-testid="public-result-card">
            {!result.found ? (
              <div className="flex items-start gap-4">
                <XCircle className="w-8 h-8 text-[#DC2626] shrink-0" />
                <div>
                  <div className="font-display text-xl text-[#3D3D3D]">No encontramos certificados</div>
                  <p className="text-sm text-[#737373] mt-1">
                    No se hallaron registros para la cédula <strong>{doc}</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="w-8 h-8 text-[#16A34A] shrink-0" />
                  <div>
                    <div className="text-overline text-[#16A34A]">Resultado verificado</div>
                    <div className="font-display text-2xl text-[#3D3D3D] mt-1">
                      {result.learner.name}
                    </div>
                    <div className="text-sm text-[#737373] font-data">
                      {result.learner.document_type} {result.learner.document_number}
                    </div>
                  </div>
                </div>
                <div className="mt-6 border-t border-[#E2E8F0] pt-6">
                  <div className="text-overline text-[#737373] mb-3">Certificados emitidos ({result.certificates.length})</div>
                  {result.certificates.length === 0 ? (
                    <div className="text-sm text-[#737373]">Aún no se han emitido certificados.</div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {result.certificates.map((c) => (
                        <div key={c.cert_number} className="mg-card mg-card-hover p-4" data-testid={`public-cert-${c.cert_number}`}>
                          <div className="text-overline text-[#1E4484]">{c.cert_number}</div>
                          <div className="font-display text-base text-[#3D3D3D] mt-1 leading-tight">{c.course_name}</div>
                          <div className="text-xs text-[#737373] mt-2 font-data">
                            {c.course_hours} horas · Inicio {c.start_date}
                          </div>
                          <div className="text-xs text-[#737373] mt-1 font-data">
                            Emitido: {(c.issued_at || "").split("T")[0]}
                          </div>
                          <Link to={`/verify/${c.cert_number}`} className="mt-3 inline-flex items-center text-sm text-[#1E4484] hover:underline">
                            Ver detalle <ExternalLink className="w-3 h-3 ml-1" />
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
