import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const EMPTY = { email: "", password: "", name: "", phone: "", sst_license: "", role: "entrenador" };

export default function Trainers() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/users", { params: { role: "entrenador" } });
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/users", form);
      toast.success("Entrenador creado");
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar entrenador?")) return;
    await api.delete(`/users/${id}`);
    toast.success("Eliminado"); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-overline text-[#1E4484]">— Gestión</div>
          <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Entrenadores</h1>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                data-testid="trainer-create-btn">
          <Plus className="w-4 h-4 mr-1" /> Nuevo entrenador
        </Button>
      </div>

      <Card className="border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-data">
            <thead className="bg-[#F1F5F9] text-[#737373] text-overline">
              <tr>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3">Licencia SST</th>
                <th className="text-left px-4 py-3">Teléfono</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length === 0 && (
                <tr><td colSpan="5" className="text-center py-10 text-[#737373]">
                  <ShieldCheck className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2">No hay entrenadores registrados.</div>
                </td></tr>
              )}
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 text-[#3D3D3D] font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-[#737373]">{t.email}</td>
                  <td className="px-4 py-3 text-[#737373] font-mono-tabular">{t.sst_license || "—"}</td>
                  <td className="px-4 py-3 text-[#737373]">{t.phone || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(t.id)} data-testid={`trainer-delete-${t.id}`}>
                      <Trash2 className="w-4 h-4 text-[#DC2626]" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display text-2xl">Nuevo entrenador</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3 mt-2">
            <div>
              <Label>Nombre completo</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                     data-testid="trainer-name-input" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input type="email" required value={form.email}
                       onChange={(e) => setForm({ ...form, email: e.target.value })}
                       data-testid="trainer-email-input" />
              </div>
              <div>
                <Label>Contraseña</Label>
                <Input required value={form.password}
                       onChange={(e) => setForm({ ...form, password: e.target.value })}
                       data-testid="trainer-pass-input" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Licencia SST</Label>
                <Input value={form.sst_license} onChange={(e) => setForm({ ...form, sst_license: e.target.value })}
                       data-testid="trainer-sst-input" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                      data-testid="trainer-submit-btn">
                {loading ? "Guardando…" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
