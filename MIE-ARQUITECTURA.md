	# Music Intelligence Engine (MIE) — Arquitectura Completa

> CST no es una base de datos. CST es un sistema experto de metadata musical.

---

## Índice

1.  Filosofía del MIE
2.  Knowledge Graph (Grafo de Conocimiento)
3.  Entidades y Relaciones
4.  Motor de Eventos
5.  Motor de Inferencias
6.  Motor de Validaciones
7.  Máquina de Estados del Ciclo de Vida
8.  Arquitectura de Automatizaciones
9.  Flujo Completo DAW → Royalties
10. Estrategia de Integración con CST Actual
11. Plan de Migración por Fases
12. Riesgos y Oportunidades
13. Plan de Implementación Incremental

---

## 1. Filosofía del MIE

### 1.1 Principios Rectores

| Principio | Descripción |
|-----------|-------------|
| **Single Source of Truth** | Cada dato existe una sola vez. Nunca se duplica. |
| **Inferencia > Captura** | El sistema debe deducir antes que preguntar. |
| **Contexto Permanente** | Toda decisión del usuario se recuerda y reutiliza. |
| **Reactividad por Eventos** | El sistema reacciona a cambios, no a solicitudes de pantalla. |
| **Conocimiento del Negocio** | El MIE conoce las reglas de la industria musical. |
| **Proactividad** | El MIE anticipa necesidades, no espera instrucciones. |
| **Grafo, No Tablas** | Las relaciones son tan importantes como los datos. |
| **No hay Formularios Inteligentes** | La inteligencia vive en el MIE, no en las pantallas. |

### 1.2 Capas del Sistema

```
┌─────────────────────────────────────────────────┐
│                   UI Layer                        │
│  (Pantallas: solo muestran estado y capturan      │
│   datos sin lógica de negocio)                    │
├─────────────────────────────────────────────────┤
│                 Event Bus                         │
│  (Medio de comunicación: UI → MIE, MIE → UI)     │
├─────────────────────────────────────────────────┤
│            Music Intelligence Engine              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  Event   │ │Inference │ │Validation│         │
│  │  Engine  │ │ Engine   │ │ Engine   │         │
│  └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │  State   │ │ Workflow │ │Knowledge │         │
│  │ Machine  │ │ Engine   │ │ Graph    │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│            Data Access Layer                      │
│  (Supabase / SQLite / APIs externas)             │
└─────────────────────────────────────────────────┘
```

### 1.3 Regla Fundamental

**Ninguna pantalla puede:**
- Tomar decisiones de negocio
- Validar reglas de la industria
- Inferir información
- Calcular estados derivados
- Decidir qué preguntar después

**Toda pantalla puede:**
- Mostrar el estado actual según el MIE
- Enviar eventos al MIE
- Recibir sugerencias del MIE
- Delegar al MIE cualquier decisión

---

## 2. Knowledge Graph (Grafo de Conocimiento)

### 2.1 Estructura del Grafo

El grafo no es una base de datos relacional. Es un modelo de nodos y aristas donde:

- **Nodos (Nodes):** Entidades del dominio musical
- **Aristas (Edges):** Relaciones con significado semántico
- **Propiedades (Properties):** Atributos de nodos y aristas
- **Contexto (Context):** Metadatos de tiempo, espacio y certeza

### 2.2 Nodos Principales

```
NODO: Project
  └── Representa un proyecto de DAW
  └── Propiedades: name, daw, path, created_at, last_modified, version_history[]
  └── Relaciones: PRODUCES → Composition, RECORDS → Session

NODO: Composition
  └── Representa una obra musical escrita (canción)
  └── Propiedades: title, iswc, language, duration, lyrics_language
  └── Relaciones: HAS_WRITER → Person, ADMINISTERED_BY → Publisher, REGISTERED_AT → PRO

NODO: Recording
  └── Representa una grabación sonora específica
  └── Propiedades: isrc, duration, upc, p_line, release_date, cover_url
  └── Relaciones: IS_OF → Composition, HAS_ARTIST → Person, OWNED_BY → Label, DISTRIBUTED_BY → Distributor, PUBLISHED_ON → DSP

NODO: Release
  └── Representa un lanzamiento (single, EP, álbum)
  └── Propiedades: upc, title, release_date, type (single/album/compilation)
  └── Relaciones: CONTAINS → Recording, DISTRIBUTED_BY → Distributor

NODO: Person
  └── Representa una persona física o jurídica involucrada
  └── Propiedades: name, ipi, pro, email, role_type (writer/artist/producer/engineer)
  └── Relaciones: IS_MEMBER_OF → PRO, SIGNED_WITH → Publisher, HAS_ROLE_IN → Composition/Recording

NODO: Publisher
  └── Representa una entidad de publishing
  └── Propiedades: name, ipi, type (major/independent/admin)
  └── Relaciones: ADMINISTERS → Composition, HAS_SUBPUBLISHER → Publisher (en territorio)

NODO: PRO
  └── Representa una Performing Rights Organization
  └── Propiedades: name, country, type
  └── Relaciones: REGISTERS → Composition, MEMBER → Person

NODO: CMO
  └── Representa una Collective Management Organization
  └── Propiedades: name, country, type (mechanical/performance/neighboring)
  └── Relaciones: COLLECTS_FOR → Composition/Recording

NODO: Label
  └── Representa un sello discográfico
  └── Propiedades: name, distributor, type (major/independent)
  └── Relaciones: OWNS → Recording, DISTRIBUTED_BY → Distributor

NODO: Distributor
  └── Representa un distribuidor digital o físico
  └── Propiedades: name, type (digital/physical/both)
  └── Relaciones: DISTRIBUTES → Recording/Release

NODO: DSP
  └── Representa un Digital Service Provider
  └── Propiedades: name, type (streaming/download), url
  └── Relaciones: HOSTS → Recording

NODO: Session
  └── Representa una sesión de estudio/grabación
  └── Propiedades: daw, duration, date, notes, plugins[], tracks_count
  └── Relaciones: BELONGS_TO → Project, PRODUCES → Recording

NODO: Contract
  └── Representa un acuerdo legal
  └── Propiedades: type (admin/publishing/distribution/license), start_date, end_date, territory
  └── Relaciones: GOVERNS → Composition/Recording/Release, BETWEEN → Person/Entity

NODO: Territory
  └── Representa un territorio geográfico
  └── Propiedades: name, code (ISO), type (worldwide/country/region)
  └── Relaciones: APPLIES_TO → Contract/Registration

NODO: Registration
  └── Representa el registro de una obra en una entidad
  └── Propiedades: platform, status, registration_date, external_id
  └── Relaciones: REGISTERS → Composition/Recording, AT → PRO/CMO/MLC

NODO: RoyaltyStatement
  └── Representa un período de regalías
  └── Propiedades: period_start, period_end, total_amount, currency
  └── Relaciones: FROM → PRO/CMO/DSP, FOR → Composition/Recording

NODO: MetadataSource
  └── Representa una fuente externa de metadata
  └── Propiedades: source (deezer/spotify/musicbrainz/discogs), confidence, last_checked
  └── Relaciones: PROVIDED → cualquier nodo (como evidencia)
```

### 2.3 Aristas del Grafo

