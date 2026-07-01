import { useEffect, useState } from "react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Plus, Building2, Trash2, Edit3 } from "lucide-react";
import { toast } from "sonner";
import api, { formatApiError } from "../lib/api";

const EMPTY = {
  name: "", nit: "", legal_representative: "", arl: "",
  address: "", phone: "", email: "",
  create_user: true, user_email: "", user_password: "",
};

export default function Companies() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/companies");
    setItems(data);
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await api.patch(`/companies/${editing}`, form);
        toast.success("Empresa actualizada");
      } else {
        await api.post("/companies", form);
        toast.success("Empresa creada");
      }
      setOpen(false); setForm(EMPTY); setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally { setLoading(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar empresa? Esta acción es irreversible.")) return;
    try {
      await api.delete(`/companies/${id}`);
      toast.success("Eliminada");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const startEdit = (c) => {
    setEditing(c.id);
    setForm({ ...EMPTY, ...c, create_user: false, user_email: "", user_password: "" });
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-overline text-[#1E4484]">— Gestión</div>
          <h1 className="font-display text-3xl text-[#3D3D3D] mt-1">Empresas clientes</h1>
        </div>
        <Button onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}
                className="bg-[#1E4484] hover:bg-[#173566] text-white" data-testid="company-create-btn">
          <Plus className="w-4 h-4 mr-1" /> Nueva empresa
        </Button>
      </div>

      <Card className="border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-data">
            <thead className="bg-[#F1F5F9] text-[#737373] text-overline">
              <tr>
                <th className="text-left px-4 py-3">Empresa</th>
                <th className="text-left px-4 py-3">NIT</th>
                <th className="text-left px-4 py-3">Rep. legal</th>
                <th className="text-left px-4 py-3">ARL</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {items.length === 0 && (
                <tr><td colSpan="5" className="text-center py-10 text-[#737373]">
                  <Building2 className="w-8 h-8 mx-auto text-[#E2E8F0]" />
                  <div className="mt-2">No hay empresas registradas aún.</div>
                </td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC]" data-testid={`company-row-${c.id}`}>
                  <td className="px-4 py-3 text-[#3D3D3D] font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-[#3D3D3D] font-mono-tabular">{c.nit}</td>
                  <td className="px-4 py-3 text-[#737373]">{c.legal_representative}</td>
                  <td className="px-4 py-3 text-[#737373]">{c.arl}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(c)} data-testid={`company-edit-${c.id}`}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(c.id)} data-testid={`company-delete-${c.id}`}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? "Editar empresa" : "Nueva empresa"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4 mt-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Razón social</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                       data-testid="company-name-input" />
              </div>
              <div>
                <Label>NIT</Label>
                <Input required value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })}
                       data-testid="company-nit-input" />
              </div>
              <div>
                <Label>ARL</Label>
                <Input required value={form.arl} onChange={(e) => setForm({ ...form, arl: e.target.value })}
                       data-testid="company-arl-input" />
              </div>
              <div className="sm:col-span-2">
                <Label>Representante legal</Label>
                <Input required value={form.legal_representative}
                       onChange={(e) => setForm({ ...form, legal_representative: e.target.value })}
                       data-testid="company-rep-input" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <Label>Email institucional</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Dirección</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            {!editing && (
              <Card className="p-4 bg-[#F8FAFC] border-[#E2E8F0]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.create_user}
                         onChange={(e) => setForm({ ...form, create_user: e.target.checked })}
                         data-testid="company-createuser-checkbox" />
                  <span className="text-sm font-medium">Crear cuenta de usuario para esta empresa</span>
                </label>
                {form.create_user && (
                  <div className="grid sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <Label>Email de acceso</Label>
                      <Input type="email" required value={form.user_email}
                             onChange={(e) => setForm({ ...form, user_email: e.target.value })}
                             data-testid="company-useremail-input" />
                    </div>
                    <div>
                      <Label>Contraseña inicial</Label>
                      <Input type="text" required value={form.user_password}
                             onChange={(e) => setForm({ ...form, user_password: e.target.value })}
                             data-testid="company-userpass-input" />
                    </div>
                  </div>
                )}
              </Card>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-[#1E4484] hover:bg-[#173566] text-white"
                      data-testid="company-submit-btn">
                {loading ? "Guardando…" : (editing ? "Guardar" : "Crear empresa")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
