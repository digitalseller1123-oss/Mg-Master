import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import Logo from "../components/Logo";
import { ArrowLeft, Lock, User } from "lucide-react";
import { toast } from "sonner";

const AUTH_BG = "https://static.prod-images.emergentagent.com/jobs/e8df2da8-8295-40d4-8cca-c6c767b32e0b/images/7cec7ade92e1ce4b5a52847a5069f238a8d771f3c653b21064b6e96a75cd3b28.png";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      toast.success("Bienvenido");
      nav("/app", { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.detail || "No fue posible iniciar sesión";
      toast.error(typeof msg === "string" ? msg : "Credenciales inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
      <div className="hidden lg:block relative overflow-hidden bg-[#0F0F10]">
        <img src={AUTH_BG} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E4484]/60 via-[#0F0F10]/85 to-[#0F0F10]" />
        <div className="relative h-full flex flex-col justify-between p-12 text-white">
          <Logo size={44} textColor="text-white" />
          <div>
            <div className="text-overline text-white/60 mb-3">— Plataforma SST</div>
            <h2 className="font-display text-4xl xl:text-5xl leading-tight">
              Gestión integral del<br />
              <span className="text-[#5B8DEF]">trabajo seguro</span> en alturas
            </h2>
            <p className="mt-4 text-white/70 max-w-md">
              Empresas, entrenadores y aprendices unidos en una sola plataforma.
              Certificados con validación pública mediante código QR.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { n: "4272", l: "Resolución" },
              { n: "NTC", l: "6072:2014" },
              { n: "QR", l: "Verificable" },
            ].map((s) => (
              <div key={s.l} className="border border-white/15 rounded-md p-3">
                <div className="font-display text-xl">{s.n}</div>
                <div className="text-xs text-white/60 mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="p-4 lg:p-6">
          <Link to="/" className="inline-flex items-center text-sm text-[#737373] hover:text-[#1E4484]" data-testid="back-home-link">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al inicio
          </Link>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md p-8 border-[#E2E8F0]">
            <div className="lg:hidden mb-6">
              <Logo size={36} textColor="text-[#3D3D3D]" />
            </div>
            <div className="text-overline text-[#1E4484]">— Acceso restringido</div>
            <h1 className="font-display text-3xl text-[#3D3D3D] mt-2">Iniciar sesión</h1>
            <p className="text-sm text-[#737373] mt-2">
              Ingrese con su <strong>email corporativo</strong> o <strong>número de cédula</strong> (aprendices).
            </p>
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="username" className="text-[#3D3D3D]">Usuario</Label>
                <div className="relative mt-1">
                  <User className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input id="username" data-testid="login-username-input"
                    value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="email o cédula" required autoFocus
                    className="pl-9 h-11" />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-[#3D3D3D]">Contraseña</Label>
                <div className="relative mt-1">
                  <Lock className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input id="password" type="password" data-testid="login-password-input"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" required className="pl-9 h-11" />
                </div>
              </div>
              <Button type="submit" disabled={loading} data-testid="login-submit-btn"
                className="w-full h-11 bg-[#1E4484] hover:bg-[#173566] text-white font-medium">
                {loading ? "Verificando…" : "Ingresar"}
              </Button>
            </form>
            <div className="mt-6 pt-6 border-t border-[#E2E8F0]">
              <div className="text-overline text-[#737373] mb-2">¿Necesita verificar un certificado?</div>
              <Link to="/consulta" className="text-sm text-[#1E4484] hover:underline" data-testid="login-public-consulta-link">
                Ir al portal público de consulta →
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