| Relación | De | A | Significado |
|----------|----|----|------------|
| PRODUCES | Project | Composition | Un proyecto DAW genera una composición |
| RECORDS | Project | Recording | Un proyecto DAW genera una grabación |
| IS_OF | Recording | Composition | Una grabación es una interpretación de una composición |
| CONTAINS | Release | Recording | Un release contiene grabaciones |
| HAS_WRITER | Composition | Person | Una persona es escritora/compositora de esta composición |
| HAS_ARTIST | Recording | Person | Una persona es artista en esta grabación |
| HAS_PRODUCER | Recording | Person | Una persona es productora en esta grabación |
| HAS_ENGINEER | Recording | Person | Una persona es ingeniera en esta grabación |
| ADMINISTERED_BY | Composition | Publisher | Una editorial administra esta composición |
| REGISTERED_AT | Composition | PRO | La composición está registrada en esta PRO |
| COLLECTED_BY | Recording | CMO | La grabación es gestionada por esta CMO |
| OWNED_BY | Recording | Label | El sello es dueño del master |
| DISTRIBUTED_BY | Recording/Release | Distributor | El distribuidor distribuye esta obra |
| PUBLISHED_ON | Recording | DSP | La grabación está disponible en este DSP |
| IS_MEMBER_OF | Person | PRO | La persona es miembro de esta PRO |
| SIGNED_WITH | Person | Publisher | La persona firmó con este publisher |
| GOVERNS | Contract | Entity | El contrato gobierna esta relación |
| HAS_ROLE_IN | Person | Role | La persona tiene este rol específico |
| DEPENDS_ON | Node | Node | Un nodo depende de otro para existir |
| SUGGESTS | Inference | Action | Una inferencia sugiere una acción |
| PRECEDES | Event | Event | Un evento ocurre después de otro |
| CONFLICTS_WITH | Data | Data | Dos datos son inconsistentes |
| DERIVED_FROM | Data | Data | Un dato se deriva de otro |

### 2.4 Contexto del Grafo

Cada arista puede tener propiedades adicionales:

```typescript
type EdgeProperties = {
  confidence: number; // 0-1 qué tan segura es esta relación
  source: string; // qué produjo esta relación
  timestamp: string; // cuándo se estableció
  territory?: string; // si aplica a un territorio específico
  share_percent?: number; // si hay un porcentaje asociado
  role?: string; // si la relación tiene un rol específico
  is_active: boolean; // si la relación sigue vigente
  metadata?: Record<string, unknown>; // contexto adicional
};
```

---

## 3. Entidades y Relaciones Detalladas

### 3.1 Entidad: MusicProject

```
MusicProject {
  id: UUID (PK)
  cstid: string (CST-XXXXXXXXXX — permanente, único)
  name: string
  original_filename: string
  daw: string (Ableton Live, FL Studio, Logic Pro, etc.)
  daw_version: string
  operating_system: string
  project_path: string (ruta del archivo del proyecto)
  created_at: timestamptz
  last_modified: timestamptz
  total_tracks: int
  total_buses: int
  sample_rate: int
  bit_depth: int
  time_signature: string
  tempo: float (puede cambiar)
  musical_key: string (puede cambiar)
  duration_seconds: int
  plugin_list: string[] (VSTs, AUs, etc.)
  instrument_list: string[]
  audio_files: string[] (archivos de audio referenciados)
  markers: jsonb (markers del proyecto)
  track_colors: jsonb
  track_names: string[]
  version_history: jsonb (historial de guardados)
  export_history: jsonb (historial de exportaciones/bounces)
  backup_history: jsonb
  notes: text
  
  // Estado del MIE
  mie_state: string (borrador, analizando, completo, en_revision)
  mie_confidence: float (0-1, qué tan completa está la metadata)
  last_mie_analysis: timestamptz
}
```

### 3.2 Entidad: Composition

```
Composition {
  id: UUID (PK)
  cstid: string (mismo que el project si nació aquí)
  title: string
  iswc: string (T-XXX.XXX.XXX-X)
  language: string
  duration_seconds: int
  lyrics_language: string
  lyrics: text
  original_work_id: UUID (FK → Composition, si es adaptación/derivada)
  is_derivative: boolean
  derivative_type: string (arrangement, translation, sample, interpolation)
  created_at: timestamptz
  
  // Splits de Composición (publishing)
  total_writer_share: float (debe sumar 100)
  total_publisher_share: float (debe sumar 100)
  
  // Metadata de fuentes externas
  musicbrainz_id: string
  last_synced: timestamptz
}
```

### 3.3 Entidad: Recording

```
Recording {
  id: UUID (PK)
  composition_id: UUID (FK → Composition)
  cstid: string
  title: string
  isrc: string (CC-XXX-XX-XXXXX)
  duration_seconds: int
  cover_url: string
  p_line: string (℗ AAAA Nombre)
  release_date: date
  explicit: boolean
  genre: string
  bpm: int
  musical_key: string
  track_number: int (dentro de un release)
  
  // Splits de Grabación (master)
  total_artist_share: float
  total_label_share: float
  producer_points: float
  
  // Metadata externa
  musicbrainz_recording_id: string
  deezer_track_id: string
  spotify_track_id: string
  apple_music_track_id: string
  
  // Derivación
  derived_from_recording_id: UUID (FK → Recording, si es remix/versión)
  derivation_type: string (remix, live, acoustic, instrumental, a_cappella)
}
```

### 3.4 Entidad: Release

```
Release {
  id: UUID (PK)
  upc: string (12 dígitos)
  title: string
  type: ReleaseType (single, ep, album, compilation, soundtrack)
  artist: string
  release_date: date
  label: string
  catalog_number: string
  cover_url: string
  genre: string
  subgenre: string
  p_line: string
  c_line: string (© AAAA)
  total_tracks: int
  disc_count: int
  barcode: string
  territories: string[] (dónde está disponible)
  distribution_type: string (digital, physical, both)
  
  // Metadata externa
  discogs_release_id: string
  musicbrainz_release_id: string
}
```

### 3.5 Entidad: Person (unificada)

```
Person {
  id: UUID (PK)
  cstid: string
  name: string
  legal_name: string
  email: string
  phone: string
  
  // Identificadores
  ipi: string (11 dígitos, con checksum)
  ipi_name_number: string (IPI/CAE)
  pro_id: string (identificador dentro de su PRO)
  isni: string (International Standard Name Identifier)
  
  // Afiliaciones
  pro: string (BMI, ASCAP, SESAC, PRS, etc.)
  pro_type: string (writer, publisher, both)
  
  // Preferencias (para el MIE)
  default_role: string (rol más frecuente)
  default_publisher: string
  default_share: float
  is_frequent_collaborator: boolean
  
  // Timestamps
  created_at: timestamptz
  updated_at: timestamptz
  last_collaboration: timestamptz
}
```

### 3.6 Entidad: CompositionShare

```
CompositionShare {
  id: UUID (PK)
  composition_id: UUID (FK → Composition)
  person_id: UUID (FK → Person)
  publisher_id: UUID (FK → Publisher, nullable — si es self-published)
  
  // Shares
  writer_share: float (0-100, cuánto de la composición le pertenece)
  publisher_share: float (0-100, cuánto administra el publisher)
  controlled_by_writer: float (0-100, qué % controla el writer directamente)
  
  // Territorio
  territory: string (ISO code o "worldwide")
  
  // Metadata
  role: string (composer, lyricist, arranger, adapter)
  is_active: boolean
  valid_from: date
  valid_until: date
  notes: text
}
```

### 3.7 Entidad: RecordingShare

```
RecordingShare {
  id: UUID (PK)
  recording_id: UUID (FK → Recording)
  person_id: UUID (FK → Person)
  label_id: UUID (FK → Label, nullable)
  
  // Shares
  artist_share: float (0-100, del master)
  label_share: float (0-100, del master)
  producer_points: float (puntos del productor, pueden ser % o puntos fijos)
  points_type: string (percentage, fixed)
  
  // Metadata
  role: string (lead_artist, featured_artist, producer, engineer, mixer, masterer)
  is_featured: boolean
  territory: string
  is_active: boolean
  notes: text
}
```

### 3.8 Entidad: MieEvent (registro de eventos)

```
MieEvent {
  id: UUID (PK)
  event_type: string (work_created, isrc_detected, iswc_found, splits_validated, etc.)
  entity_type: string (composition, recording, person, etc.)
  entity_id: UUID
  previous_state: jsonb (opcional)
  new_state: jsonb (opcional)
  trigger: string (user_action, system_inference, external_api, scheduled)
  source: string (ui, deezer, spotify, musicbrainz, user, system)
  timestamp: timestamptz
  processed: boolean
  processing_result: jsonb (opcional)
  error: text (opcional)
}
```

### 3.9 Entidad: InferenceLog

