import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { CheckCircle2, XCircle, ArrowLeft, Shield } from "lucide-react";
import Logo from "../components/Logo";
import api from "../lib/api";

export default function VerifyCert() {
  const { cert_number } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/public/verify/${cert_number}`);
        setData(data);
      } finally { setLoading(false); }
    })();
  }, [cert_number]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="bg-[#0F0F10] border-b border-black/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size={36} textColor="text-white" />
          <Link to="/consulta" className="text-sm text-white/80 hover:text-white inline-flex items-center">
            <ArrowLeft className="w-4 h-4 mr-1" /> Consulta
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {loading && <div className="text-[#737373]">Verificando…</div>}
        {!loading && data && (
          <Card className="p-6 lg:p-10 border-[#E2E8F0]" data-testid="verify-result-card">
            <div className="flex items-center gap-4 mb-6">
              {data.valid ? (
                <CheckCircle2 className="w-12 h-12 text-[#16A34A]" />
              ) : (
                <XCircle className="w-12 h-12 text-[#DC2626]" />
              )}
              <div>
                <div className="text-overline text-[#737373]">Verificación oficial</div>
                <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">
                  {data.valid ? "Certificado válido" : "Certificado no encontrado"}
                </h1>
              </div>
            </div>
            {data.valid && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Aprendiz" value={data.learner?.name} />
                  <Field label="Documento" value={`${data.learner?.document_type} ${data.learner?.document_number}`} />
                  <Field label="Curso" value={data.course_name} />
                  <Field label="Intensidad" value={`${data.course_hours} horas`} />
                  <Field label="Inicio capacitación" value={data.start_date} />
                  <Field label="Fecha de expedición" value={(data.issued_at || "").split("T")[0]} />
                  <Field label="Empresa" value={data.company?.name || "—"} />
                  <Field label="NIT" value={data.company?.nit || "—"} />
                  <Field label="N° Certificado" value={data.cert_number} mono />
                </div>
                <div className="mt-8 flex items-start gap-3 bg-[#1E4484]/5 border border-[#1E4484]/20 rounded-md p-4 text-sm text-[#3D3D3D]">
                  <Shield className="w-5 h-5 text-[#1E4484] shrink-0 mt-0.5" />
                  <div>
                    Este registro es oficial y fue emitido por MG Master Group SAS, organismo certificador
                    autorizado bajo Res. 4272/2021 — NTC 6072:2014.
                  </div>
                </div>
              </>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div>
      <div className="text-overline text-[#737373]">{label}</div>
      <div className={`text-base text-[#3D3D3D] ${mono ? "font-data tracking-wide" : ""}`}>{value || "—"}</div>
    </div>
  );
}
