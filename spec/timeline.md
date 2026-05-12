# Timeline — Veronica

**Fecha:** 2026-05-10 (revisado para alcance MVP)
**Producto:** Veronica — un agente de prospección B2B Colombia.
**Principio rector:** spec → constitution → implementation. Nunca al revés.
**Referencia:** discovery-brief.md

---

## ⚠️ Cambio de alcance — MVP first

**Decisión 2026-05-10 mid-sesión:** este NO es un proyecto de 8-12 semanas. Es un **MVP de máximo 1 día / 6 horas de implementación** para mostrarle al cliente que el concepto funciona end-to-end.

- Los 6 engines existen en el MVP, en **versión light**: lógica mínima viable, sin precisión fina, sin optimización.
- Éxito del MVP: "quiero 10 empresas de cortinas" → corre todo solito → recibo CSV con 10 empresas + contactos. Eso es todo.
- Lo sofisticado (Thompson Sampling, pgvector, anti-bot tier system, confidence calibration paper, multi-tenant) NO va en MVP. Está preservado abajo como **Roadmap post-MVP**.
- Specs SÍ — pero acotados a "qué hace esta versión light". No specs sobredimensionados.

**Filtro de decisión durante MVP:** *¿es la versión más barata y rápida que demuestre el concepto al cliente? ¿Cabe en las 6h?* Si no → fuera del MVP.

---

## Timeline MVP — 6 horas

Budget total realista: ~3-4h estudio CC-01 (separado, antes del MVP) + ~6h implementación = un día.

```
PRE-MVP (estudio, separado) ─── CC-01 Workers & Queues (Inngest)   ~3-4h
                                  │
                                  ▼
MVP H1 ─── Bootstrap infra (Next.js + Inngest + Neon + Fly.io)     ~1h
MVP H2 ─── Schema mínimo + ruta /api/jobs + worker dummy           ~0.5h
MVP H3 ─── Engines 1+2 light (Context + Source Discovery)          ~1h
MVP H4 ─── Engine 3 light (Discovery: Crawl4AI + Haiku)            ~1h
MVP H5 ─── Engine 4 light (Verification: Sonnet judge simple)      ~0.5h
MVP H6 ─── Engine 5 light (Contact Apollo) + CSV + UI mínima       ~2h
```

### FASE PRE-MVP — Estudio de CC-01 (separado del budget de 6h)

**Objetivo:** dominar Workers & Queues + Inngest específicamente. Sin esto, no se arranca implementación.

| # | To-do | Entregable |
|---|---|---|
| P.1 | Estudiar CC-01 con `/core-concept-mastery` modo DEEP (prompt entregado por spec-driven-coach) | Capacidad de explicar Inngest a un colega + diseñar pseudocódigo de worker fan-out |
| P.2 | Volver a spec-driven-coach. Pasar 1 pregunta diagnóstica corta. | OK para entrar a MVP H1. Si falla → volver a estudiar el sub-concepto. |

### MVP H1 — Bootstrap infra (~1h)

| # | To-do | Notas |
|---|---|---|
| H1.1 | `npx create-next-app` con TypeScript + Tailwind + Shadcn/ui base. Copiar dark palette del MVP vibecoded "Prospektiv". | Reusar lo que ya funciona |
| H1.2 | Crear cuenta Neon Postgres (free tier). Drizzle ORM setup. | `drizzle.config.ts` + connection string en `.env` |
| H1.3 | Crear cuenta Inngest. Instalar SDK. Crear cliente y endpoint `/api/inngest`. | Sin worker real todavía |
| H1.4 | Crear cuenta Fly.io. `fly.toml` + Dockerfile básico Node. | `fly deploy` exitoso (página en blanco OK) |
| H1.5 | Basic auth middleware (password env var). | Bloquea acceso público al MVP |

### MVP H2 — Schema mínimo + ruta job + worker dummy (~30 min)

