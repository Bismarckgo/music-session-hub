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