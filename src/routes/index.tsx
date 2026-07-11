import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Fingerprint, Disc3, Users, FileText } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

// No og:image here so serve-time hosting can inject the project's social preview.
export const Route = createFileRoute("/")({
  component: Index,
});

const features = [
  {
    icon: Disc3,
    title: "Captura desde el DAW",
    description:
      "La data se registra desde que abres la sesión de producción: DAW, fecha, duración y notas de cada sesión.",
  },
  {
    icon: Fingerprint,
    title: "Fingerprint + ISRC / ISWC",
    description:
      "Cada canción recibe un fingerprint interno y guarda sus códigos ISRC e ISWC junto a toda su metadata.",
  },
  {
    icon: Users,
    title: "Créditos reutilizables",
    description:
      "Compositores, productores, beatmakers, ingenieros y publishers con IPI y PRO — se registran una vez y se reutilizan.",
  },
  {
    icon: FileText,
    title: "Splits + exportaciones",
    description:
      "Splits sheet en CSV y crédito oficial en PDF listos para firmar, distribuir o enviar a la PRO.",
  },
];

function Index() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setHasSession(Boolean(data.session)));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-bold">CST</span>
          </div>
          <Button asChild variant={hasSession ? "default" : "outline"}>
            <Link to={hasSession ? "/dashboard" : "/auth"}>
              {hasSession ? "Ir al panel" : "Iniciar sesión"}
            </Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
            Credit Session Track
          </p>
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">
            Cada crédito musical,
            <br />
            <span className="text-primary">desde el primer minuto</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            CST centraliza canciones, sesiones, créditos, metadata, splits, ISRC, ISWC, IPI y
            publishers en un solo lugar. Registra a cada persona una vez y reutilízala en todo tu
            catálogo — sin fricción, sin créditos perdidos.
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link to={hasSession ? "/dashboard" : "/auth"}>Empezar ahora</Link>
            </Button>
          </div>
        </section>

        <section className="border-t bg-secondary/50">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
            <span>CST — Credit Session Track</span>
            <span>Nunca pierdas un crédito musical</span>
          </div>
      </footer>
    </div>
  );
}
