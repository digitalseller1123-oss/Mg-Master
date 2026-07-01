import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "../components/ui/card";
import api from "../lib/api";
import { Building2, Users, ShieldCheck, Layers, Award, FileCheck2, BookOpen, AlertCircle } from "lucide-react";

const ICON = { companies: Building2, learners: Users, trainers: ShieldCheck, groups_active: Layers, groups: Layers, certificates: Award, pending_docs: FileCheck2 };
const LABEL = {
  companies: "Empresas",
  learners: "Aprendices",
  trainers: "Entrenadores",
  groups_active: "Grupos activos",
  groups: "Grupos",
  certificates: "Certificados emitidos",
  pending_docs: "Documentos pendientes",
};
const COLOR = {
  companies: "bg-[#1E4484]",
  learners: "bg-[#004DA6]",
  trainers: "bg-[#3D3D3D]",
  groups_active: "bg-[#1E4484]",
  groups: "bg-[#1E4484]",
  certificates: "bg-[#16A34A]",
  pending_docs: "bg-[#D97706]",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/stats/dashboard").then(({ data }) => setStats(data)).catch(() => setStats({}));
  }, []);

  if (!stats) return <div className="text-[#737373]">Cargando…</div>;

  const keys = Object.keys(stats).filter((k) => typeof stats[k] === "number");

  return (
    <div className="space-y-8" data-testid="dashboard-root">
      <div>
        <div className="text-overline text-[#1E4484]">— {user.role.replace("_", " ")}</div>
        <h1 className="font-display text-3xl sm:text-4xl text-[#3D3D3D] mt-2">
          Bienvenido, <span className="text-[#1E4484]">{user.name.split(" ")[0]}</span>
        </h1>
        <p className="text-sm text-[#737373] mt-2 font-data">
          Panel de control · {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {keys.map((k) => {
          const Icon = ICON[k] || Award;
          return (
            <Card key={k} className="p-5 border-[#E2E8F0] mg-card-hover" data-testid={`stat-${k}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-overline text-[#737373]">{LABEL[k] || k}</div>
                  <div className="font-display text-4xl text-[#3D3D3D] mt-2 font-mono-tabular">
                    {stats[k]}
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-md flex items-center justify-center ${COLOR[k] || "bg-[#1E4484]"}`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {stats.recent_certificates?.length > 0 && (
        <Card className="border-[#E2E8F0]">
          <div className="p-5 border-b border-[#E2E8F0]">
            <div className="text-overline text-[#737373]">— Actividad reciente</div>
            <h2 className="font-display text-xl text-[#3D3D3D] mt-1">Últimos certificados emitidos</h2>
          </div>
          <div className="divide-y divide-[#E2E8F0]">
            {stats.recent_certificates.map((c, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between text-sm font-data">
                <div>
                  <div className="text-[#3D3D3D]">{c.course_name}</div>
                  <div className="text-xs text-[#737373]">{c.cert_number}</div>
                </div>
                <div className="text-xs text-[#737373]">{(c.issued_at || "").split("T")[0]}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {stats.pending_docs > 0 && user.role === "super_admin" && (
        <Card className="p-5 border-[#D97706]/30 bg-[#D97706]/5 flex items-center gap-4">
          <AlertCircle className="w-6 h-6 text-[#D97706]" />
          <div className="flex-1">
            <div className="font-display text-base text-[#3D3D3D]">
              {stats.pending_docs} documento{stats.pending_docs > 1 ? "s" : ""} esperando revisión
            </div>
            <div className="text-xs text-[#737373]">Revisa el módulo de Documentos para aprobar o rechazar.</div>
          </div>
        </Card>
      )}
    </div>
  );
}