```
InferenceLog {
  id: UUID (PK)
  event_id: UUID (FK → MieEvent)
  inference_type: string (metadata_completion, validation, suggestion, automation)
  input_data: jsonb
  output_data: jsonb
  confidence: float (0-1)
  rules_applied: string[]
  timestamp: timestamptz
  accepted: boolean (si el usuario aceptó la inferencia)
  rejected_reason: text (si el usuario la rechazó)
}
```

### 3.10 Entidad: ContextPreference (memoria del MIE)

```
ContextPreference {
  id: UUID (PK)
  user_id: UUID
  
  // Preferencias por defecto (aprendidas)
  default_distributor: string
  default_label: string
  default_publisher: string
  default_pro: string
  default_publishing_type: string
  default_territory: string
  
  // Frecuencias
  frequent_collaborators: jsonb [{ person_id, count, last_used }]
  frequent_daws: jsonb [{ daw, count }]
  frequent_genres: jsonb [{ genre, count }]
  frequent_roles: jsonb [{ role, count }]
  
  // Estado de onboarding
  onboarding_completed: boolean
  onboarding_step: string
  completed_steps: string[]
  
  // Configuración del MIE
  auto_fetch_metadata: boolean (default: true)
  auto_suggest_splits: boolean (default: true)
  validation_strictness: string (relaxed, normal, strict)
  preferred_metadata_sources: string[] (deezer, spotify, musicbrainz, discogs)
}
```

---

## 4. Motor de Eventos

### 4.1 Arquitectura del Event Bus

```typescript
// El Event Bus es el sistema nervioso central.
// Todo cambio en el sistema genera un evento.
// El MIE escucha eventos, procesa y emite nuevos eventos.
// Las pantallas se suscriben a eventos relevantes.

interface MieEventBus {
  // Emitir un evento
  emit(event: MieEvent): void;
  
  // Escuchar eventos de un tipo específico
  on(eventType: string, handler: EventHandler): Subscription;
  
  // Escuchar eventos de una entidad específica
  onEntity(entityType: string, entityId: string, handler: EventHandler): Subscription;
  
  // Desuscribirse
  off(subscription: Subscription): void;
  
  // Obtener historial de eventos de una entidad
  getHistory(entityType: string, entityId: string): MieEvent[];
}
```

### 4.2 Catálogo de Eventos

```
EVENTOS DEL SISTEMA
────────────────────
system.boot                         → El MIE se ha iniciado
system.metadata.sync.scheduled      → Sincronización programada
system.metadata.sync.completed      → Sincronización completada

EVENTOS DE PROYECTO (DAW)
──────────────────────────
project.created                     → Nuevo proyecto detectado
project.modified                    → Proyecto guardado/modificado
project.exported                    → Proyecto exportado/bounced
project.stems.generated             → Stems exportados
project.bpm.changed                 → BPM modificado
project.key.changed                 → Tonalidad modificada
project.track.added                 → Nueva pista agregada
project.track.removed               → Pista eliminada
project.plugin.added                → Nuevo plugin agregado
project.audio.file.added            → Nuevo archivo de audio referenciado

EVENTOS DE COMPOSICIÓN
───────────────────────
composition.created                 → Nueva composición creada
composition.title.changed           → Título modificado
composition.iswc.assigned           → ISWC asignado
composition.writer.added            → Nuevo escritor/compositor agregado
composition.writer.removed          → Escritor retirado
composition.publisher.changed       → Publisher modificado
composition.share.updated           → Splits de publishing actualizados
composition.pro.registered          → Registrada en PRO
composition.mlc.registered          → Registrada en MLC
composition.derived.detected        → Detectada como obra derivada
composition.metadata.enriched       → Metadata enriquecida desde fuente externa

EVENTOS DE GRABACIÓN
─────────────────────
recording.created                   → Nueva grabación creada
recording.isrc.assigned             → ISRC asignado
recording.artist.added              → Nuevo artista agregado
recording.artist.removed            → Artista retirado
recording.label.changed             → Label modificado
recording.distributor.assigned      → Distribuidor asignado
recording.release_date.set          → Fecha de release establecida
recording.cover.updated             → Carátula actualizada
recording.dsp.published             → Publicada en DSP
recording.remix.detected            → Detectada como remix
recording.metadata.enriched         → Metadata enriquecida desde fuente externa

EVENTOS DE RELEASE
───────────────────
release.created                     → Nuevo release creado
release.upc.assigned                → UPC asignado
release.track.added                 → Nuevo track agregado al release
release.track.removed               → Track retirado del release
release.distributed                 → Release enviado a distribuidor
release.published                   → Release publicado públicamente

EVENTOS DE PERSONA
───────────────────
person.created                      → Nueva persona creada
person.ipi.assigned                 → IPI asignado
person.pro.changed                  → PRO modificada
person.publisher.changed            → Publisher modificado
person.role.detected                → Rol frecuente detectado automáticamente

EVENTOS DE REGISTRO
───────────────────
registration.status.changed         → Estado de registro actualizado
registration.verified               → Registro verificado externamente
registration.error                  → Error en registro

EVENTOS DE INFERENCIA
──────────────────────
inference.completed                 → Inferencia completada
inference.suggested                 → Sugerencia generada para el usuario
inference.accepted                  → Usuario aceptó la sugerencia
inference.rejected                  → Usuario rechazó la sugerencia
inference.conflict                  → Conflicto detectado entre datos

EVENTOS DE VALIDACIÓN
──────────────────────
validation.passed                   → Validación superada
validation.warning                  → Advertencia de validación
validation.error                    → Error de validación
validation.fixed                    → Error corregido automáticamente

EVENTOS DE AUTOMATIZACIÓN
──────────────────────────
automation.triggered                → Automatización ejecutada
automation.completed                → Automatización completada
automation.failed                   → Automatización fallida
```

### 4.3 Ciclo de Vida de un Evento

```
1. Emisión
   └── Origen: UI, DAW plugin, scheduler, API externa, otro evento
   
2. Captura por el Event Bus
   └── Se registra en la tabla mie_events
   └── Se analiza el tipo de evento
   
3. Enrutamiento
   └── Se envía a los handlers registrados:
       ├── Inference Engine (para deducir nuevos datos)
       ├── Validation Engine (para validar consistencia)
       ├── State Machine (para actualizar estado del ciclo de vida)
       └── Workflow Engine (para disparar workflows)
   
4. Procesamiento
   └── Cada engine procesa el evento
   └── Pueden emitir nuevos eventos
   
5. Notificación
   └── Se notifica a la UI si hay cambios relevantes
   └── Se muestra sugerencia al usuario si aplica
   
6. Persistencia
   └── El evento y sus resultados se guardan
   └── Queda en el historial de la entidad
```

### 4.4 Ejemplo: Evento `composition.created`

```
Evento: composition.created
Payload: { compositionId, title, projectId? }

Procesamiento:
1. Inference Engine recibe el evento
2. Si hay projectId:
   - Buscar DAW, BPM, key del proyecto
   - Asignar automáticamente a la composición
3. Buscar si existe ISRC en el proyecto
   - Si existe: crear Recording automáticamente
   - Emitir evento: recording.created
4. Buscar si existen tracks exportados
   - Sugerir duración
5. Analizar nombre del proyecto
   - Si contiene feat., ft., con → sugerir featuring
   - Si contiene remix, edit, version → marcar como derivada
6. Validar que:
   - No exista duplicado por título similar
   - No haya conflicto de CSTID
7. Emitir eventos derivados:
   - inference.completed { suggestions: [...] }
   - validation.completed { status: 'ok', warnings: [...] }

Resultado en UI:
- "Composición creada con CSTID CST-A1B2C3D4E5"
- "Sugerencia: ¿Es correcto el BPM 128 detectado del proyecto?"
- "Sugerencia: Encontramos tracks exportados en el proyecto, ¿asignar duración?"
- "He creado una grabación asociada con el ISRC del proyecto"
```

---

## 5. Motor de Inferencias

### 5.1 Principio de Funcionamiento

El Motor de Inferencias no es un if-else gigante. Es un sistema basado en reglas que:

