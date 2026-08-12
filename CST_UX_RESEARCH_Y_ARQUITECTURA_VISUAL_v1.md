# CST — UX Research + Arquitectura Visual v1

**Objetivo:** diseñar CST para que una persona con poco conocimiento musical-administrativo pueda proteger y administrar su música sin sentirse abrumada, mientras un productor, compositor, publisher o label experto puede acceder rápidamente a la profundidad de datos que necesita.

**Principio rector:**
> El sistema puede ser complejo por dentro. La experiencia no.

**Modelo mental de producto:**
> Ver → entender → actuar → confirmar → seguir.

---

# 1. Qué problema debe resolver CST

La investigación de fuentes oficiales muestra que una parte importante del riesgo económico del ecosistema musical está en la conexión y calidad de los datos, no solamente en la existencia de un registro.

- Una composición musical y una grabación sonora son obras distintas y pueden tener titulares distintos. Esto exige mantener ambas entidades separadas pero conectadas. (U.S. Copyright Office, Circular 56A / Circular 50)
- CISAC señala que datos IPI ausentes o incorrectos pueden producir asignaciones incorrectas, retrasos y royalties perdidos; el ISWC sirve para identificar las obras musicales y enlazarlas con sus creadores. (CISAC)
- The MLC mantiene herramientas específicas para registrar obras, reclamar shares, buscar obras, encontrar usos no vinculados y proponer matches entre grabaciones y obras. Esto demuestra que el problema operativo central es la conexión correcta entre obra, titulares, shares y grabaciones. (The MLC)
- SoundExchange permite buscar y reclamar grabaciones y advierte que metadata incompleta o incorrecta puede impedir que un uso sea asociado al ISRC correcto. (SoundExchange)
- DDEX separa y relaciona releases, sound recordings, musical works, contributors, identifiers, claims y reporting; la industria necesita que esas relaciones sobrevivan al intercambio de datos. (DDEX)
- BMI/ASCAP recomiendan registrar las obras temprano y resaltan la importancia del metadata correcto y de los shares. (BMI / ASCAP)

**Conclusión UX:** CST no debe presentarse como una base de datos. Debe presentarse como un sistema que continuamente responde:

1. ¿Qué tengo?
2. ¿Qué está completo?
3. ¿Qué está mal?
4. ¿Qué falta?
5. ¿Qué puede afectar mi dinero?
6. ¿Qué debo hacer ahora?
7. ¿Dónde se encuentra cada derecho y cada versión de la información?

---

# 2. Usuario principal y carga cognitiva

CST tendrá cuatro grandes perfiles de uso:

| Perfil | Problema dominante | Lo que necesita ver primero |
|---|---|---|
| Artista / productor independiente | No sabe qué debe hacer después | Próximas acciones + estado de cada obra |
| Compositor / songwriter | Quiere saber si sus obras y shares están bien | Obras + shares + registros + posibles faltantes |
| Publisher / administrator | Necesita profundidad y control | Work details + shares + creators + identifiers + registrations + conflicts |
| Label / equipo profesional | Maneja gran volumen | Catálogo + estado + metadata + releases + recordings + problemas en lote |

**Regla:** la interfaz se adapta por rol sin cambiar el sistema de datos.

---

# 3. Arquitectura mental de CST

## 3.1 El objeto central

La unidad mental principal es la **obra / proyecto musical** y no el módulo administrativo.

```text
                         ┌──────────────────┐
                         │     PERSONAS     │
                         │ writers / artist │
                         │ producers / etc. │
                         └────────┬─────────┘
                                  │
                                  ▼
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   COMPOSITION   │◄────►│       WORK       │◄────►│    RECORDING     │
│ music / lyrics  │      │  entidad central │      │ audio / master   │
└────────┬────────┘      └────────┬─────────┘      └────────┬─────────┘
         │                        │                         │
         ▼                        ▼                         ▼
    SHARES / IPIs            REGISTRATIONS              ISRC / RELEASE
         │                        │                         │
         └───────────────┬────────┴───────────────┬─────────┘
                         ▼                        ▼
                    USAGES / MATCHES        ROYALTIES / CLAIMS
```

La UI debe representar estas relaciones visualmente.

---

# 4. Reglas visuales base

## 4.1 Qué debe estar siempre visible

