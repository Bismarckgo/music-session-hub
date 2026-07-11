import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Fingerprint } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { STATUS_CLASSES, STATUS_LABELS, formatDate, type Work } from "@/lib/catalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/catalogo")({
  validateSearch: (search: Record<string, unknown>) => ({
    nueva: search.nueva === true || search.nueva === "true" ? true : undefined,
  }),
  component: Catalogo,
});

function Catalogo() {
  const { nueva } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(Boolean(nueva));
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");

  const { data: works, isLoading } = useQuery({
    queryKey: ["works"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("works")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Work[];
    },
  });

  const createWork = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sin sesión");
      const { data, error } = await supabase
        .from("works")
        .insert({
          user_id: userData.user.id,
          title,
          genre: genre || null,
          bpm: bpm ? Number(bpm) : null,
          musical_key: musicalKey || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Work;
    },
    onSuccess: (work) => {
      queryClient.invalidateQueries({ queryKey: ["works"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Obra creada con fingerprint ${work.fingerprint}`);
      setOpen(false);
      navigate({ to: "/obras/$id", params: { id: work.id } });
    },
    onError: () => toast.error("No se pudo crear la obra"),
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            Cada obra recibe un fingerprint único para mantener la metadata consistente
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Nueva obra
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva obra</DialogTitle>
              <DialogDescription>
                El fingerprint se genera automáticamente al crearla.
              </DialogDescription>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                createWork.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="w-title">Título *</Label>
                <Input id="w-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="w-genre">Género</Label>
                  <Input id="w-genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-bpm">BPM</Label>
                  <Input id="w-bpm" type="number" min={1} value={bpm} onChange={(e) => setBpm(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="w-key">Tonalidad</Label>
                  <Input id="w-key" placeholder="Ej: Am" value={musicalKey} onChange={(e) => setMusicalKey(e.target.value)} />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createWork.isPending}>
                {createWork.isPending ? "Creando…" : "Crear obra"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Obra</TableHead>
              <TableHead>Fingerprint</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden sm:table-cell">Canales</TableHead>
              <TableHead className="hidden sm:table-cell">Creada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : works && works.length > 0 ? (
              works.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link to="/obras/$id" params={{ id: w.id }} className="font-medium hover:text-primary">
                      {w.title}
                    </Link>
                    {w.genre && <p className="text-xs text-muted-foreground">{w.genre}</p>}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 font-mono text-xs">
                      <Fingerprint className="h-3 w-3 text-primary" /> {w.fingerprint}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_CLASSES[w.status] ?? ""}>{STATUS_LABELS[w.status] ?? w.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-muted-foreground">
                      {w.channels.length > 0 ? `${w.channels.length} canal${w.channels.length > 1 ? "es" : ""}` : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDate(w.created_at)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Tu catálogo está vacío. Crea tu primera obra para generar su fingerprint.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}