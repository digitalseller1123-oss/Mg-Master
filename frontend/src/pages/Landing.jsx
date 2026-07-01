import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, BookOpen, Award, Search, Building2, ClipboardCheck, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import Logo from "../components/Logo";

const HERO_BG = "https://static.prod-images.emergentagent.com/jobs/e8df2da8-8295-40d4-8cca-c6c767b32e0b/images/506f46cd1b31033e505d702623d914fa6760ae0b43e9c6299aa2e627796c6580.png";
const FEATURE_TRAINING = "https://images.pexels.com/photos/12965141/pexels-photo-12965141.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const FEATURE_INDUSTRIAL = "https://images.pexels.com/photos/33914927/pexels-photo-33914927.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function Landing() {
  const nav = useNavigate();
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0F0F10]/95 backdrop-blur border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo size={36} textColor="text-white" />
          <div className="flex items-center gap-2">
            <Link to="/consulta" data-testid="header-consulta-link">
              <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
                <Search className="w-4 h-4 mr-1" /> Consulta tu certificado
              </Button>
            </Link>
            <Link to="/login" data-testid="header-login-link">
              <Button className="bg-[#1E4484] hover:bg-[#173566] text-white">
                Acceder
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={HERO_BG} alt="Trabajo seguro en alturas" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F10] via-[#0F0F10]/95 to-[#0F0F10]/60" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 text-overline text-white/80 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3DD68C]" /> Res. 4272/2021 MinTrabajo
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-tight tracking-tight font-bold">
              Capacitación certificada en
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#5B8DEF] to-[#2E6BD9]">
                Trabajo Seguro en Alturas
              </span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-white/70 max-w-2xl">
              Plataforma integral de MG Master Group para administrar empresas, aprendices, cursos,
              evaluaciones y certificados con validación pública mediante código QR.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-[#1E4484] hover:bg-[#173566] text-white"
                      onClick={() => nav("/login")} data-testid="hero-cta-acceder">
                Acceder al sistema <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                      onClick={() => nav("/consulta")} data-testid="hero-cta-consulta">
                <Search className="w-4 h-4 mr-2" /> Consultar certificado
              </Button>
            </div>
            <div className="mt-12 grid grid-cols-3 gap-6 max-w-xl">
              {[
                { n: "4", l: "Niveles de curso" },
                { n: "100%", l: "Verificación QR" },
                { n: "24/7", l: "Acceso digital" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-3xl text-white">{s.n}</div>
                  <div className="text-xs text-white/60 mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block lg:col-span-5">
            <div className="relative">
              <div className="absolute -inset-4 bg-[#1E4484]/30 blur-3xl rounded-full" />
              <div className="relative grid grid-cols-2 gap-4">
                <div className="mg-card bg-white/95 p-5">
                  <ShieldCheck className="w-8 h-8 text-[#1E4484]" />
                  <div className="mt-3 text-overline text-[#737373]">Compliance</div>
                  <div className="font-display text-lg text-[#3D3D3D] mt-1">Cumplimiento normativo</div>
                  <p className="text-xs text-[#737373] mt-2">Res. 4272 / NTC 6072:2014</p>
                </div>
                <div className="mg-card bg-[#1E4484] p-5 text-white mt-8">
                  <Award className="w-8 h-8" />
                  <div className="mt-3 text-overline text-white/70">Certificados</div>
                  <div className="font-display text-lg mt-1">QR de validación</div>
                  <p className="text-xs text-white/70 mt-2">Verificación pública por cédula</p>
                </div>
                <div className="mg-card bg-[#3D3D3D] p-5 text-white -mt-4">
                  <Building2 className="w-8 h-8" />
                  <div className="mt-3 text-overline text-white/60">Empresas</div>
                  <div className="font-display text-lg mt-1">Portal cliente</div>
                  <p className="text-xs text-white/60 mt-2">Programación y seguimiento</p>
                </div>
                <div className="mg-card bg-white/95 p-5">
                  <ClipboardCheck className="w-8 h-8 text-[#004DA6]" />
                  <div className="mt-3 text-overline text-[#737373]">Operación</div>
                  <div className="font-display text-lg text-[#3D3D3D] mt-1">Firma digital</div>
                  <p className="text-xs text-[#737373] mt-2">Compatible tablet y móvil</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-4">
            <div className="text-overline text-[#1E4484]">— Módulos del sistema</div>
            <h2 className="font-display text-3xl sm:text-4xl text-[#3D3D3D] mt-3 leading-tight">
              Todo lo que necesita un centro de entrenamiento profesional
            </h2>
            <p className="mt-4 text-[#737373]">
              Diseñado para escalar con su operación: empresas, entrenadores, aprendices y certificados
              gestionados desde un solo lugar.
            </p>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {[
              { icon: Building2, t: "Empresas clientes", d: "Alta, edición, NIT, ARL, representante legal." },
              { icon: Users, t: "Aprendices", d: "Ficha completa con datos médicos y de emergencia." },
              { icon: BookOpen, t: "Programación", d: "4 niveles 4272 — grupos automáticos máx. 30." },
              { icon: ShieldCheck, t: "Documentos", d: "Validación pendiente / aprobado / rechazado." },
              { icon: ClipboardCheck, t: "Asistencia & Firma", d: "Canvas táctil, huella y evidencia fotográfica." },
              { icon: Award, t: "Certificados QR", d: "PDF profesional con verificación pública." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="mg-card mg-card-hover p-5 bg-white">
                <Icon className="w-7 h-7 text-[#1E4484]" />
                <div className="font-display text-lg text-[#3D3D3D] mt-3">{t}</div>
                <p className="text-sm text-[#737373] mt-1 font-data">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image band */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="relative h-72 sm:h-96 overflow-hidden rounded-lg">
            <img src={FEATURE_TRAINING} alt="Capacitación industrial" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F10] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="text-overline text-white/70">Capacitación operativa</div>
              <div className="font-display text-xl mt-1">Formación práctica en campo</div>
            </div>
          </div>
          <div className="relative h-72 sm:h-96 overflow-hidden rounded-lg">
            <img src={FEATURE_INDUSTRIAL} alt="Trabajo en alturas" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1E4484] to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <div className="text-overline text-white/80">Trabajo seguro en alturas</div>
              <div className="font-display text-xl mt-1">Compromiso con la vida</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F0F10] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h3 className="font-display text-3xl sm:text-4xl">¿Listo para optimizar su gestión SST?</h3>
          <p className="mt-3 text-white/70">Acceda al sistema o consulte un certificado.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-[#1E4484] hover:bg-[#173566] text-white" onClick={() => nav("/login")}>
              Acceder al sistema
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"
                    onClick={() => nav("/consulta")}>
              <Search className="w-4 h-4 mr-2" /> Consultar certificado
            </Button>
          </div>
        </div>
      </section>

      <footer className="bg-[#0F0F10] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/60">
          <Logo size={32} textColor="text-white" />
          <div>© {new Date().getFullYear()} MG Master Group — Centro de Entrenamiento Autorizado</div>
        </div>
      </footer>
    </div>
  );
}