- Contexto actual: obra / pantalla / ubicación.
- Estado general.
- Acción principal.
- Problemas que bloquean algo.
- Próximo paso.
- Búsqueda global.
- Botón de creación rápida.
- Perfil / cuenta.

## 4.2 Qué NO debe dominar la pantalla

- IDs técnicos largos.
- Campos vacíos.
- Terminología legal innecesaria.
- Menús secundarios.
- Configuración avanzada.
- Datos que no requieren acción.

## 4.3 Direct manipulation

Todo dato visible que tenga sentido debe poder tocarse.

Ejemplo:

`25%` → click → edición inline.

`Bismarck García` → click → persona.

`ISRC` → click → detalles.

`⚠ Attention` → click → explicación y resolución.

`Composition Complete` → click → composición.


# 5. Sidebar global

```text
┌───────────────────────────┐
│  CST                      │
│  Credit Session Track     │
├───────────────────────────┤
│                           │
│  ⌂  Inicio                │
│  ♪  Catálogo              │
│  👥 Personas              │
│  ⚠  Atención              │
│  ✓  Registros             │
│  ◌  Actividad             │
│                           │
├───────────────────────────┤
│  + Crear                  │
│                           │
├───────────────────────────┤
│  ⚙ Configuración          │
│  ? Ayuda                  │
│                           │
│  ● Bismarck García        │
└───────────────────────────┘
```

### Decisión
No esconder funcionalidades esenciales en múltiples niveles del sidebar.

**Catálogo** es la puerta principal.

**Atención** es una bandeja proactiva: cosas que pueden perjudicar el catálogo, no una lista técnica de errores.

**Registros** concentra estados de registros externos y documentación.

**Actividad** conserva trazabilidad sin obligar al usuario a verla para trabajar.

---

# 6. Top bar global

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  ←  CST                    Search anything... ⌕           +     ?    B     │
└───────────────────────────────────────────────────────────────────────────┘
```

Elementos:

1. Back/context control.
2. Global search.
3. Quick create (+).
4. Help.
5. Account.

En páginas de detalle el top bar puede cambiar a:

```text
← Catálogo   /   Midnight                          ⋯   Share   +
```

---

# 7. Dashboard / Inicio

## Lo primero que debe entender el usuario

> **¿Cómo está mi música y qué necesita mi atención?**

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Buenos días, Bismarck                                                     │
│ Aquí está lo importante de tu catálogo.                                   │
│                                                                            │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────────┐ │
│ │ 24            │ │ 17           │ │ 3            │ │ 2                 │ │
│ │ Obras         │ │ Listas       │ │ Atención     │ │ Acciones esta      │ │
│ │ en catálogo   │ │ completas    │ │ requerida    │ │ semana             │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └───────────────────┘ │
│                                                                            │
│ ⚠ NECESITA TU ATENCIÓN                                                    │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Midnight                                            ⚠  Split incompleto │ │
│ │ Falta asignar 10% de la composición.                  Resolver →       │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ No More                                             ⚠  Falta publisher │ │
│ │ No encontramos publisher asociado a este share.       Revisar →       │ │
│ ├────────────────────────────────────────────────────────────────────────┤ │
│ │ Summer Nights                                      ✓  Lista para salir │ │
│ │ Todo lo esencial está completo.                       Ver obra →       │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ TU PRÓXIMO PASO                                                           │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 1  Confirmar shares de “Midnight”                        Continuar →    │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────┘
```

### Regla
No convertir el dashboard en analítica vacía. Cada número debe responder una pregunta o provocar una acción.

---

# 8. Catálogo — vista principal

El catálogo debe ser una **tabla visual**, no una hoja de cálculo.

## Columnas prioritarias

1. Obra / título.
2. Artista / principal.
3. Estado.
4. Composición.
5. Recording.
6. Splits.
7. Registro.
8. Última actualización.

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ CATÁLOGO                                                               + Nueva obra       │
│ Search title, creator, ISRC, ISWC...                         Filtros  │ Vista ▦ ▦       │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ TITLE              ARTIST        STATUS       COMPOSITION  RECORDING   SPLITS    REGISTER  │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ ♪ Midnight         B. García     ⚠ Attention  ✓ Complete   ✓ Complete  ⚠ 90%    ⚠ 1       │
│   Updated 2h ago                                                                        → │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ ♪ Summer Nights    B. García     ✓ Ready      ✓ Complete   ✓ Complete  ✓ 100%   ✓ 3       │
│   Updated yesterday                                                                      → │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ ♪ No More          B. García     ● Draft       ✓ Complete   —          ✓ 100%   —         │
│   Updated Jul 28                                                                         → │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### Al pasar el mouse / tocar una fila

