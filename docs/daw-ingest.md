# DAW → CST ingest (Fase 0 del MIE)

Endpoint público firmado que crea/actualiza una obra y su sesión desde un DAW
(o cualquier script/plugin) y alimenta el event store del MIE.

- Método: `POST`
- URL producción: `https://project--d182a654-6351-4e12-9c5e-2abcc2ecd744.lovable.app/api/public/daw/ingest`
- URL preview: `https://project--d182a654-6351-4e12-9c5e-2abcc2ecd744-dev.lovable.app/api/public/daw/ingest`
- Headers:
  - `content-type: application/json`
  - `x-cst-user-id: <uuid del usuario dueño de la obra>`
  - `x-cst-signature: <HMAC-SHA256 hex del body con DAW_INGEST_SECRET>`

## Payload

```json
{
  "daw": "Ableton Live",
  "project_name": "Mi Track",
  "started_at": "2026-07-23T18:00:00Z",
  "duration_minutes": 45,
  "collaborators": [
    { "name": "Alex", "role": "Productor" }
  ]
}
```

La obra se busca/crea por `(user_id, project_name)` para no duplicar. Se
registra una sesión y se emiten los eventos `WorkCreated` (solo si es nueva),
`SessionStarted` y `CollaboratorAdded` en `mie_events`.

## Ejemplo (bash)

```bash
SECRET="…DAW_INGEST_SECRET…"
USER_ID="00000000-0000-0000-0000-000000000000"
BODY='{"daw":"Ableton Live","project_name":"Mi Track","started_at":"2026-07-23T18:00:00Z"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
curl -X POST \
  -H "content-type: application/json" \
  -H "x-cst-user-id: $USER_ID" \
  -H "x-cst-signature: $SIG" \
  --data "$BODY" \
  https://project--d182a654-6351-4e12-9c5e-2abcc2ecd744.lovable.app/api/public/daw/ingest
```

Respuesta: `{ "ok": true, "work_id": "...", "session_id": "...", "events": 2 }`.
## Fase 4 — DAW Watcher (Electron)

La app de escritorio incluye un watcher (`electron/daw-watcher.cjs`) que
observa carpetas de proyectos y emite eventos al mismo endpoint firmado.

Configuración: `cst-watcher.json` en la carpeta `userData` de Electron.

```json
{
  "enabled": true,
  "userId": "<uuid del usuario>",
  "secret": "<DAW_INGEST_SECRET>",
  "endpoint": "https://project--d182a654-6351-4e12-9c5e-2abcc2ecd744.lovable.app/api/public/daw/ingest",
  "folders": ["/Users/tu-usuario/Music/Ableton"],
  "maxDepth": 4
}
```

Extensiones reconocidas: `.als`, `.logicx`, `.flp`, `.ptx`, `.cpr`, `.rpp`,
`.band`, `.song`, `.bwproject`.

### Eventos adicionales

El payload acepta un campo `event`:

| `event`            | Evento MIE        | Efecto en el estado          |
| ------------------ | ----------------- | ---------------------------- |
| `session_started`  | `SessionStarted`  | `in_session` (crea sesión)   |
| `project_detected` | `ProjectDetected` | crea la obra si no existe    |
| `session_saved`    | `SessionSaved`    | `in_session`                 |
| `bounce_exported`  | `BounceExported`  | `tracked` → `mixed`          |

Cada evento incluye `client_event_id` (UUID) para idempotencia: reintentos
tras un fallo de red no duplican el log. Los eventos pendientes se guardan en
`cst-watcher-queue.json` y se reintentan cada 20 s.