1. **Observa** el grafo de conocimiento
2. **Detecta** patrones y ausencias
3. **Deduce** información nueva
4. **Sugiere** acciones al usuario
5. **Automatiza** cuando hay suficiente confianza

### 5.2 Tipos de Inferencia

```
A. INFERENCIA DIRECTA (confianza alta)
   Si existe A → B existe automáticamente
   
   Ejemplo:
   - ISWC asignado → existe Composition → debe haber Writer
   - ISRC asignado → existe Recording → debe haber Artist
   - UPC asignado → existe Release → debe tener mínimo 1 Recording

B. INFERENCIA POR DERIVACIÓN (confianza media-alta)
   Si existe A → probablemente B también existe
   
   Ejemplo:
   - ISRC detectado → buscar metadata en Deezer, Spotify, MusicBrainz
   - Proyecto en Ableton a 128 BPM → probablemente es música dance/electrónica
   - Título contiene "Remix" → marcar como obra derivada

C. INFERENCIA POR CONTEXTO (confianza media)
   Basada en comportamiento histórico del usuario
   
   Ejemplo:
   - Usuario siempre usa BMI → no sugerir ASCAP/SESAC
   - Usuario siempre usa DistroKid → asignar por defecto
   - Productor X aparece en 3 obras → sugerir en la próxima

D. INFERENCIA POR ELIMINACIÓN (confianza variable)
   Si no existe A y debería existir → sugerir crear A
   
   Ejemplo:
   - Composition existe pero no tiene Writers → sugerir agregar writers
   - Recording existe pero no tiene ISRC → sugerir generar ISRC
   - Release tiene tracks pero sin UPC → sugerir obtener UPC

E. INFERENCIA POR CONSISTENCIA (confianza alta)
   Si A y B deberían ser consistentes pero no lo son → detectar conflicto
   
   Ejemplo:
   - Suma de writer shares ≠ 100 → alerta
   - ISRC formato inválido → alerta
   - Dos colaboradores con mismo IPI pero diferente nombre → posible duplicado
```

### 5.3 Catálogo de Reglas de Inferencia

```
REGLAS DE COMPOSICIÓN
──────────────────────

Rule: ISWC_IMPLIES_COMPOSITION
  Trigger: iswc assigned to any entity
  Inference: This ISWC identifies a Composition
  Actions:
    - Create Composition if not exists
    - Link ISWC to Composition
    - Search ISWC in external databases
    - If found, import writers, publishers, PRO
  
Rule: COMPOSITION_NEEDS_WRITER
  Trigger: composition.created or composition updated with no writers
  Inference: Composition must have at least one writer
  Actions:
    - Emit suggestion: "Add at least one writer to this composition"
    - If person with role 'writer' exists in project context, suggest them
  
Rule: WRITER_NEEDS_PUBLISHER
  Trigger: writer added to composition
  Inference: Writer may have a publisher (unless self-published)
  Actions:
    - If writer has default_publisher, assign automatically
    - If writer has no publisher info, ask: "Does this writer have a publisher?"
    - If writer's PRO is known, suggest publishers associated with that PRO

Rule: PUBLISHER_NEEDS_PRO
  Trigger: publisher assigned to composition
  Inference: Publisher must be registered with at least one PRO
  Actions:
    - If publisher has no PRO, suggest PROs based on territory
    - If composition has territory, suggest relevant PRO for that territory

Rule: SPLITS_MUST_SUM_100
  Trigger: composition.share.updated
  Inference: All writer shares must sum to 100%
  Actions:
    - Calculate sum
    - If sum != 100, emit validation.warning
    - If sum > 100, emit validation.error
    - Suggest proportional adjustment

REGLAS DE GRABACIÓN
─────────────────────

Rule: ISRC_IMPLIES_RECORDING
  Trigger: isrc assigned to any entity
  Inference: This ISRC identifies a Sound Recording
  Actions:
    - Create Recording if not exists
    - Link ISRC to Recording
    - Search ISRC in Deezer, Spotify, MusicBrainz
    - Import available metadata (title, artist, album, duration, genre, cover)

Rule: ISRC_TRIGGERS_METADATA_FETCH
  Trigger: isrc assigned to Recording
  Inference: External databases may have metadata for this ISRC
  Actions:
    - Fetch from Deezer (title, artist, album, bpm, genre, cover)
    - Fetch from Spotify (artist, album, popularity, genres)
    - Fetch from MusicBrainz (recording ID, artist ID, release ID)
    - Fetch from Discogs (release info, label, catalog number)
    - Merge and deduplicate results
    - Update Recording with found metadata
    - If UPC found in results, create/update Release

Rule: RECORDING_NEEDS_ARTIST
  Trigger: recording.created with no artists
  Inference: Recording must have at least one artist
  Actions:
    - If project has person with role 'artist', suggest them
    - If composition has writer with performance role, suggest as artist
    - Emit suggestion

Rule: RECORDING_NEEDS_COMPOSITION
  Trigger: recording.created with no composition_id
  Inference: Every recording is a performance of a composition
  Actions:
    - If project has composition, link automatically
    - If ISRC found in external DB, search for associated ISWC
    - Emit suggestion: "Link this recording to a composition"

REGLAS DE RELEASE
──────────────────

Rule: UPC_IMPLIES_RELEASE
  Trigger: upc assigned
  Inference: This UPC identifies a Release
  Actions:
    - Create Release if not exists
    - Search UPC in Discogs, MusicBrainz
    - Import tracks, artists, label, release date

Rule: RELEASE_NEEDS_TRACKS
  Trigger: release.created with no tracks
  Inference: A release must contain at least one track
  Actions:
    - If recordings exist for this project, suggest adding them
    - If UPC found, import track list

REGLAS DE PERSONA
───────────────────

Rule: IPI_VALIDATION
  Trigger: ipi assigned to person
  Inference: IPI has specific format with checksum
  Actions:
    - Validate format (11 digits)
    - Validate checksum
    - If invalid, emit validation.warning
    - If valid, search for IPI in local database for duplicates

Rule: FREQUENT_COLLABORATOR_DETECTION
  Trigger: person added to composition/recording
  Inference: If person appears frequently, they are a frequent collaborator
  Actions:
    - Increment collaboration count
    - If count >= 3, mark as frequent_collaborator
    - Suggest person in future works

REGLAS DE PROYECTO (DAW)
───────────────────────────

Rule: DAW_PROJECT_DETECTED
  Trigger: project detected from DAW plugin or file system
  Inference: A new music project has started
  Actions:
    - Create MusicProject entity
    - Generate CSTID
    - Extract metadata from DAW (bpm, key, time signature, tracks)
    - If composer is known (user), create Composition placeholder
    - Emit event: composition.created (suggested)

Rule: PROJECT_BPM_CHANGED
  Trigger: bpm changed in DAW
  Inference: The musical direction may have changed
  Actions:
    - Update MusicProject.tempo
    - If BPM crosses genre threshold, suggest genre update
    - Log in version_history

Rule: PROJECT_EXPORTED
  Trigger: project exported/bounced
  Inference: A mixdown or stem has been created
  Actions:
    - Create Recording if not exists
    - Set duration from exported file
    - Suggest setting as "current version" of the track
    - Store export path in export_history

REGLAS DE AUTOMATIZACIÓN
───────────────────────────

Rule: AUTO_CREATE_RECORDING
  Condition: Composition exists AND project has exported audio
  Action: Create Recording, link to Composition, set duration

Rule: AUTO_SUGGEST_WRITER_SPLITS
  Condition: Multiple writers added to composition
  Action: Suggest equal split distribution as default
  Example: 3 writers → 33.33% each (or nearest clean fraction)

Rule: AUTO_DETECT_REMIX
  Condition: Title contains "remix", "edit", "version", "rework"
  Action: Mark as derivative, suggest original work lookup

Rule: AUTO_SUGGEST_GENRE
  Condition: BPM is known but genre is not
  Action: Suggest genre based on BPM range
  Example: 140 BPM → Dubstep / Drum & Bass
  Example: 128 BPM → House / Techno
  Example: 90 BPM → Hip-Hop / Trap
  (Note: this is a suggestion, not definitive)
```