La fila se eleva visualmente y muestra acciones rápidas:

`Open` `Edit` `Duplicate` `More`

No abrir modales para acciones simples.

---

# 9. Filtros del catálogo

```text
STATUS        TYPE          PEOPLE             REGISTRATION
☐ Draft       ☐ Composition  ☐ Writer           ☐ Missing
☐ Attention   ☐ Recording   ☐ Producer         ☐ Submitted
☐ Ready       ☐ Release     ☐ Artist           ☐ Complete
```

Agregar filtros avanzados sólo cuando el usuario los solicite.

---

# 10. Work Detail — pantalla más importante de CST

Esta es la pantalla que más debemos perfeccionar porque sirve al principiante y al profesional.

```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ ← Catálogo / Midnight                                           ⋯ Share  +     │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ♪  MIDNIGHT                                                   ✓ Ready / ⚠     │
│ Bismarck García · Single · 2026                                                │
│                                                                               │
│ [ Overview ] [ Composition ] [ Recording ] [ Credits ] [ Splits ] [ Records ] │
│                                                                               │
├────────────────────────────────────┬──────────────────────────────────────────┤
│ ESTADO                             │ IDENTIFICADORES                          │
│                                     │                                           │
│ ✓ Composition      Complete        │ ISWC     T-123.456.789-0       Copy      │
│ ✓ Recording        Complete        │ ISRC     US-ABC-26-00001        Copy      │
│ ✓ Credits          Complete        │ CSTID    CST-000124             Copy      │
│ ⚠ Splits            Needs review    │                                           │
│ ⚠ Registration      Pending         │                                           │
├────────────────────────────────────┴──────────────────────────────────────────┤
│ PEOPLE / CREDITS                                                               │
│                                                                               │
│ Bismarck García        Writer · Producer · Artist                 50% / 50%  │
│ Maria López            Writer                                      25%        │
│ John Doe               Writer                                      25%        │
│                                                                               │
│ + Add person                                                       View all →  │
├───────────────────────────────────────────────────────────────────────────────┤
│ RIGHTS & SHARES                                                               │
│                                                                               │
│ Composition shares       90% assigned       ⚠ 10% remaining       Fix →        │
│ Publisher coverage      75%               ⚠ 25% unclaimed          Review →   │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│ RECORDINGS                                                                    │
│                                                                               │
│ Master v1         ISRC US-ABC-26-00001       Distributor   DistroKid   ✓       │
│ Release           Single                     Release date   Aug 15, 2026     │
│                                                                               │
├───────────────────────────────────────────────────────────────────────────────┤
│ NEXT ACTION                                                                   │
│ ⚠ Confirm remaining 10% of the composition before registration.   Resolve →   │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Regla crítica
El usuario no debe tener que visitar 6 módulos para entender una obra.

El detalle de la obra debe ser un **resumen 360°**. Los módulos especializados existen para trabajar a profundidad.

---

# 11. Pestaña Composition

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ COMPOSITION                                                               │
│ Midnight                                                                  │
│ Musical work / song                                                      │
├───────────────────────────────────────────────────────────────────────────┤
│ WORK IDENTITY                                                             │
│ Title                    Midnight                                        │
│ Alternate titles         Midnight (Spanish)                              │
│ ISWC                     T-123.456.789-0                     ✓ Verified    │
│                                                                            │
│ CREATORS                                                                   │
│ Writer             IPI             Share       Publisher       Status      │
│ Bismarck García    123456789        50%        Self-admin      ✓           │
│ Maria López        987654321        25%        PRS Publisher   ✓           │
│ John Doe           555555555        25%        —               ⚠           │
│                                                                            │
│ [ + Add creator ]                                                         │
│                                                                            │
│ VALIDATION                                                                 │
│ ✓ Shares sum to 100%                                                      │
│ ✓ All creators identified                                                 │
│ ⚠ Publisher missing for John Doe                                         │
│                                                                            │
│ NEXT → Review registration                                                │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# 12. Pestaña Recording

Debe separar claramente el master de la composición.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ RECORDING                                                                  │
│ Midnight — Main Recording                                                 │
├───────────────────────────────────────────────────────────────────────────┤
│ 🎵 AUDIO                                                                    │
│ Master v1                                      ▶ Play                      │
│ Duration 3:42 · WAV · 24bit                                                │
│                                                                            │
│ IDENTIFIERS                                                               │
│ ISRC      US-ABC-26-00001                   ✓                             │
│ UPC       012345678901                      ✓                             │
│                                                                            │
│ RELEASE                                                                    │
│ Single · DistroKid · Aug 15, 2026                 View release →          │
│                                                                            │
│ RECORDING CONTRIBUTORS                                                     │
│ Artist       Bismarck García                                               │
│ Producer     Bismarck García                                               │
│ Mixer        Ana Ruiz                                                      │
│ Engineer     Carlos P.                                                     │
│                                                                            │
│ OWNERSHIP                                                                  │
│ Sound recording owner       Prudence Records             100%             │
│                                                                            │
│ ✓ Recording metadata complete                                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# 13. Pestaña Credits

La pantalla de créditos debe ser visual y humana.

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ CREDITS                                                                    │
│ Midnight                                                                  │
├───────────────────────────────────────────────────────────────────────────┤
│                     CREATIVE TEAM                                         │
│                                                                            │
│   [avatar]                 [avatar]                  [avatar]              │
│   Bismarck García           Maria López               John Doe             │
│   Artist · Producer         Songwriter                Songwriter            │
│                                                                            │
│   [avatar]                 [avatar]                                         │
│   Ana Ruiz                  Carlos P.                                        │
│   Mixer                     Engineer                                         │
│                                                                            │
│ + Add collaborator                                                        │
│                                                                            │
│ CREDIT COMPLETENESS                                                        │
│ ✓ Songwriters identified                                                   │
│ ✓ Recording contributors identified                                        │
│ ✓ Producer identified                                                      │
│ ⚠ Missing publisher information for 1 creator                              │
└───────────────────────────────────────────────────────────────────────────┘
```