| # | To-do | Notas |
|---|---|---|
| H2.1 | Schema Drizzle mínimo: `jobs (id, query, count, status, cost_cents, csv_path, created_at)`, `job_events (id, job_id, engine, message, cost_cents, ts)`. Hardcoded tenant/user. | Sin pgvector, sin pg_cron, sin más tablas |
| H2.2 | `POST /api/jobs` → crea row → dispara Inngest event `job.requested` | Mínimo |
| H2.3 | Worker Inngest `job.requested` que solo escribe `console.log` y marca `status=done` | Validar el plumbing end-to-end |
| H2.4 | UI minimal `/`: input query + cantidad → POST → muestra job_id | Sin styling fino |

### MVP H3 — Engines 1+2 light (Context + Source Discovery) (~1h)

| # | To-do | Notas |
|---|---|---|
| H3.1 | Engine 1 light: 1 prompt a **Haiku** que recibe la query NL ("instaladores de cortinas en Colombia") y devuelve JSON `{industry, geo, signals[]}`. Sin cache. | step.run dentro del worker |
| H3.2 | Engine 2 light: 1 prompt a **Haiku** que recibe el JSON anterior y devuelve 5-8 URLs candidatas de fuentes nicho colombianas (lista curada manualmente + brainstorm Haiku). **Sin Tavily ni ninguna search API de pago en MVP.** | Sin sample, sin bandit, sin sources_catalog |
| H3.3 | Persistir resultado en `job_events`. Costo registrado. | Visible en DB |

### MVP H4 — Engine 3 light (Discovery) (~1h)

| # | To-do | Notas |
|---|---|---|
| H4.1 | Microservicio Crawl4AI mínimo: 1 endpoint `/crawl` que recibe URL y devuelve texto extraído (sin adaptive crawling fancy, parámetros default) | Mismo Fly.io app o app separada |
| H4.2 | Worker Inngest fan-out: por cada URL del Engine 2 → step.run que llama Crawl4AI → Haiku extrae empresas (`name`, `domain`) | step.parallel si Inngest lo permite |
| H4.3 | Dedup por dominio exacto. Sin embeddings. | Set en memoria del worker |
| H4.4 | Si Crawl4AI falla (403/timeout) → fallback directo a Browserbase. **Sin tier system.** | Try/catch simple |
| H4.5 | Persistir empresas en tabla efímera o JSON en `job_events`. | No `companies_master`, no `companies_raw` con todo el detalle |

### MVP H5 — Engine 4 light (Verification) (~30 min)

| # | To-do | Notas |
|---|---|---|
| H5.1 | Para cada empresa raw: 1 prompt Sonnet que recibe `{name, domain, snippet}` y devuelve `{score: 0-1, reason: string}` | **Sin** cross-check Tavily/news/Instagram. **Sin** calibración paper. |
| H5.2 | Gate: pasan score ≥ 0.6 | Filtrar en código |

### MVP H6 — Engine 5 light + CSV + UI mínima (~2h)

| # | To-do | Notas |
|---|---|---|
| H6.1 | Engine 5 light: **Solo Camino A** (Apollo org enrich + people search). Sin LinkedIn fallback. Sin Instagram. | Reusar lógica del MVP "Prospektiv" si aplica |
| H6.2 | Generar CSV en Fly.io volume efímero. Path en `jobs.csv_path`. | `csv-writer` o similar |
| H6.3 | UI `/jobs/:id`: polling 3s → muestra status + costo acumulado + link descarga CSV cuando `status=done` | Tabla simple, sin charts |
| H6.4 | Kill switch $1.00: si `cost_cents > 100` → worker para + marca `status=killed` | Check antes de cada step caro |
| H6.5 | Deploy a Fly.io. Probar end-to-end con query real: "instaladores de cortinas en Colombia, 10 empresas". | Demo lista para el cliente |

### Lo que NO va en MVP (explícito)

- ❌ Thompson Sampling / Bandit
- ❌ pgvector / dedup semántico
- ❌ industry_context cache
- ❌ companies_master cross-job
- ❌ Anti-bot tier system + domain_anti_bot_history
- ❌ Confidence calibration paper arxiv 2509.19557
- ❌ Camino B (LinkedIn) y Camino C (Instagram bio)
- ❌ /history UI
- ❌ /admin dashboard
- ❌ Emails de notificación
- ❌ Auth completa (email/password + Google OAuth)
- ❌ Multi-tenant
- ❌ pg_cron, retention policies, soft delete
- ❌ Unit tests / Integration tests / E2E tests
- ❌ Migración Fly.io → Hetzner
- ❌ Estimado de costo pre-run en UI