### 5.4 Plan de Ejecución de Inferencias

Cuando ocurre un evento, el Inference Engine ejecuta este plan:

```
1. CLASIFICAR el evento
   ├── ¿Es un evento de creación? → Inferencias de estructura
   ├── ¿Es un evento de actualización? → Inferencias de consistencia
   └── ¿Es un evento de detección? → Inferencias de enriquecimiento

2. ANALIZAR el contexto actual
   ├── ¿Qué entidades están involucradas?
   ├── ¿Qué datos están presentes?
   ├── ¿Qué datos faltan?
   ├── ¿Qué prefiere el usuario? (ContextPreference)
   └── ¿Qué histórico existe?

3. APLICAR reglas relevantes
   ├── Filtrar reglas que aplican al tipo de evento
   ├── Ordenar por prioridad (crítico > warning > sugerencia)
   ├── Ejecutar cada regla
   └── Registrar cada inferencia en InferenceLog

4. GENERAR salidas
   ├── Nuevos datos para agregar al grafo
   ├── Validaciones (errores, advertencias)
   ├── Sugerencias para el usuario
   ├── Automatizaciones para ejecutar
   └── Nuevos eventos para encadenar

5. REPORTAR resultados
   ├── Actualizar mie_state de las entidades afectadas
   ├── Notificar a la UI
   ├── Registrar en el historial de la entidad
   └── Emitir inference.completed
```

---

## 6. Motor de Validaciones

### 6.1 Tipos de Validación

```
NIVEL 1: FORMATO (sintaxis)
  ├── ISRC: regex y estructura (CC-XXX-XX-XXXXX)
  ├── ISWC: regex y checksum (T-XXX.XXX.XXX-X)
  ├── IPI: dígitos y checksum
  ├── UPC: 12 dígitos con checksum
  ├── Email: formato estándar
  └── URL: formato URL válido

NIVEL 2: CONSISTENCIA (semántica)
  ├── Splits de composición suman 100%
  ├── Splits de grabación suman 100% (o son válidos)
  ├── Cada composición tiene al menos un writer
  ├── Cada grabación tiene al menos un artista
  ├── Cada release tiene al menos un track
  ├── No hay IPI duplicados en diferentes personas
  ├── No hay ISRC duplicados
  ├── No hay ISWC duplicados
  └── No hay CSTID duplicados

NIVEL 3: LÓGICA DE NEGOCIO (dominio)
  ├── Si existe ISWC, debería existir ISRC (y viceversa, no siempre)
  ├── Si existe UPC, debería haber mínimo 1 ISRC asociado
  ├── Si la obra está publicada, debería tener distribuidor
  ├── Si la obra está en un DSP, debería tener link
  ├── Si hay publisher, debería haber PRO
  ├── Si hay label, debería haber distribuidor
  ├── Los productores deberían tener puntos definidos
  └── Las obras derivadas deberían tener obra original referenciada

NIVEL 4: REGISTRO EXTERNO (verificación)
  ├── ISRC existe en Deezer/Spotify
  ├── ISWC existe en registros públicos (cuando disponibles)
  ├── IPI está registrado en alguna PRO
  ├── UPC existe en bases de datos
  └── No hay conflictos con registros externos
```

### 6.2 Máquina de Validación Continua

La validación no es un evento único. Es un proceso continuo:

```
1. VALIDACIÓN INICIAL
   └── Cuando se crea una entidad
   └── Niveles 1 y 2

2. VALIDACIÓN POR EVENTO
   └── Cada vez que cambia un dato
   └── Re-validar solo lo afectado
   └── Niveles 1, 2 y 3

3. VALIDACIÓN PROGRAMADA
   └── Cada cierto tiempo (diario/semanal)
   └── Verificar registros externos
   └── Nivel 4

4. VALIDACIÓN BAJO DEMANDA
   └── Cuando el usuario solicita "validar todo"
   └── Todos los niveles
```

### 6.3 Reporte de Validación

```typescript
type ValidationReport = {
  entityId: UUID;
  entityType: string;
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'error' | 'incomplete';
  completeness: number; // 0-1 qué tan completa está la metadata
  issues: ValidationIssue[];
  suggestions: ValidationSuggestion[];
};

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  code: string;
  field: string;
  message: string; // en lenguaje natural
  fix?: 'auto' | 'manual';
  autoFixAvailable?: boolean;
};

type ValidationSuggestion = {
  type: 'information' | 'enrichment' | 'correction';
  source: string; // qué regla/inferencia generó esto
  message: string;
  confidence: number;
};
```

---

## 7. Máquina de Estados del Ciclo de Vida

### 7.1 Estados de una Obra Musical (Composición + Grabación)

```
                  ┌──────────────────────────────┐
                  │        DAW PROJECT            │
                  │  (Nace en el estudio)         │
                  │  Estado: semilla               │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │        EN PRODUCCIÓN           │
                  │  (Se está trabajando)         │
                  │  Estado: en_progreso           │
                  └──────────────┬───────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
                    ▼                         ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │   COMPOSICIÓN LISTA     │    │   GRABACIÓN LISTA        │
    │   (Letra, melodía)      │    │   (Track grabado)        │
    │   Estado: escrita        │    │   Estado: grabada        │
    └───────────┬─────────────┘    └───────────┬─────────────┘
                │                              │
                ▼                              ▼
    ┌─────────────────────────┐    ┌─────────────────────────┐
    │   COMPOSICIÓN REGISTRADA│    │   MEZCLADA               │
    │   (ISWC asignado)       │    │   (Mix finalizado)       │
    │   Estado: registrada     │    │   Estado: mezclada       │
    └───────────┬─────────────┘    └───────────┬─────────────┘
                │                              │
                │                              ▼
                │              ┌─────────────────────────┐
                │              │   MASTERIZADA            │
                │              │   (Master final)         │
                │              │   Estado: masterizada    │
                │              └───────────┬─────────────┘
                │                          │
                └──────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        LISTA PARA RELEASE      │
            │   (Completa metadata)          │
            │   Estado: lista                │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        DISTRIBUIDA             │
            │   (Enviada a distribuidor)    │
            │   Estado: distribuida          │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        PUBLICADA               │
            │   (Viva en DSPs)              │
            │   Estado: publicada            │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        REGISTRADA              │
            │   (PRO, MLC, SoundExchange)   │
            │   Estado: registrada           │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        GENERANDO REGALÍAS      │
            │   (Ciclo de royalty activo)   │
            │   Estado: activa               │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │        ARCHIVADA               │
            │   (Catálogo histórico)         │
            │   Estado: archivada            │
            └──────────────────────────────┘
```

### 7.2 Transiciones de Estado

Cada transición es un evento que el MIE procesa:

| Desde | Hasta | Trigger | Validaciones Requeridas |
|-------|-------|---------|------------------------|
| semilla | en_progreso | Primera edición de metadata | Ninguna |
| en_progreso | escrita | Composición completa (writers, título) | Writer(s) asignados |
| en_progreso | grabada | Primera grabación/exportación | Artist(s) asignados |
| escrita | registrada | ISWC asignado | Composición completa |
| grabada | mezclada | Exportación de mezcla final | Ninguna |
| mezclada | masterizada | Exportación de master | Metadata completa |
| masterizada | lista | Validación de publishing aprobada | Splits 100%, ISRC, ISWC |
| lista | distribuida | Envío a distribuidor | Distribuidor asignado, UPC (si álbum) |
| distribuida | publicada | Fecha de release alcanzada | Links a DSPs |
| publicada | registrada | Confirmación de registro en PRO/MLC | Registration status = 'registered' |
| registrada | activa | Primer statement de regalías | Todo completo |
| activa | archivada | Periodo de inactividad > 2 años | Metadata preservada |

### 7.3 Estados del Proyecto (para el MIE)

Además del estado del ciclo de vida, el MIE mantiene un estado interno:

```typescript
type MieProjectState = {
  // Estado de conocimiento
  knowledgeState: 'empty' | 'seeding' | 'growing' | 'rich' | 'complete';
  
  // Estado de validación
  validationState: 'unvalidated' | 'validating' | 'passed' | 'warning' | 'error';
  
  // Estado de registro externo
  externalState: 'unregistered' | 'partial' | 'registered' | 'verified';
  
  // Salud general
  healthScore: number; // 0-100
  nextRecommendedAction: string;
  pendingInferences: string[];
  pendingSuggestions: string[];
  blockingIssues: string[];
};
```

---

## 8. Arquitectura de Automatizaciones

### 8.1 Tipos de Automatización

```
A. AUTOMATIZACIÓN INMEDIATA (sin confirmación)
   └── Acciones que no tienen impacto negativo si son incorrectas
   └── Umbral de confianza: > 90%
   └── Ejemplos:
       ├── Completar BPM desde el proyecto DAW
       ├── Completar tonalidad desde el proyecto DAW
       ├── Asignar duración desde el archivo exportado
       ├── Buscar carátula por ISRC
       └── Validar formato de ISRC/IPI/ISWC

B. AUTOMATIZACIÓN SUGERIDA (con confirmación rápida)
   └── Acciones que requieren validación del usuario
   └── Umbral de confianza: > 70%
   └── Se muestran como notificación con "Aceptar" / "Rechazar"
   └── Ejemplos:
       ├── "Encontramos metadata para este ISRC en Deezer. ¿Aplicar?"
       ├── "Este BPM sugiere género House. ¿Confirmar?"
       ├── "Detectamos 3 writers. ¿Distribuir equitativamente?"
       └── "Este título parece un remix. ¿Buscar obra original?"

C. AUTOMATIZACIÓN PROGRAMADA (batch/cron)
   └── Acciones que se ejecutan periódicamente
   └── Ejemplos:
       ├── Sincronizar catálogo con fuentes externas
       ├── Verificar estado de registros en PROs
       ├── Buscar nuevas metadata para obras incompletas
       └── Generar reportes de salud del catálogo

D. AUTOMATIZACIÓN POR WORKFLOW (secuencia de pasos)
   └── Acciones que requieren múltiples pasos
   └── Ejemplos:
       ├── Workflow: "Registrar obra en PRO"
       │   1. Validar metadata completa
       │   2. Generar archivo CWR
       │   3. Preparar payload para PRO
       │   4. Enviar registro
       │   5. Verificar confirmación
       │   6. Actualizar estado
       │
       ├── Workflow: "Publicar release"
       │   1. Validar todas las grabaciones
       │   2. Verificar ISRCs
       │   3. Verificar metadata de tracks
       │   4. Generar metadata DDEX
       │   5. Enviar a distribuidor
       │   6. Monitorear publicación
       │
       └── Workflow: "Migrar catálogo desde CSV"
           1. Parsear CSV
           2. Validar filas
           3. Buscar duplicados
           4. Enriquecer con fuentes externas
           5. Importar
           6. Reportar resultados
```

### 8.2 Workflow Engine

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  timeout: number; // ms
  onComplete: WorkflowAction;
  onError: WorkflowAction;
}

interface WorkflowStep {
  id: string;
  type: 'validation' | 'inference' | 'external_api' | 'user_input' | 'automation';
  action: string;
  config: Record<string, unknown>;
  timeout: number;
  retryCount: number;
  dependsOn: string[]; // step ids
}

type WorkflowTrigger = 
  | { type: 'event'; eventType: string }
  | { type: 'schedule'; cron: string }
  | { type: 'manual'; label: string }
  | { type: 'condition'; condition: string };
```

---

## 9. Flujo Completo DAW → Royalties

### 9.1 Fase 0: Detección del Proyecto

```
1. El usuario abre su DAW (Ableton, FL Studio, Logic, etc.)
2. CST plugin (o watcher de archivos) detecta:
   - Nuevo proyecto creado
   - Proyecto existente abierto
3. Se genera evento: project.created
4. MIE procesa:
   - Crea MusicProject con CSTID único
   - Extrae metadata inicial: nombre, DAW, versión, sistema operativo
   - Crea placeholder de Composition vinculada
   - Estado: semilla
   - Emite: composition.created (sugerida)
5. UI muestra: "Nuevo proyecto detectado: 'Mi Canción' en Ableton Live 12"
   "CSTID asignado: CST-A1B2C3D4E5"
```

### 9.2 Fase 1: Producción en el DAW

```
1. El usuario trabaja en el proyecto
2. Cada guardado genera evento: project.modified
   - Se actualiza: last_modified, duración, BPM, key, tracks
   - Se registra en version_history (sin guardar el archivo, solo metadata)
3. El usuario agrega instrumentos → project.instrument.added
4. El usuario agrega plugins → project.plugin.added
5. El usuario cambia BPM → project.bpm.changed
   - MIE infiere: posible género basado en BPM
   - Sugiere: "Este BPM (140) sugiere Drum & Bass. ¿Confirmar género?"
6. El usuario exporta/bounce → project.exported
   - MIE: crea Recording con duración del export
   - MIE: vincula Recording a Composition
   - Estado pasa a: grabada
7. MIE mantiene historial completo de versiones del proyecto
```

### 9.3 Fase 2: Composición

```
1. El usuario (o MIE) asigna título definitivo
2. El usuario agrega compositores/writers
   - Si ya existen en contacts, MIE los sugiere automáticamente
   - Si no existen, MIE pregunta: "¿Nuevo colaborador? ¿Datos básicos?"
3. Cada writer: IPI, PRO, Publisher
   - MIE valida IPI
   - MIE sugiere PRO basada en contexto del usuario
   - MIE recuerda publisher por defecto
4. Splits de composición:
   - MIE sugiere distribución equitativa
   - Usuario ajusta si es necesario
   - MIE valida que sumen 100%
5. MIE sugiere: "¿Asignar ISWC? Podemos generarlo o asignarlo después"
6. Estado: escrita
```

### 9.4 Fase 3: Grabación

```
1. El usuario confirma la Recording creada desde el export del DAW
2. MIE asigna ISRC:
   - Si el usuario tiene rango de ISRCs, MIE sugiere el siguiente disponible
   - Si no, MIE guía para obtener ISRC
   - MIE busca el ISRC en Deezer, Spotify, MusicBrainz
   - MIE importa: artista, álbum, duración, género, carátula
3. El usuario agrega artistas:
   - MIE sugiere personas del proyecto o frecuentes
   - Rol: lead, featured, group
4. Splits de grabación (master):
   - MIE pregunta: "¿Quién es dueño del master?"
   - Artistas, label, productor
   - Producer points
5. Estado: grabada → mezclada → masterizada
   - Cada transición es un evento de exportación del DAW
```

### 9.5 Fase 4: Release

```
1. El usuario (o MIE) crea un Release:
   - Single: 1-3 tracks
   - EP: 4-6 tracks
   - Álbum: 7+ tracks
2. MIE asigna las grabaciones al release
3. MIE pregunta: "¿Tienes UPC? Si no, podemos obtenerlo"
4. MIE completa metadata del release:
   - Fecha de release
   - Sello/label
   - Género
   - ℗ y ©
5. MIE valida que todo esté completo
6. Estado: lista
```

### 9.6 Fase 5: Distribución

```
1. El usuario selecciona distribuidor (MIE sugiere el default)
2. MIE genera metadata para distribución:
   - Formato DDEX si el distribuidor lo soporta
   - Metadata completa por track
   - Carátula en tamaño correcto
3. MIE prepara el delivery:
   - Archivos de audio (wav, flac)
   - Metadata en XML/CSV
   - ISRCs por track
   - UPC del release
4. Usuario sube a distribuidor o MIE envía vía API
5. MIE monitorea estado de distribución
6. Estado: distribuida
```

### 9.7 Fase 6: Publicación

```
1. Llega la fecha de release
2. MIE verifica que la obra esté disponible en DSPs:
   - Spotify → spotify_track_id
   - Apple Music → apple_music_track_id
   - Deezer → deezer_track_id
   - YouTube Music → link
   - Tidal, Amazon, etc.