---

# 14. Pestaña Splits

Ésta debe ser una de las experiencias más simples de CST.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ SPLITS                                                                      │
│ Composition — Midnight                                                    │
├────────────────────────────────────────────────────────────────────────────┤
│ TOTAL                                                                       │
│                         90% assigned                ⚠ 10% remaining         │
│                                                                            │
│ Bismarck García     █████████████████████████       50%                    │
│ Maria López         ████████████                    25%                    │
│ John Doe            ████████████                    25%                    │
│                                                                            │
│ + Add participant                                                          │
│                                                                            │
│ ─────────────────────────────────────────────────────────────────────────  │
│ COLLABORATION STATUS                                                       │
│ Bismarck      ✓ Confirmed                                                  │
│ Maria         ✓ Confirmed                                                  │
│ John          ⚠ Pending confirmation                                       │
│                                                                            │
│ [ Save ]                                                                    │
└────────────────────────────────────────────────────────────────────────────┘
```

### Interacción

Click en `50%` → input inline.

Click en el nombre → collaborator drawer.

Click `Pending` → ver/reenviar solicitud.

Si la suma ≠ 100%, CST explica el problema inmediatamente.

---

# 15. Registros

La pantalla de registros debe responder:

> “¿Dónde está registrada esta obra y qué falta?”

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ REGISTROS                                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Obra                Sociedad / sistema      Tipo          Estado              │
│ Midnight            BMI                    Performance   ✓ Registered       │
│ Midnight            The MLC                Mechanical    ⚠ Review           │
│ Midnight            Copyright Office       Copyright      — Not filed       │
│ Midnight            SoundExchange          Recording      ✓ Claimed         │
├──────────────────────────────────────────────────────────────────────────────┤
│ FILTER: All  · Attention  · Pending  · Complete                              │
│                                                                              │
│ [ Open record ]        [ Attach document ]        [ View history ]            │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Importante:** distinguir “registrado”, “enviado”, “pendiente”, “rechazado”, “no requerido” y “no iniciado”.

---

# 16. Atención — motor de ayuda de CST

Este módulo es la manifestación visual del MIE.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ATENCIÓN                                                                    │
│ CST encontró cosas que podrían necesitar revisión.                         │
├────────────────────────────────────────────────────────────────────────────┤
│ 🔴 BLOQUEA                                                                  │
│ Midnight — Splits suman 90%                                                │
│ No se puede completar el registro de la composición.                       │
│                                                      Resolver →             │
├────────────────────────────────────────────────────────────────────────────┤
│ 🟠 REQUIERE REVISIÓN                                                       │
│ No More — Publisher missing                                                │
│ Puede afectar la correcta administración del share.                        │
│                                                      Revisar →              │
├────────────────────────────────────────────────────────────────────────────┤
│ 🔵 RECOMENDACIÓN                                                            │
│ Summer Nights — Verify ISWC                                                 │
│ CST encontró una posible coincidencia con otra fuente.                     │
│                                                      Revisar →              │
└────────────────────────────────────────────────────────────────────────────┘
```

