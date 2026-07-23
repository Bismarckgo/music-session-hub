# Fase 0 — Music Intelligence Engine (MIE)

Objetivo: instalar la **columna vertebral** del MIE sin romper el MVP. Al terminar, cada obra tiene un **event log inmutable** y un **estado derivado** calculado por el motor, alimentado por un flujo mínimo `DAW → CST` que crea la obra automáticamente.

## Alcance (lo que SÍ se hace)

1. **Event Store** — tabla `mie_events` como log append-only (evento, tipo, actor, payload, work_id, occurred_at). Fuente de verdad para el MIE.
2. **State Machine de `Work`** — estados oficiales:
   `draft → in_session → tracked → mixed → mastered → metadata_ready → registered → distributed`.
   Transiciones controladas por el motor, no por la UI.
3. **Motor mínimo (`src/lib/mie/`)**:
   - `events.ts` — tipos + `emit(event)` que escribe en `mie_events`.
   - `reducers/work.ts` — `deriveWorkState(events)` que calcula el estado actual desde los eventos.
   - `rules/phase0.ts` — reglas iniciales (ej: `SessionStarted` → `in_session`; `CoverAttached + ISRC + splits==100` → `metadata_ready`).
4. **Hook DAW → CST (server route pública)**:
   - `POST /api/public/daw/ingest` con firma HMAC (`DAW_INGEST_SECRET`).
   - Payload mínimo: `{ session_id, daw, project_name, started_at, collaborators?[] }`.
   - Efecto: crea `Work` si no existe (por `project_name + user`), crea `Session`, emite `WorkCreated`, `SessionStarted`, `CollaboratorDetected`.
5. **Timeline visible (read-only)** en `obras/$id`: nueva pestaña **Actividad MIE** que lista eventos y muestra el estado derivado. La UI **no** muta estado; solo lee.
6. **Backfill** de eventos sintéticos para obras/sesiones existentes al aplicar la migración, para que el estado derivado no salga vacío.

## Fuera de alcance (fases siguientes)

- Inferencias forward/backward complejas, motor de reglas declarativo, sugerencias, resolución de conflictos de splits, integraciones PRO, plugin real de DAW. Se cubren en Fase 1+.

## Detalles técnicos

### Migración

- `mie_events(id, user_id, work_id nullable, session_id nullable, type text, actor text, payload jsonb, occurred_at timestamptz, created_at)`
- Índices por `(user_id, work_id, occurred_at)` y `(type)`.
- RLS: usuario ve/inserta solo sus eventos; `service_role` full (para el endpoint público firmado que corre con admin client tras verificar HMAC).
- Trigger: al `INSERT` en `sessions`/`collaborators`/`works` **no** se toca — los emisores viven en el código para mantener el motor explícito.
- Backfill dentro de la misma migración: por cada `works` existente emitir `WorkCreated`; por cada `sessions` emitir `SessionStarted`; por cada `collaborators` emitir `CollaboratorAdded`.

### Estados y reglas Fase 0

```text
WorkCreated                        -> draft
SessionStarted                     -> in_session
SessionEnded (duration_minutes>0)  -> tracked
CoverAttached                      -> (no cambia; enriquece)
IdentifiersSet (ISRC & ISWC)       -> metadata_ready (si splits==100 & roles mín.)
RegistrationSubmitted              -> registered
DistributionPublished              -> distributed
```

Motor: `deriveWorkState(events)` recorre eventos en orden y devuelve el estado más avanzado alcanzable. Estado se **calcula al leer**; no se persiste todavía (se cachea en Fase 1).

### DAW ingest

- Ruta pública en `src/routes/api/public/daw.ingest.ts` con verificación HMAC.
- Cliente ejemplo (curl) documentado en `docs/daw-ingest.md`.
- Sin plugin real todavía: el endpoint permite simular desde cualquier DAW o script.

### UI

- `obras/$id`: pestaña **Timeline** con lista de eventos + badge de estado derivado. Sin edición.
- Panel: nada nuevo aún (Fase 1 mostrará “próxima acción sugerida”).

## Plan de implementación

1. Migración `mie_events` + RLS + backfill.
2. `src/lib/mie/{events,types,reducers/work,rules/phase0}.ts` + tests unitarios ligeros sobre `deriveWorkState`.
3. Emitir eventos desde los puntos de escritura existentes (crear obra, crear sesión, agregar colaborador, subir carátula, guardar ISRC/ISWC).
4. Server route `POST /api/public/daw/ingest` con HMAC (`DAW_INGEST_SECRET` vía `add_secret`).
5. Pestaña Timeline en detalle de obra.
6. Doc `docs/daw-ingest.md` con ejemplo curl.

## Riesgos

- Doble escritura (tabla clásica + evento) puede desincronizar → mitigado emitiendo evento **después** del commit exitoso y con backfill.
- Endpoint público mal firmado → HMAC obligatorio + rechazo 401.

## Criterio de aceptación

- Un `curl` firmado a `/api/public/daw/ingest` crea Work + Session y aparece en Timeline con estado `in_session`.
- Obras existentes muestran timeline poblada por backfill.
- Nada del MVP actual se rompe.
