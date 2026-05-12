# Discovery Brief — Veronica

**Fecha:** 2026-05-10 (revisado para alcance MVP)
**Tipo de proyecto:** Agente de prospección B2B — automatización de discovery + enrichment
**Nombre del producto:** Veronica
**Tagline:** Un agente de prospección.
**Versión:** 1.0 (refundación desde MVP vibecoded "Prospektiv")
**Restricciones duras:** Solo (Sebastian), deploy en Fly.io, costo por run ≤ $1.00 (target $0.50 para 50 empresas), stack TypeScript + Python microservicio

---

## ⚠️ Lectura obligatoria — alcance actual: MVP 6 horas

**Este documento describe la VISIÓN COMPLETA del producto.** Sirve como brújula a largo plazo.

**El alcance que vamos a construir AHORA es un MVP de máximo 1 día / 6 horas de implementación** para mostrarle al cliente que el concepto funciona end-to-end. Decisión tomada el 2026-05-10 mid-sesión.

- Los 6 engines existen en el MVP, en **versión light** (lógica mínima viable, sin precisión fina, sin optimización).
- Éxito MVP: "quiero 10 empresas de cortinas" → corre todo solito → CSV con 10 empresas + contactos.
- Lo sofisticado (Thompson Sampling, pgvector, anti-bot tier system, confidence calibration paper, multi-tenant) NO va en MVP. Está descrito en este documento como visión, pero queda como **roadmap post-MVP** en `timeline.md`.
- Specs MVP serán cortos, acotados a "qué hace esta versión light". No specs sobredimensionados.

**Cuando leas este documento durante MVP, aplica este filtro:** *¿es la versión más barata y rápida que demuestre el concepto al cliente? ¿Cabe en las 6h?* Si no → fuera del MVP, va a post-MVP.

**Mapeo MVP light vs Full** (versión condensada — ver detalle en `timeline.md` y `memory/project_veronica.md`):

| Engine | MVP (light, 6h) | Full (post-MVP) |
|---|---|---|
| 1 Context | Opus 1 call sin cache | + cache 90d + reuso cross-industria |
| 2 Source Discovery | Brainstorm Opus → Tavily → URLs | + sample + Thompson Sampling + sources_catalog |
| 3 Discovery | Crawl4AI default + Haiku + dedup por dominio exacto | + adaptive crawling tuneado + dedup pgvector |
| 4 Verification | Sonnet score 0-1 simple, gate ≥ 0.6 | + cross-check news/IG + calibración paper |
| 5 Contact | Solo Camino A (Apollo) → CSV | + Camino B LinkedIn + Camino C Instagram |
| 6 Anti-bot | fetch → Browserbase fallback directo | + Crawl4AI stealth tier + domain_anti_bot_history |

**Core concept bloqueante para MVP:** solo **CC-01 Workers & Queues**. Los demás CCs (anti-bot, Thompson Sampling, adaptive crawling, pgvector, confidence calibration) NO bloquean MVP — sus engines van en versión light. Se estudian al abordar la sofisticación post-MVP.

---

## 1. Problema

Una empresa de instalación y distribución de vidrios importados en Colombia quiere operar un canal B2B identificando empresas "mid-market ocultas" — instaladores de cortinas, diseñadores de interiores, constructoras — para construir alianzas comerciales.

Este segmento no aparece en búsquedas de Google Maps ni en bases de datos de contactos genéricas (Apollo). Aparece en fuentes de industria: gremios, premios de diseño, revistas especializadas colombianas, ferias, asociaciones. El proceso de encontrarlos es hoy 100% manual, no sistematizado, no reproducible, y toma horas por iteración.

El costo de no resolverlo: el canal B2B nunca arranca o arranca con leads de baja calidad que no convierten.

---

## 2. Usuario / persona

**MVP (ahora):** 1 operador — la persona responsable de alianzas B2B en la empresa de vidrios. Técnico, corre el pipeline, descarga el CSV, lo pasa al equipo comercial.