Nunca mostrar “7 warnings” sin explicar el impacto.

Mostrar:

**Problema → por qué importa → qué puede hacer el usuario → acción.**

---

# 17. Personas

Una entidad de persona sirve para compositor, productor, artista, ingeniero, publisher, label, etc.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ PERSONAS                                      + New person                  │
│ Search name, IPI, ISNI, email...                                             │
├────────────────────────────────────────────────────────────────────────────┤
│ Person             Roles              IPI            Works        Status      │
│ Bismarck García    Writer/Producer    123456789      24           ✓          │
│ Maria López        Writer             987654321      8            ✓          │
│ John Doe            Writer             555555555      2            ⚠         │
└────────────────────────────────────────────────────────────────────────────┘
```

Persona detallada:

```text
Bismarck García
Writer · Producer · Artist

IDENTITY
IPI · ISNI · PRO · Publisher

CREDITS
24 works · 17 recordings · 11 releases

ISSUES
⚠ 1 work missing publisher

[ View catalog ] [ Edit identity ]
```

---

# 18. Royalty / Money view futura

CST no debe prometer ingresos que todavía no puede observar. Pero debe preparar la estructura para conectar usos y dinero.

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ROYALTIES                                                                  │
│ What CST can currently verify                                               │
├────────────────────────────────────────────────────────────────────────────┤
│ IDENTIFICATION COVERAGE                                                     │
│ 87% of your recordings have verified identifiers                           │
│ 92% of your works have verified creator/share metadata                     │
│                                                                            │
│ POSSIBLE MISSED CONNECTIONS                                                │
│ 3 recordings not matched to a composition                                 │
│ 2 works have incomplete publisher data                                     │
│                                                                            │
│ [ Review matches ]     [ Open catalog ]                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

Más adelante podrá ampliarse a statements, collection sources, territories, periods, claims y reconciliación.

---

# 19. Onboarding

El onboarding no debe parecer un formulario.

## Pantalla 1

```text
┌─────────────────────────────────────────────────────────┐
│                         CST                              │
│                                                         │
│             Vamos a poner tu música en orden.           │
│                                                         │
│      CST te ayudará a saber qué tienes, qué falta       │
│      y qué debes hacer para proteger tu catálogo.       │
│                                                         │
│                       [ Empezar ]                       │
│                                                         │
│                        1 min aprox.                     │
└─────────────────────────────────────────────────────────┘
```

## Pantalla 2 — ¿Qué haces?

```text
┌─────────────────────────────────────────────────────────┐
│ ¿Cuál describe mejor tu trabajo?                        │
│                                                         │
│ [ 🎤 Artista ]      [ 🎹 Productor ]                    │
│ [ ✍ Compositor ]    [ 📚 Publisher ]                    │
│ [ 💿 Label ]         [ Otros ]                          │
│                                                         │
│ Puedes elegir más de uno.                               │
└─────────────────────────────────────────────────────────┘
```

## Pantalla 3 — nivel de experiencia

```text
┌─────────────────────────────────────────────────────────┐
│ ¿Qué tan familiarizado estás con el negocio musical?    │
│                                                         │
│ ○ Estoy comenzando                                      │
│ ○ Sé algunas cosas                                      │
│ ○ Administro mi música                                  │
│ ○ Trabajo profesionalmente                              │
│                                                         │
│ Esto sólo cambia cómo CST te presenta la información.   │
└─────────────────────────────────────────────────────────┘
```

## Pantalla 4 — objetivo inicial

```text
┌─────────────────────────────────────────────────────────┐
│ ¿Qué quieres resolver primero?                           │
│                                                         │
│ [ Organizar mis canciones ]                              │
│ [ Preparar un lanzamiento ]                              │
│ [ Revisar mis splits ]                                   │
│ [ Organizar mis registros ]                              │
│ [ Entender mi catálogo ]                                 │
└─────────────────────────────────────────────────────────┘
```

## Pantalla 5 — primera obra

CST crea una primera obra con el mínimo necesario.

```text
Título
[ Midnight                                  ]

