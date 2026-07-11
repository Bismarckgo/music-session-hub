import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Users, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ROLES, PROS, type Contact } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/contactos")({
  component: Contactos,
});

type Draft = {
  id?: string;
  name: string;
  email: string;
  default_role: string;
  ipi: string;
  pro: string;
  publisher: string;
  notes: string;
};

const empty: Draft = {
  name: "",
  email: "",
  default_role: "",
  ipi: "",
  pro: "",
  publisher: "",
  notes: "",
};

function Contactos() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Contact[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const payload = {
        name: draft.name,
        email: draft.email || null,
        default_role: draft.default_role || null,
        ipi: draft.ipi || null,
        pro: draft.pro || null,
        publisher: draft.publisher || null,
        notes: draft.notes || null,
      };
      if (draft.id) {
        const { error } = await supabase.from("contacts").update(payload).eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contacts")
          .insert({ ...payload, user_id: userData.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      setOpen(false);
      setDraft(empty);
      toast.success("Contacto guardado");
    },
    onError: () => toast.error("No se pudo guardar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contacts"] }),
  });

  const openNew = () => {
    setDraft(empty);
    setOpen(true);
  };

  const openEdit = (c: Contact) => {
    setDraft({
      id: c.id,
      name: c.name,
      email: c.email ?? "",
      default_role: c.default_role ?? "",
      ipi: c.ipi ?? "",
      pro: c.pro ?? "",
      publisher: c.publisher ?? "",
      notes: c.notes ?? "",
    });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contactos</h1>
          <p className="text-sm text-muted-foreground">
            Compositores, productores, ingenieros y publishers. Se registran una vez y se reutilizan
            en cada canción.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo contacto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{draft.id ? "Editar contacto" : "Nuevo contacto"}</DialogTitle>
              <DialogDescription>
                Los datos se autocompletan al agregar la persona a una canción.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Rol por defecto</Label>
                  <Select
                    value={draft.default_role}
                    onValueChange={(v) => setDraft({ ...draft, default_role: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>IPI</Label>
                  <Input
                    placeholder="Ej: 00378495712"
                    value={draft.ipi}
                    onChange={(e) => setDraft({ ...draft, ipi: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>PRO</Label>
                  <Select value={draft.pro} onValueChange={(v) => setDraft({ ...draft, pro: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Publisher</Label>
                <Input
                  value={draft.publisher}
                  onChange={(e) => setDraft({ ...draft, publisher: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notas</Label>
                <Textarea
                  rows={2}
                  value={draft.notes}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {draft.id ? "Guardar cambios" : "Crear contacto"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : contacts && contacts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-start justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="font-medium">{c.name}</p>
                  {c.default_role && (
                    <p className="text-xs text-muted-foreground">{c.default_role}</p>
                  )}
                  <div className="mt-2 space-y-0.5 font-mono text-xs text-muted-foreground">
                    {c.email && <p>{c.email}</p>}
                    {c.ipi && <p>IPI · {c.ipi}</p>}
                    {c.pro && <p>PRO · {c.pro}</p>}
                    {c.publisher && <p>Publisher · {c.publisher}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove.mutate(c.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card py-16 text-center">
          <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Aún no tienes contactos. Agrega a las personas con las que trabajas para reutilizarlas en cada canción.
          </p>
        </div>
      )}
    </div>
  );
}