3. MIE actualiza links en la grabación
4. Estado: publicada
```

### 9.8 Fase 7: Registro

```
1. MIE prepara registro en PRO:
   - Genera archivo CWR
   - Verifica compositores, IPIs, publishers
   - Verifica splits
2. MIE prepara registro en The MLC (si aplica):
   - Mechanical rights
   - Obra registrada en E.U.
3. MIE prepara registro en SoundExchange (si aplica):
   - Neighboring rights
   - Artistas y labels
4. Usuario envía los registros (o MIE vía API cuando estén disponibles)
5. MIE verifica estado del registro periódicamente
6. Estado: registrada
```

### 9.9 Fase 8: Regalías

```
1. MIE recibe statements de regalías (manual o API):
   - De PRO → performance royalties
   - De MLC → mechanical royalties  
   - De SoundExchange → neighboring rights
   - De DSPs → streaming revenue
2. MIE asocia cada línea de royalty a la obra correcta
3. MIE calcula splits según los shares registrados
4. MIE genera reportes:
   - Por obra
   - Por período
   - Por persona
   - Por territorio
5. Estado: activa (generando regalías)
```

### 9.10 Fase 9: Archivo

```
1. Después de 2+ años sin actividad
2. MIE cambia estado a: archivada
3. Metadata preservada permanentemente
4. La obra sigue en el catálogo pero no activa
5. Se puede reactivar con nuevo release
```

---

## 10. Estrategia de Integración con CST Actual

### 10.1 Principio de Coexistencia

El MIE NO reemplaza la arquitectura actual de inmediato. **Coexiste** con ella.

```
Fase Actual (MVP):
┌────────────────────────────────────────┐
│   Pantallas → Lógica Directa → DB      │
│   (catalogo.tsx, publishing.tsx, etc.)  │
└────────────────────────────────────────┘

Fase de Transición:
┌────────────────┐  ┌─────────────────────┐
│   Pantallas    │  │   MIE (eventos)     │
│   (sin lógica) │──│   (toda la lógica)  │
└────────────────┘  └─────────┬───────────┘
                              │
                              ▼
                     ┌────────────────┐
                     │   Shared DB    │
                     │  (Supabase)    │
                     └────────────────┘

Fase Final:
┌────────────────────────────────────────┐
│   Pantallas (solo render)              │
│         ↓ eventos ↑ estado             │
│   ┌──────────────────────────┐         │
│   │         MIE              │         │
│   │  (toda la inteligencia)  │         │
│   └────────────┬─────────────┘         │
│                ▼                       │
│   ┌──────────────────────────┐         │
│   │   Knowledge Graph DB     │         │
│   │   + Supabase (persist)   │         │
│   └──────────────────────────┘         │
└────────────────────────────────────────┘
```

### 10.2 Adaptación sin Romper el MVP

```
CAMBIOS MÍNIMOS A LA ARQUITECTURA ACTUAL:

1. AGREGAR (no modificar):
   - Tabla mie_events
   - Tabla inference_logs
   - Tabla context_preferences
   - Tabla mie_project_states (opcional)
   
2. EXTENDER (no reemplazar):
   - works → composition (relación 1:1 inicial, preparar para 1:N)
   - collaborators → composition_shares + recording_shares
   - contacts → persons (extender con IPI, ISNI, PRO details)
   
3. WRAPEAR (no eliminar):
   - auth-middleware.ts → corregir getClaims
   - lovable/ → eliminar
   - fetch wrappers → unificar en shared utils

4. NUEVOS ARCHIVOS (no tocar existentes):
   - src/mie/event-bus.ts
   - src/mie/inference-engine.ts
   - src/mie/validation-engine.ts
   - src/mie/state-machine.ts
   - src/mie/workflow-engine.ts
   - src/mie/knowledge-graph.ts
   - src/mie/types.ts
```

### 10.3 Mapeo Entidades Actuales → Nuevas

```
ACTUAL                    NUEVA (MIE)
──────                    ───────────
works                     MusicProject + Composition + Recording
sessions                  Session
collaborators             CompositionShare + RecordingShare (según contexto)
contacts                  Person
publishing_profiles       ContextPreference (datos de publishing)
work_registrations        Registration
works.channels[]          DSP links + Recording.channels
works.distributor_*       Recording.distributor relacionado
works.cover_path          Recording.cover_url
works.fingerprint (CSTID) CSTID en todas las entidades principales
works.isrc                Recording.isrc
works.iswc                Composition.iswc
works.channel_links       DSP links por Recording
```

---

## 11. Plan de Migración por Fases

### FASE 0: Correcciones Inmediatas (Día 1-2)

```
Objetivo: Que el sistema actual funcione sin errores.

1. ✅ Eliminar src/integrations/lovable/ (ya debería estar)
2. ✅ Corregir auth-middleware.ts: getClaims() → getUser()
3. ✅ Unificar fetch wrappers en shared utility
4. ✅ Verificar que SUPABASE_SERVICE_ROLE_KEY esté en .env
5. ✅ Agregar validación ISRC básica en frontend
```

### FASE 1: Fundación del MIE (Semana 1-2)

```
Objetivo: Crear la infraestructura del MIE sin cambiar la UI.

1. Crear estructura de directorios src/mie/
2. Implementar Event Bus básico
3. Crear tablas:
   - mie_events
   - inference_logs
   - context_preferences
4. Implementar Knowledge Graph (en memoria inicial, DB después)
5. Migrar lógica de Deezer fetch al MIE
6. Crear MieClient hook para que las pantallas se comuniquen con el MIE
7. NO cambiar ninguna pantalla todavía
```

### FASE 2: Motor de Inferencias (Semana 3-4)

```
Objetivo: El MIE comienza a inferir datos.

1. Implementar reglas de inferencia básicas:
   - ISRC → buscar metadata en Deezer/Spotify
   - BPM → sugerir género
   - Proyecto DAW → crear Composition automática
2. Implementar sugerencias en UI (banners/notificaciones)
3. Crear panel de "Sugerencias del MIE" en dashboard
4. Implementar validación de splits
5. Agregar botón "Aceptar sugerencia" / "Rechazar"
6. El MIE aprende de las decisiones del usuario
```

### FASE 3: Refactorización del Modelo de Datos (Semana 5-6)

```
Objetivo: Separar Composition de Recording en la base de datos.

1. Crear tabla compositions (migrar desde works)
2. Crear tabla recordings (migrar campos ISRC, cover, distro desde works)
3. Crear tabla composition_shares
4. Crear tabla recording_shares
5. Migrar datos existentes de works a compositions + recordings
6. Mantener works como VIEW para no romper queries existentes
7. Actualizar queries de pantallas gradualmente
8. NO cambiar pantallas todavía, solo la capa de datos
```

### FASE 4: Simplificación de Pantallas (Semana 7-8)

```
Objetivo: Las pantallas dejan de tener lógica de negocio.

1. Refactorizar auth.tsx → solo envía eventos al MIE
2. Refactorizar catálogo.tsx → MIE maneja filtros, búsqueda, orden
3. Refactorizar obra.$id.tsx → MIE maneja validaciones, splits, sugerencias
4. Refactorizar colaboradores.tsx → MIE maneja detección de frecuentes
5. Refactorizar publishing.tsx → MIE maneja plataformas relevantes
6. Refactorizar dashboard.tsx → MIE calcula KPIs, sugerencias
7. Cada pantalla usa useMie() hook en vez de lógica propia
```

### FASE 5: Knowledge Graph Persistente (Semana 9-10)

```
Objetivo: El grafo de conocimiento vive en la base de datos.

1. Crear tablas de grafo (nodes, edges con propiedades)
2. Migrar relaciones del modelo relacional al grafo
3. Implementar queries de grafo (recorridos, path finding)
4. Implementar detección de duplicados por similitud
5. Implementar sugerencias basadas en caminos del grafo
6. Ejemplo: "Este artista trabajó con este productor en otra obra"
```

### FASE 6: Automatizaciones y Workflows (Semana 11-12)

```
Objetivo: Workflows automáticos para tareas comunes.