Artista principal
[ Bismarck García                           ]

[ Continue → ]

Después CST construye el resto progresivamente.
```

---

# 20. Crear una nueva obra

No empezar con 30 campos.

```text
STEP 1
¿Qué estás creando?

[ 🎵 Canción ]  [ 💿 Grabación ]

STEP 2
¿Cómo se llama?

[ Midnight                                  ]

STEP 3
¿Quién participa?

[ Bismarck García ]   [ + Add person ]

STEP 4
¿Cómo se dividió la composición?

[ 50% ] [ 25% ] [ 25% ]

CST valida silenciosamente en segundo plano y sólo interrumpe cuando existe un problema.
```

---

# 21. Drawer lateral para edición rápida

No abrir una página nueva para cambios pequeños.

```text
┌────────────────────────────────────┬─────────────────────────┐
│ Midnight                           │ EDIT PERSON              │
│                                    │                         │
│ ...                                │ Maria López              │
│                                    │ Writer                   │
│                                    │                         │
│                                    │ IPI   [987654321]        │
│                                    │ PRO   [PRS]              │
│                                    │                         │
│                                    │ Publisher                │
│                                    │ [ Example Publishing ]   │
│                                    │                         │
│                                    │ [Cancel]     [Save]      │
└────────────────────────────────────┴─────────────────────────┘
```

---

# 22. Modales

Usar modal sólo para:

- Confirmaciones importantes.
- Acciones destructivas.
- Decisiones que pueden alterar derechos.
- Procesos que requieren firma/confirmación.

No usar modal para editar nombre, share, publisher o metadata simple.

---

# 23. Botón “+ Crear”

Debe existir globalmente.

```text
             +
             │
     ┌───────┴─────────────┐
     │ + New               │
     │                     │
     │ 🎵 Work             │
     │ 💿 Recording        │
     │ 👤 Person           │
     │ 📦 Release          │
     └─────────────────────┘
```

La creación debe mantener el contexto si el usuario está dentro de una obra.

Ejemplo: dentro de “Midnight” → `+ Recording` automáticamente vincula la nueva grabación a Midnight.

---

# 24. Activity

No debe ser el centro de la aplicación.

```text
ACTIVITY

Today
✓ Split confirmed by Maria López
⚠ Metadata changed for Midnight
✓ ISRC assigned to Summer Nights

Yesterday
✓ New collaborator added
✓ Recording uploaded
```

Cada evento debe poder abrir el objeto afectado.

---

# 25. Settings

Organizar por intención, no por tecnología.

```text
SETTINGS

Account
  Profile
  Security
  Notifications

Music identity
  Artist names
  Writer identities
  IPI / ISNI
  Default publisher

Organizations
  PROs / CMOs
  Publishers
  Labels
  Distributors

Integrations
  DistroKid
  DAW / plugin
  APIs

Preferences
  Language
  Display
  Guidance level

Advanced
  Data export
  Audit log
  Developer / API
```

**Guidance level** puede cambiar la cantidad de explicación visual sin alterar los datos.

---

# 26. Sistema de estados

CST necesita un lenguaje visual consistente.

| Estado | Visual | Significado |
|---|---|---|
| Draft | ○ | Existe pero aún no está completo |
| In progress | ◐ | Hay trabajo activo |
| Complete | ✓ | Cumple las reglas actuales |
| Attention | ⚠ | Requiere revisión pero no bloquea todo |
| Blocked | ! | No puede continuar sin resolverlo |
| Pending | ◌ | Esperando una persona o sistema externo |
| Verified | ✓✓ | CST tiene evidencia suficiente |
| Conflict | ⇄ | Dos fuentes no coinciden |

No usar "green = good" como única información.

---

# 27. Cómo debe comportarse MIE hacia la UI

MIE no debe aparecer como una IA que habla continuamente.

Debe comportarse como inteligencia silenciosa:

```text
DATA
  ↓
