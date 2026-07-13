import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfiguracionPage,
});

function ConfiguracionPage() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
    });
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes de tu cuenta y preferencias del sistema.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="font-medium">{email || "—"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sobre CSTID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            El CSTID es el identificador permanente de una Obra Musical. Nace en el primer archivo
            creado en el DAW y acompaña a la obra durante todo su ciclo de vida.
          </p>
          <p>
            El título, colaboradores, splits y metadata pueden cambiar. El CSTID nunca cambia.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