1. Workflow: "Registrar en PRO" (CWR generation + status tracking)
2. Workflow: "Publicar release" (metadata validation + DDEX prep)
3. Workflow: "Importar catálogo" (CSV + enrich + deduplicate)
4. Workflow: "Sincronizar metadata externa" (scheduled)
5. Panel de Workflows en UI (progreso, estado, errores)
```

### FASE 7: Integración DAW (Semana 13-16)

```
Objetivo: Detección automática de proyectos desde el DAW.

1. Implementar file watcher para project files (.als, .flp, .logicx, .rpp)
2. Parsear metadata del proyecto (BPM, key, tracks, plugins)
3. Implementar plugin CST (Opcional: VST3/AU para Ableton/FL)
4. Detección de exports y renders
5. Asociación automática de archivos de audio al proyecto
6. Timeline automático del proyecto
```

### FASE 8: Integraciones Externas (Semana 17-20)

```
Objetivo: El MIE se conecta con fuentes externas.

1. Spotify API: metadata, artist info, popularity
2. MusicBrainz: ISRC lookup, release info
3. Discogs: UPC lookup, release info
4. Apple Music: metadata, artwork
5. The MLC: (cuando tengan API pública, preparar adapter)
6. PROs: (cuando tengan API)
7. Distribuidores: (cuando tengan API)
```

---

## 12. Riesgos y Oportunidades

### 12.1 Riesgos

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|-------------|------------|
| **Complejidad del MIE subestimada** | Retrasos | Alta | Implementar por capas, cada fase funcional |
| **Datos existentes en works no migrables** | Pérdida de datos | Baja | Mantener tabla works como VIEW durante transición |
| **Rendimiento del Knowledge Graph** | Lentitud | Media | Usar SQLite local o Redis para queries frecuentes |
| **API de terceros no disponibles** | Funcionalidad limitada | Alta | Adapter pattern, graceful degradation |
| **Usuario confundido por sugerencias** | Abandono | Media | Sugerencias no intrusivas, configurables |
| **Over-engineering** | Demora innecesaria | Media | Priorizar reglas de alto valor, no todas las posibles |
| **Conflicto entre reglas de inferencia** | Resultados incorrectos | Media | Sistema de prioridades, explicit override |
| **Dependencia de DAW plugin** | Adopción limitada | Alta | File watcher como alternativa, plugin es bonus |

### 12.2 Oportunidades

| Oportunidad | Valor | Esfuerzo | Prioridad |
|-------------|-------|----------|-----------|
| **Auto-completar metadata por ISRC** | Alto | Bajo | Inmediata |
| **Detección de duplicados por título** | Alto | Bajo | Fase 1 |
| **Sugerencia de género por BPM** | Medio | Bajo | Fase 2 |
| **Workflow de registro en PRO** | Muy Alto | Medio | Fase 6 |
| **Knowledge Graph para recomendaciones** | Alto | Medio | Fase 5 |
| **DAW file watcher** | Muy Alto | Alto | Fase 7 |
| **Exportación DDEX** | Alto | Medio | Fase 6 |
| **Reportes de salud del catálogo** | Alto | Bajo | Fase 4 |
| **Panel de "siguiente acción" en dashboard** | Alto | Bajo | Fase 2 |
| **Importación inteligente de CSV** | Alto | Bajo | Fase 2 |

---

## 13. Plan de Implementación Incremental

### FASE 0 — HOTFIX (Día 1)

```
Que el sistema funcione ahora.
- auth-middleware.ts: getClaims() → getUser()
- Eliminar lovable/
- Unificar fetch wrappers
```

### FASE 1 — MIE CORE (Semana 1-2)

```
El MIE existe, aunque las pantallas aún no lo usan.

Archivos a crear:
src/mie/
├── types.ts           # Tipos del MIE
├── event-bus.ts       # Event Bus básico
├── event-types.ts     # Catálogo de eventos
├── mie-client.ts      # Hook useMie() para React
├── index.ts           # Export pública

Tablas Supabase:
- mie_events
- inference_logs
- context_preferences

NO tocar pantallas existentes.
```

### FASE 2 — INFERENCIAS BÁSICAS (Semana 3-4)

```
El MIE comienza a sugerir. Las pantallas muestran sugerencias.

Archivos a crear/editar:
src/mie/
├── inference-engine.ts    # Motor de inferencias
├── validation-engine.ts   # Validaciones
├── rules/                 # Reglas
│   ├── isrc-rules.ts
│   ├── bpm-rules.ts
│   ├── split-rules.ts
│   └── project-rules.ts
├── adapters/              # Fuentes externas
│   ├── deezer.adapter.ts
│   ├── spotify.adapter.ts  # (opcional)
│   └── musicbrainz.adapter.ts # (opcional)

Pantallas modificadas (mínimo):
- Dashboard: agregar "Sugerencias del MIE" widget
- No modificar lógica existente, solo agregar
```

### FASE 3 — NUEVO MODELO DE DATOS (Semana 5-6)

```
Separación Composition/Recording.

Migración:
1. CREATE TABLE compositions (desde works)
2. CREATE TABLE recordings (desde works)
3. INSERT INTO compositions SELECT id, title, iswc, ... FROM works
4. INSERT INTO recordings SELECT id, work_id, isrc, cover, ... FROM works
5. CREATE VIEW works_view AS SELECT ... (para no romper queries)
6. Crear composition_shares y recording_shares
7. Migrar collaborators a shares según rol

Tablas nuevas:
- compositions
- recordings
- composition_shares
- recording_shares
- persons (reemplaza contacts gradualmente)
- labels
- publishers
```

### FASE 4 — PANTALLAS DELGADAS (Semana 7-8)

```
Cada pantalla refactorizada una por una:

1. dashboard.tsx → usa MIE para KPIs y sugerencias
2. catalogo.tsx → MIE maneja filtros y orden
3. obra.$id.tsx → MIE maneja validaciones y splits
4. colaboradores.tsx → MIE sugiere frecuentes
5. publishing.tsx → MIE maneja plataformas y estados
6. distribucion.tsx → MIE sugiere distribuidor
7. registros.tsx → MIE calcula estados
8. configuracion.tsx → MIE maneja preferencias
```

### FASE 5 — KNOWLEDGE GRAPH (Semana 9-10)

```
El sistema piensa en grafos:

Tablas:
- graph_nodes (id, type, properties, metadata)
- graph_edges (from, to, type, properties, confidence)

Implementación:
- Migrar entidades a nodos
- Migrar relaciones a aristas
- Query engine para recorridos
- Detección de patrones
- Recomendaciones basadas en el grafo
```

### FASE 6 — WORKFLOWS (Semana 11-12)

```
Automatización de procesos:

- Workflow: Registro en PRO
- Workflow: Publicación de Release
- Workflow: Importación CSV
- Workflow: Sincronización externa
```

### FASE 7 — DAW INTEGRATION (Semana 13-16)

```
El proyecto nace en el DAW:

- File watcher para project files
- Parser de metadata de DAW
- Detección de exports
- Timeline del proyecto
- Plugin opcional VST3/AU
```

---

## 14. Conclusión

CST tiene el potencial de ser **el sistema operativo de la metadata musical**. El Music Intelligence Engine es el cerebro que lo hará posible.

No se trata de agregar más campos a un formulario.

Se trata de construir un sistema que:

- **Sabe** lo que es una composición, una grabación, un release
- **Entiende** cómo se relacionan writers, publishers, PROs, labels
- **Deduce** información donde falta
- **Valida** que todo sea consistente
- **Automatiza** lo que puede
- **Sugiere** lo que no puede automatizar
- **Recuerda** lo que el usuario prefiere
- **Aprende** de cada interacción

El MIE no es una característica más.

El MIE **es** el producto.

Las pantallas son solo ventanas al conocimiento que el MIE tiene.

---

*Documento v1.0 — Julio 2026*
*Próximo paso: Implementación de Fase 0 (hotfixes) + Fase 1 (MIE Core)*