MKB
  ↓
RULES / INFERENCE
  ↓
CONFIDENCE + SOURCE + CONTEXT
  ↓
UX
```

En la interfaz, esto se traduce a:

> ✓ Verified

> ⚠ Possible duplicate

> ⚠ Missing publisher

> Suggested match

> Needs confirmation

La UI debe esconder la complejidad del motor y mostrar únicamente la consecuencia útil.

---

# 28. Confianza y origen del dato

Cuando CST tenga varias fuentes, el usuario debe poder entender por qué el sistema cree algo.

Ejemplo:

```text
ISWC
T-123.456.789-0   ✓ Verified

Sources
• CISAC / IPI context
• User confirmed
• BMI registration

Last verified
Jul 31, 2026
```

Esto será crítico para publishers y labels.

---

# 29. Publisher View

Un publisher necesita una densidad superior de información.

Primera vista de una obra:

```text
WORK
Midnight

IDENTIFIERS
ISWC · IPI(s) · internal work ID · society IDs

RIGHTS
Writer share | Publisher share | Collection share

PARTIES
Writers | publishers | administrators

RECORDINGS
ISRC(s) | versions | releases

REGISTRATIONS
Society | status | territory | date

MATCHING
Matched recordings | unmatched usage | conflicts

AUDIT
Source | last update | who changed | evidence

A publisher puede entrar en cualquier elemento sin salir de la obra.
```

---

# 30. Label View

La prioridad cambia a releases, recordings, identifiers y supply chain.

```text
RELEASE
  ↓
TRACKS
  ↓
RECORDINGS
  ↓
WORK LINKS
  ↓
CONTRIBUTORS
  ↓
IDENTIFIERS
  ↓
DISTRIBUTION / DSP
  ↓
REGISTRATION / ROYALTY CONNECTIONS
```

La tabla de label debe poder operar en lote.

---

# 31. Producer View

El productor necesita algo especialmente claro:

- dónde está acreditado;
- qué porcentaje tiene;
- qué grabaciones contiene su trabajo;
- si existe documentación/LOD cuando aplique;
- qué información falta;
- en qué estado está el registro.

Vista:

```text
MY PRODUCER CATALOG

Recording        Artist        Producer Share   Credits   Status
Midnight         B. García     25%               ✓         ✓
No More          A. Rivera     3%                 ⚠         ⚠
Summer Nights    B. García     10%                ✓         ✓
```

---

# 32. Principio para principiantes vs expertos

### Beginner mode

Mostrar:

- qué está bien;
- qué falta;
- qué significa;
- qué hacer después.

### Professional mode

Mostrar además:

- identificadores;
- sources;
- registrations;
- territories;
- shares;
- detailed metadata;
- conflicts;
- audit history.

### Nunca duplicar datos

Es el mismo objeto de CST. Sólo cambia la profundidad de la presentación.

---

# 33. La pantalla ideal debe contestar estas preguntas en 5 segundos

Para cualquier obra:

1. ¿Qué canción estoy viendo?
2. ¿Está completa?
3. ¿Hay algo que puede costarme dinero?
4. ¿Quién tiene qué parte?
5. ¿Cuál es la composición?
6. ¿Cuál es la grabación?
7. ¿Cuáles son los identificadores?
8. ¿Dónde está registrada?
9. ¿Qué falta?
10. ¿Cuál es el siguiente paso?

Si una pantalla no permite contestar esas preguntas, revisar su jerarquía visual.

---

# 34. Arquitectura final propuesta de navegación

```text
CST
│
├── Inicio
│   ├── Health of Catalog
│   ├── Needs Attention
│   └── Next Action
│
├── Catálogo
│   ├── Works
│   ├── Recordings
│   ├── Releases
│   └── Search / Filters
│
├── Personas
│   ├── Writers
│   ├── Artists
│   ├── Producers
│   ├── Publishers
│   ├── Labels
│   └── Organizations
│
├── Atención
│   ├── Blockers
│   ├── Warnings
│   ├── Conflicts
│   ├── Missing data
│   └── Suggestions
│
├── Registros
│   ├── PRO / CMO
│   ├── Mechanical
│   ├── Sound recording
│   ├── Copyright
│   └── Documents
│
├── Actividad
│
└── Configuración
    ├── Account
    ├── Identity
    ├── Organizations
    ├── Integrations
    ├── Preferences
    └── Advanced