Todo esto está preservado abajo como **Roadmap post-MVP**.

---

## Roadmap post-MVP (visión completa)

Las 8 fases originales están preservadas aquí como roadmap de iteración después del MVP. NO son alcance actual. Se atacan en el orden en que el cliente / la métrica las pida.

### FASE 1 (post-MVP) — Hardening de la fundación
SPEC-000 formal + constitution.md formal + tests + Pino logger completo + CI/CD GitHub Actions + secrets rotation.

### FASE 2 (post-MVP) — Refactor formal de engines existentes
Specs C03, C04, C05 con spec-driven-coach. Workers Inngest separados con tests, fixtures, cost tracking granular.

### FASE 3 (post-MVP) — Context Engine + Source Discovery full
SPEC-C01, SPEC-C02. Librería de estrategias multi-LLM, cache industry_context, Tavily/Exa con sample, Bandit updater. Cerrar GAP-06 (nivel de contexto UI) y GAP-08 (fórmula estimado costo).

### FASE 4 (post-MVP) — Anti-bot Engine full
SPEC-C06. Decision tree: fetch → Crawl4AI stealth → Browserbase. Tabla `domain_anti_bot_history`. Tier selection automático.

### FASE 5 (post-MVP) — Knowledge Graph y aprendizaje
SPEC-D02. companies_master con pgvector. Dedup semántico cross-job. industry_context cache. Validar: 5ª query ≥30% más barata.

### FASE 6 (post-MVP) — UI completa + observabilidad
/jobs/:id rico (tabla incremental, razón por empresa), /admin dashboard, /history UI (cerrar GAP-03), emails Resend kill switch + job-done, métricas Fly.io.

### FASE 7 (post-MVP) — Auth completa + emails de auth
Clerk o NextAuth (email/password + Google OAuth), roles admin/operator/viewer, rate limiting por usuario.

### FASE 8 (post-MVP) — Hardening final
Tests completos (unit, integration, E2E), security review, runbooks de APIs externas, umbrales numéricos para migración Hetzner (cerrar GAP-07).

### Core concepts pendientes (post-MVP, según se aborde cada fase)

- CC-02 Anti-bot 2026 → antes de FASE 4
- CC-03 Thompson Sampling → antes de FASE 5
- CC-04 Adaptive Crawling → antes de tunear Crawl4AI
- CC-05 pgvector → antes de FASE 5
- CC-06 Event-Driven Architecture → implícito en CC-01, profundizar al refactorizar
- CC-07 Confidence Calibration → antes de FASE 2 (refactor Engine 4)

### Gaps abiertos preservados (post-MVP)

- GAP-01 Storage CSV: en MVP es Fly.io volume efímero. Para producción real → decidir S3/R2 vs Postgres bytea, retention policy.
- GAP-02 Logs persistence: en MVP es stdout. Para producción real → tabla `errors` en Postgres o Loki/Helicone.
- GAP-03 /history UI: post-MVP FASE 6.
- GAP-04 Concurrencia Inngest: en MVP es 1 job a la vez FIFO. Para producción real → calibrar con uso del free tier.
- GAP-05 CC-07 Confidence Calibration: estudiar antes de FASE 2.
- GAP-06 Nivel de contexto UI: FASE 3.
- GAP-07 Umbrales Hetzner: FASE 8.
- GAP-08 Fórmula estimado costo: FASE 3.

---

## Cómo retomar en la próxima sesión

Estado al cierre de esta sesión:
- ✅ Discovery completo
- ✅ Brief y timeline con shift a MVP-first documentado
- ⏳ Pendiente: estudiar CC-01 con `/core-concept-mastery`
- ⏳ Después: arrancar MVP H1

**Prompt sugerido para abrir la próxima sesión:**

> Continuamos con Veronica. Ya estudié CC-01 Workers & Queues con core-concept-mastery. Hazme la pregunta diagnóstica corta para confirmar y, si paso, arrancamos MVP H1 del `timeline.md`.