**v2:** Todo el equipo comercial del cliente (no técnicos) usa la UI.

**v3:** Múltiples clientes con sus propios espacios aislados (multi-tenant).

**Diseño actual:** single-user con cimientos preparados para escalar (tenant_id + user_id en todas las tablas desde día 1, hardcodeados a valores únicos hoy).

---

## 3. Cómo se resuelve hoy

Manual: búsqueda en Google, revisión individual de webs, intento de contactos en LinkedIn. No hay pipeline, no hay criterio uniforme, no hay historial.

**Competidor más cercano:** Origami (Product Hunt #1, feb 2026). Hace lo mismo pero está optimizado para US/tech con fuentes de funding (Crunchbase). Gap explícito: no tiene anti-bot real, no diferencia fuentes por industria nicho, no aprende entre queries. En Colombia, donde las fuentes viven en gremios y revistas especializadas, Origami falla.

**Por qué no usar Deep Research de Claude/OpenAI:**
- Output es prosa, no tabla de entidades para pasar a Apollo
- No controla anti-bot ni proxies
- Sin presupuesto de tokens por fuente — gasta lineal
- No aprende: la query 100 cuesta lo mismo que la query 1
- Source discovery flojo en nichos LatAm (no conoce gremios colombianos)

---

## 4. Éxito medible

- Query "instaladores de cortinas en Colombia" sin fuentes manuales → ≥30 empresas únicas en ≤15 minutos.
- ≥5 tipos de fuente distintos representados (gremios, premios, revistas, directorios, Instagram).
- ≥60% de empresas tienen al menos 1 contacto identificado.
- Costo por run ≤ $1.00 para 50 empresas (target $0.50).
- La 5ª query sobre industria similar es ≥30% más barata que la 1ª (Knowledge Graph funcionando).

---

## 5. Moat competitivo

Tres ventajas defendibles vs Origami y similares:

1. **Foco 100% Colombia** — entiende gremios (CIDI, Asocretto), asociaciones, premios (Lápiz de Acero), revistas (AXXIS, Casa Viva), ferias (Expoconstrucción), registros de industria colombianos. Los competidores genéricos no conocen estas fuentes.
2. **Anti-bot real** — los nichos colombianos viven en sitios con Cloudflare, WordPress viejo, y protecciones básicas. Nuestro engine traversa estos sitios; los competidores genéricos retornan 403.
3. **Knowledge Graph que aprende** — cada run alimenta qué fuentes rinden por industria. La query 50 sobre diseño de interiores es mucho más barata que la query 1. Origami empieza desde cero cada vez.

---

## 6. Arquitectura propuesta

### Stack

| Capa | Tecnología | Razón |
|---|---|---|
| Frontend | Next.js 14 App Router + Tailwind + Shadcn/ui | Existente, funciona, dark palette "Dark Technical Tool" |
| API / Thin layer | Next.js API routes (Fly.io) | Crea jobs, expone status, sirve UI |
| Job orchestration | Inngest | Workers de larga duración (15+ min), retries, observabilidad nativa |
| DB | Neon Postgres + Drizzle ORM + pgvector | Persistencia + embeddings para dedup semántico |
| Crawler | Crawl4AI (Python microservicio en Fly.io) | Adaptive crawling: 95% reducción de costo vs crawler naive |
| Anti-bot managed | Browserbase | Sitios con Cloudflare/fingerprinting — Crawl4AI falla, Browserbase pasa |
| Search API | Tavily / Exa | LLM-friendly, devuelven contenido limpio, no SERP HTML |
| LLM razonador | Claude Opus 4.7 | Context Engine, Source ideation, decisiones complejas |
| LLM commodity | Claude Haiku 4.5 | Extracción de entidades, clasificación — 30x más barato que Opus |
| LLM validación | Claude Sonnet 4.6 | Verification judge — balance precisión/costo |
| Instagram scraping | Apify | Industrias creativas: hashtag + bio → empresas + contactos |
| Email | Resend + React Email | Sistema unificado de emails (alertas + auth) via Inngest |
| Deploy | Fly.io (ahora) → Hetzner VPS (cuando métricas lo indiquen) | Fly.io: buen DX, sin timeout, Docker nativo. Hetzner: más barato a escala |

### Flujo del pipeline

```
[Usuario: "instaladores de cortinas en Colombia", cantidad: 50 empresas]
        │
        ▼
[POST /api/jobs] → crea job en Postgres → Inngest event
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 1 — Context Engine                   │
│ Input: vertical                             │
│ Output: perfil de búsqueda de la industria  │
│   • Dónde se esconden las empresas          │
│   • Qué fuentes existen (gremios, premios,  │
│     registros, Instagram, ferias)           │
│   • Comportamientos que afectan visibilidad │
│   • Estrategias multi-LLM combinadas        │
│ Lee del Knowledge Graph industrias afines   │
│ LLM: Opus (1 call) + research library       │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 2 — Source Discovery                 │
│ Input: perfil de industria                  │
│ Output: URLs concretas de fuentes           │
│   • Brainstorm 15-25 tipos de fuente        │
│   • Tavily/Exa → URLs reales por tipo       │
│   • Sample rápido (1-3 páginas) → ¿rinde?  │
│   • Bandit update: premia fuentes con yield │
│ LLM: Opus (ideation) + Haiku (clasificación)│
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 3 — Discovery                        │
│ Input: URLs de fuentes validadas            │
│ Output: lista de empresas raw               │
│   • Anti-bot engine decide cómo scrapear   │
│   • Crawl4AI adaptive (info-gain + stop)    │
│   • Haiku extrae nombres + dominios         │
│   • Dedup por dominio + embeddings          │
│ LLM: Haiku (extracción)                    │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 4 — Verification                     │
│ Input: empresas raw                         │
│ Output: empresas con confidence score 0-1   │
│   • Busca dominio real (Tavily + fallback)  │
│   • Cross-check noticias                    │
│   • Instagram check (industrias creativas)  │
│   • LLM judge calibrado (Sonnet)            │
│     → confidence score real, no alucinado  │
│     → paper arxiv 2509.19557               │
│   • Gate: pasan score ≥ 0.6                │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 5 — Contact / Apollo                 │
│ Input: empresas verificadas (score ≥ 0.6)   │
│ Output: CSV con contactos                   │
│   • Camino A: Apollo org enrich + people    │
│   • Camino B: LinkedIn search (fallback)    │
│   • Camino C: Instagram bio (creativos)     │
│ Datos de contacto NO se guardan en DB       │
│ → viven solo en el CSV del job             │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ ENGINE 6 — Anti-bot (capa transparente)     │
│ Decision tree por URL:                      │
│   fetch nativo → ok? → done                │
│   ↓ 403/429/cloudflare                     │
│   Crawl4AI stealth → ok? → done            │
│   ↓ falla                                  │
│   Browserbase managed → done o dead        │
│ Estado: domain_anti_bot_history en Postgres │
│ → segunda visita salta al tier correcto     │
└─────────────────────────────────────────────┘

[UI /jobs/:id] — polling cada 3s → tabla incremental + costos en tiempo real
```

### Persistencia — Schema mínimo (Neon Postgres + Drizzle)

```
tenants           — tenant_id, name (single tenant hoy, multi en v3)
users             — user_id, tenant_id, email, role
jobs              — job_id, tenant_id, user_id, query, status, cost_usd, created_at
job_events        — job_id, engine, step, message, cost_cents, ts
sources_catalog   — industry_slug, source_type, source_url_pattern, alpha, beta (bandit)
sources_discovered— job_id, url, source_type, yield_count, crawled_at, expires_at (60d)
industry_context  — industry_slug, context_json, created_at, expires_at (90d)
companies_raw     — job_id, name, domain, source_url, extraction_confidence, expires_at (7d)
companies_verified— job_id, name_canonical, domain, validation_score, signals_json, expires_at (30d)
companies_master  — name_canonical, domain, embedding vector(1536), first_seen, last_seen
domain_anti_bot   — domain, working_tier, last_tested_at
emails_queue      — manejado vía Inngest events (no tabla propia)
```

**Contactos:** NO se guardan en DB. Se generan por job y viven solo en el CSV descargable.

**TTLs y cleanup:** columna `expires_at` en tablas cacheables. `pg_cron` semanal hace `DELETE WHERE expires_at < NOW()`. Nunca se almacena HTML crudo — solo texto extraído (max 3000 chars) o JSON estructurado.

### Alternativas descartadas

- **Vercel como runtime:** descartado — timeout de 300s no aguanta engines de 15+ min.
- **Firecrawl en vez de Crawl4AI:** descartado — Firecrawl cobra $16-83/mes y no tiene adaptive crawling nativo (la pieza que reduce costo 95%).
- **RUES como fuente:** descartado — no soporta filtrado por CIIU para obtener listas de empresas; solo lookup por NIT/nombre individual.
- **Deep Research (Claude/OpenAI):** descartado — output es prosa, no tabla; no controla anti-bot; no aprende entre queries; source discovery flojo en nichos LatAm.
- **Skyvern self-hosted:** descartado por mantenimiento — usamos Browserbase managed.
- **n8n:** marginalizado desde el MVP vibecoded (Prospektiv); lógica migrada a TypeScript.

---

## 7. Engines — resumen

| # | Engine | LLM | Estado |
|---|---|---|---|
| 1 | Context Engine | Opus (razonador) | Nuevo |
| 2 | Source Discovery | Opus (ideation) + Haiku (clasificación) | Nuevo |
| 3 | Discovery (scrape → empresas) | Haiku (extracción) | Existe, refactor |
| 4 | Verification (dominio + score) | Sonnet (judge calibrado) | Existe, refactor |
| 5 | Contact / Apollo (KDMs → CSV) | — | Existe, refactor |
| 6 | Anti-bot (capa transparente) | — | Nuevo |

---

## 8. Auth y acceso

**MVP actual:** Basic auth (middleware Next.js, password en env var). Protege de crawlers y consumo accidental de APIs.

**Spec completo para v2 (implementar cuando llegue el equipo o segundo cliente):**
- Email/password + Google OAuth (Clerk o NextAuth)
- Roles: admin (ve todo, configura), operator (crea jobs, descarga CSVs), viewer (solo lectura)
- Confirmación de cuenta por email, recuperación de contraseña
- Todo sale del mismo sistema de email queue (Inngest + Resend)

**Cimientos desde día 1:** función `getCurrentContext()` que hoy retorna user hardcodeado. Cuando se implemente auth, solo cambia esa función.

---

## 9. Costos y observabilidad

### Control de costos

- **Kill switch por job:** $1.00 máximo por run (target $0.50 para 50 empresas). Job se para y notifica.
- **Estimado antes de correr:** el frontend calcula costo estimado según (cantidad de empresas × nivel de contexto) antes de lanzar.
- **Tracking granular:** cada llamada a API/LLM registra costo en `job_events.cost_cents`.

### Breakdown de costo esperado (50 empresas)

| Componente | Costo estimado |
|---|---|
| Engine 1 Context | ~$0.05 (Opus 1 call + reuso KG) |
| Engine 2 Source Discovery | ~$0.08 (Opus ideation + Tavily) |
| Engine 3 Discovery (scrape + extracción) | ~$0.12 (Crawl4AI + Haiku) |
| Engine 4 Verification (50 empresas) | ~$0.15 (Tavily + Sonnet judge) |
| Engine 5 Contact/Apollo (50 empresas) | ~$0.10 (Apollo API) |
| **Total** | **~$0.50** |

### Observabilidad

- **UI del job:** costo acumulado en tiempo real + estimado de costo antes de lanzar.
- **Admin dashboard `/admin`:** histórico de todos los jobs, costo total del mes, costo promedio por engine, breakdown por API, alertas, logs de errores.
- **Migración a Hetzner:** el dashboard muestra CPU p95, RAM, jobs/hora, costo/run, tiempo de respuesta p95. Cuando cualquier métrica se acerca al límite de la máquina Fly.io → señal de migración.
- **Logger:** Pino (structured JSON, non-blocking). Cada error captura `error_context` JSON completo (engine, step, input, API response, tokens, costo) — formato legible por IA para diagnóstico rápido.

### Sistema de emails (Inngest + Resend + React Email)

Un solo sistema de queue para todos los emails:
- Kill switch alcanzado → email de alerta al admin
- Job completado → email con resumen + link al CSV
- (v2) Confirmación de cuenta, recuperación de contraseña

---

## 10. Rate limiting

- Por job: hard cap $1.00, kill switch automático.
- Por usuario (v2): max N jobs/día configurable por tenant.
- No hay rate limiting por IP en MVP (single user).

---

## 11. Testing

- **Unit tests:** fixtures grabados por engine. Input conocido → output esperado. Sin llamadas reales a APIs externas.
- **Integration tests (CI):** llamadas reales pero con restricciones: Haiku siempre (nunca Sonnet/Opus en CI), payloads mínimos (1 fuente, 3-5 empresas), APIs no-LLM con record-and-replay para evitar costo en cada CI run.
- **Principio:** minimizar tokens en tests — priorizar costo sobre precisión.

---

## 12. Operación AI-first (minimal)

Cuando algo falla en producción:

1. Pino captura `error_context` JSON estructurado: engine, step, input, respuesta API, tokens, costo acumulado.
2. Admin dashboard muestra los últimos N errores con el JSON completo en formato copiable.
3. Email de alerta incluye el mismo `error_context`.
4. El operador copia el JSON, lo pega a Claude → diagnóstico + pasos de resolución.

No hay automatización de resolución en MVP. Humano + IA deciden y ejecutan.

---

## 13. Knowledge Graph y aprendizaje

Cada run alimenta los siguientes:
- `sources_catalog` con Thompson Sampling (alpha/beta por industria + tipo de fuente). La 5ª query sobre diseño de interiores prioriza tipos de fuente que ya rindieron.
- `industry_context` con contexto de búsqueda de industrias procesadas. Industrias adyacentes (vidrios ↔ constructoras) reutilizan contexto parcialmente.
- `companies_master` con embeddings pgvector para dedup semántico cross-job.

---

## 14. Fuera de scope (explícito)

- **Multi-tenant / billing / quotas por cliente** — v3. Cimientos listos (tenant_id en schema), implementación no.
- **Auth con roles completos** — v2. Spec completo escrito, implementación cuando llegue el equipo.
- **RUES como fuente** — no soporta filtrado por CIIU para listas. Descartado.
- **Datos de contacto en DB** — solo en CSV por job. No se persisten.
- **Deep crawl de sub-páginas internas de empresas** — v2.
- **Scoring / ranking de leads** — v2.
- **Integración CRM / secuencias de outreach** — v3.
- **Validación de email (NeverBounce/Hunter)** — v2.
- **Refinement conversacional post-job** — v2.
- **Tusdatos.co** — capa pago de validación colombiana. Opcional, v2.
- **Skyvern self-hosted** — demasiado mantenimiento. Usamos Browserbase.
- **Multi-idioma** — solo español/Colombia en MVP.

---

## 15. Riesgos y supuestos

- **Riesgo: Apollo tiene cobertura baja en mid-market colombiano** (60-73% según G2). Mitigación: Camino B (LinkedIn) y Camino C (Instagram bio) como fallbacks. El CSV muestra por qué camino vino el contacto.
- **Riesgo: Browserbase no pasa todos los anti-bot** — algunos sitios con captcha manual quedan fuera. Mitigación: marcar como `dead` en `domain_anti_bot_history`, seguir con el resto.
- **Riesgo: Crawl4AI como subprocess Python agrega complejidad en Fly.io** — dos procesos en el mismo deploy. Mitigación: microservicio Python separado dentro del mismo Fly.io app con comunicación HTTP interna.
- **Riesgo: costo supera $0.50 con contexto profundo** — el kill switch a $1.00 protege el wallet. El estimado pre-job da visibilidad antes de correr.
- **Supuesto: Inngest free tier aguanta el volumen inicial** — 50k steps/mes gratis. Con ~200 steps por job, aguanta ~250 jobs/mes. Confirmar antes de escalar.
- **Supuesto: Tavily/Exa retorna contenido útil para fuentes colombianas de nicho** — validar con 5 ejemplos reales (ej: "Premio Lápiz de Acero", "revista AXXIS") antes de implementar Source Discovery Engine.

---

## 16. Core Concepts a estudiar (antes de implementar)

| Concepto | Por qué importa en este proyecto |
|---|---|
| **Workers & Queues** (Producer-Consumer, idempotencia, retry, dead letter) | Inngest es el corazón del pipeline. Sin entender este patrón, cada bug de concurrencia es un misterio. |
| **Anti-bot** (TLS fingerprinting, browser fingerprinting, behavioral mimicry, stealth browsers) | El Engine 6 es 100% esto. Entenderlo define qué funciona y qué no en sitios colombianos con Cloudflare. |
| **Thompson Sampling / Multi-Armed Bandit** | Cómo el Knowledge Graph aprende qué fuentes rinden. Sin entenderlo, el tuning es a ciegas. |
| **Adaptive Crawling** (information gain + saturation) | El mecanismo que reduce costo de scraping 95%. Crawl4AI lo implementa — hay que entender qué parámetros tunear. |
| **pgvector / similitud semántica** | Dedup de empresas cross-job. Sin esto, "ABC Diseños SAS" y "ABC Diseño Interiores" con mismo dominio duplican el pipeline. |
| **Event-Driven Architecture** | Por qué Inngest events en vez de HTTP request-response para jobs largos. |

---

## 17. Design Patterns del proyecto

| Pattern | Alternativa | Por qué este |
|---|---|---|
| **Pipeline** | Chain of Responsibility | Transformación secuencial de datos. Chain of Responsibility decide si pasa — nosotros siempre transformamos. |
| **Strategy** | Template Method | Anti-bot selecciona estrategia en runtime por historial del dominio. Template Method requiere herencia rígida. |
| **Worker / Job Queue** | Saga | Jobs tolerantes a fallo parcial — guardan data parcial y continúan. Sagas son para rollback distribuido. |
| **Repository** | Active Record | Drizzle con repositorios separa acceso a datos de lógica de negocio. Más testeable con fixtures. |
| **Adapter** | Facade | Cada API externa tiene su adapter que traduce al interface interno. Facade simplifica; Adapter convierte interfaces incompatibles. |
| **Circuit Breaker** | Retry simple | Si Apollo falla 3 veces, el breaker para de llamar. Retry simple quema créditos en loop. |
| **Bulkhead** | Monolito | Cada engine corre aislado. Si Verification cae, Discovery ya guardó sus resultados. |
| **Event-Driven** | Request-Response | Jobs de 15 min no pueden tener conexión HTTP abierta. |

---

## 18. Próximos pasos (orden MVP)

1. **Estudiar CC-01 Workers & Queues con `/core-concept-mastery`** (modo DEEP). Único bloqueante de estudio para MVP. ~3-4 horas.

2. **Volver a `spec-driven-coach`** para 1 pregunta diagnóstica corta. Si pasa → arrancar MVP.

3. **Implementar MVP de 6 horas** siguiendo `timeline.md` sección "Timeline MVP — 6 horas" (MVP H1 → H6).

4. **Post-MVP** (no antes): pasar este brief y los hallazgos del MVP a `spec-driven-coach` para producir los artefactos completos:
   - `constitution.md` (reglas de código y arquitectura)
   - `spec.md` por engine (acceptance criteria detallados)
   - `plan.md` (orden de implementación post-MVP)
   - `evals.md` (cómo medir éxito de cada engine en su versión full)
   - `tasks.md` (to-dos atómicos para delegar a IA)

5. **Validaciones que se hacen DURANTE el MVP, no antes** (el MVP en sí valida estas):
   - Inngest free tier aguanta el volumen MVP (1 job a la vez, FIFO)
   - Tavily retorna URLs útiles para fuentes colombianas (validación inline en MVP H3)
   - Crawl4AI microservicio Python en Fly.io funciona (validación inline en MVP H4)
   - Browserbase pasa un sitio colombiano con Cloudflare (validación inline en MVP H4 fallback)

6. **Referencia de código:** el MVP vibecoded `Prospektiv` (en `/Users/sebastianacostamolina/01_Documents/05_PERSONAL/searching_leads/prospektiv/`) queda como referencia de implementación. Reutilizable: extracción Haiku, Apollo enrich (Camino A), UI components, dark palette. El nuevo proyecto Veronica vive en `/Users/sebastianacostamolina/01_Documents/05_PERSONAL/vero - deep prospeccion/`.

---

## 19. Gaps abiertos para resolver en próxima sesión

Auditoría post-discovery identificó decisiones pendientes antes de pasar a `spec-driven-coach`. Cerrar estas en la próxima sesión.

### Gaps ALTOS (decisiones de arquitectura)

1. **Storage del CSV** — ¿dónde vive físicamente el archivo? Opciones: Fly.io volume, Postgres bytea, S3/Cloudflare R2. Define infra y retention policy.
2. **Persistencia de logs y errores** — Pino structured JSON: ¿stdout (rotado), volumen, tabla `errors` en Postgres, o servicio externo (Loki/Helicone)? El admin dashboard requiere persistencia.
3. **History de jobs (UI usuario)** — `/history` para que el operador encuentre runs anteriores. No solo `/admin`.
4. **Concurrencia y límites de Inngest** — ¿cuántos jobs simultáneos por usuario? Define UX y consumo de free tier.
5. **Confidence calibration como Core Concept** — agregar CC-07: paper arxiv 2509.19557 como estudio previo a implementar Engine 4. Sin entender la técnica, el judge va a ser superficial.

### Gaps MEDIOS

6. **"Nivel de contexto" como input UI** — formalizar en SPEC-C01: slider 1-3, qué hace cada nivel (bajo = solo cache; medio = cache + 1 estrategia; alto = cache + N estrategias multi-LLM).
7. **Umbrales numéricos para migración a Hetzner** — completar valores X en SPEC-E03 (jobs/hora, costo Fly.io mensual).
8. **Fórmula del estimado de costo pre-run** — sub-componente: tabla hardcoded inicial + regresión sobre histórico. Define un mini-engine de pricing.

### Gaps BAJOS (los resuelve `spec-driven-coach` en Clarify)

- Fallback de Inngest si free tier no aguanta (self-hosted vs paid plan)
- SSE vs polling 3s — decisión de UX
- Backup strategy de Neon (point-in-time recovery automático en free tier)
- i18n / strings duras en español
- Versioning del Knowledge Graph (qué pasa con alpha/beta históricos si cambia el algoritmo)
- Detalle de implementación del kill switch (chequeo pre-call vs interrupt asíncrono)