```

---

# 35. Lo que debe salir de la primera versión visual

La primera versión visual de alta fidelidad debe representar juntas estas pantallas, respetando el mismo sistema de diseño:

1. Onboarding — bienvenida.
2. Onboarding — perfil y experiencia.
3. Dashboard.
4. Catálogo en tabla.
5. Work Detail / Overview.
6. Composition.
7. Recording.
8. Credits.
9. Splits.
10. Records.
11. Attention Center.
12. Person Detail.
13. Settings.
14. Quick Create.
15. Drawer de edición.

**No crear cada pantalla como un producto distinto.** Deben parecer inequívocamente parte del mismo sistema.

---

# 36. Dirección visual para la futura imagen / mockup

La imagen de storyboard debe usar:

- desktop app SaaS de alta calidad;
- fondo cálido neutro o gris muy claro;
- blanco y neutrales como base;
- un solo color de acento sobrio;
- bordes suaves;
- sombras muy ligeras;
- mucho espacio en blanco;
- tipografía moderna y altamente legible;
- iconos simples, consistentes y reconocibles;
- tablas limpias;
- tarjetas con información jerarquizada;
- estados muy claros;
- botones compactos, no gigantes;
- microinteracciones sugeridas visualmente;
- nada futurista;
- nada neon;
- nada de glassmorphism excesivo;
- nada de dashboard financiero genérico;
- nada de apariencia “developer tool”.

La sensación buscada es:

**“Professional music workspace + calm personal assistant.”**

No:

**“Enterprise admin panel.”**

---

# 37. Conclusión de UX

CST no debe intentar hacer que el usuario aprenda a navegar una base de datos musical.

Debe aprender el contexto del usuario y mostrar la siguiente acción correcta.

La experiencia ideal es:

```text
                 USUARIO
                    │
                    ▼
             “Quiero lanzar esto”
                    │
                    ▼
                CST entiende
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       MKB / DATA          MIE / RULES
          │                   │
          └─────────┬─────────┘
                    ▼
              PRIORIDAD UX
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       ✓ Ready    ⚠ Review   ! Blocked
          │         │          │
          └─────────┼──────────┘
                    ▼
              [ Próximo paso ]
```

**Meta de diseño:** el usuario no debe preguntarse “¿dónde está la opción?”. Debe reconocerla cuando la necesita.

---

# Fuentes principales consultadas

- U.S. Copyright Office — Circular 50, Circular 56 y Circular 56A: diferencia entre musical works y sound recordings y requisitos de registro.
- CISAC — International Identifiers, Information Services, CWR/CAF y API de contexto ISWC/IPI.
- The MLC — Tools, Public Work Search, Matching Tool, DURP, self-administered songwriter resources, publisher resources y work registration.
- SoundExchange — Registration, Search & Claim, ISRC matching, producer/mixer/engineer royalty guidance y Letters of Direction.
- DDEX — ERN, MEAD, PIE, RIN, CWR-related ecosystem, recording/work linking y reporting standards.
- ASCAP — Songview, IPI, ISWC, registration y royalty metadata.
- BMI — song registration, publisher/self-published handling, metadata y royalty policy.

---

# Evidencia particularmente importante encontrada

1. The MLC reportó en su recapitulación de royalties 2025 aproximadamente **$328.2 millones de blanket unmatched royalties**, equivalentes al **7.8% de los royalty pools procesados**. Esto convierte el problema de matching en una prioridad de producto, no en un detalle técnico.
2. CISAC afirma que datos IPI ausentes o incorrectos pueden generar misallocations, retrasos y royalties perdidos.
3. SoundExchange explica que metadata incompleta o inexacta puede impedir la identificación correcta de una grabación mediante ISRC.
4. DDEX estructura el intercambio alrededor de obras, grabaciones, releases, contributors, identifiers, claims y reporting, confirmando que CST necesita una arquitectura de relaciones y no sólo campos sueltos.
5. La U.S. Copyright Office confirma que composición y grabación son obras separadas; CST debe mantener esa distinción en toda la UX.

**Fuente económica más importante para la estrategia:** The MLC 2025 Annual Royalty Recap.
