# Project overview

Veronica — deep search de prospeccion B2B para Colombia impulsado por IA. Objetivo: cobertura exhaustiva del ICP a traves de runs sucesivos y controlados, no de golpe. Cada run recibe un nicho, descubre fuentes no obvias especificas (gremios, asociaciones, premios del sector, blogs de nicho, bases de datos sectoriales, registros de gobierno), extrae y verifica empresas candidatas, enriquece contactos clave via Apollo, y entrega un CSV descargable.

Pipeline: Context -> Source Discovery -> Extraction -> Verification -> Enrichment -> CSV output.

Constraints de primera clase: costo por run y latencia son predecibles y no exceden el presupuesto configurado.

# Stack

- Next.js 14 App Router, TypeScript, React Server Components, Shadcn/ui, Tailwind
- Inngest: queue y workers para jobs async de larga duracion
- Neon Postgres + Drizzle ORM
- Crawl4AI: microservicio Python en Fly.io, unico responsable del crawling
- Browserbase: fallback anti-bot cuando Crawl4AI detecta bloqueo
- Cloudflare R2: storage de CSVs con pre-signed URL
- LLMs: claude-haiku-4-5 para Engines 1-2-3, claude-sonnet-4-6 para Engine 4 (Verification)
- Pino: logging estructurado stdout + tabla errors en DB
- Hosting: Render (free tier, kept alive via UptimeRobot ping)

No usar: pgvector, pg_cron, Vercel, RUES, Tavily, claude-opus, n8n, Firecrawl.

# Commands

- Install:    `pnpm install`
- Dev:        `pnpm dev`
- Build:      `pnpm build`
- Typecheck:  `pnpm typecheck`
- Lint:       `pnpm lint`
- Test:       `pnpm test`

# Project structure

```
veronica/
  apps/web/          Next.js 14: UI, API routes, Inngest functions
  services/crawler/  Microservicio Python: Crawl4AI
  spec/              discovery-brief.md, timeline.md
```

# Code rules

- SOLID por defecto: responsabilidad unica por modulo, dependencias inyectadas, sin tight coupling.
- Clean code: nombres autoexplicativos, funciones con una sola responsabilidad, sin comentarios.
- Solucion minima que cumple el spec — sin over-engineering, sin features no pedidas.
- Patrones de diseno solo donde el problema los exige, no por preferencia.
- Cuando una decision involucra arquitectura (patron de diseno, estructura de modulos, contrato entre servicios, schema de DB): detener y presentar al humano antes de implementar.

## Naming conventions

- Variables y funciones: camelCase.
- Tipos, interfaces y clases: PascalCase.
- Constantes globales: SCREAMING_SNAKE_CASE.
- Archivos y carpetas: kebab-case.
- Consistencia sobre preferencia: antes de introducir un patron de nombres nuevo, seguir el que ya existe en el archivo o modulo. Si hay ambiguedad, preguntar al humano.

## Inngest

- Cada operacion retryable en su propio step.run — sin agrupar en un step grande.
- Los steps lanzan excepciones; Inngest maneja los retries. No suprimir errores con try/catch dentro de step.run.
- Concurrencia MVP: `concurrency: { limit: 1 }` en la definicion de cada funcion.
- Nombres de eventos en formato `prospection/action` (ej. `prospection/run.requested`).

## Drizzle + Neon

- schema.ts es source of truth. Solo `drizzle-kit generate` + `drizzle-kit migrate` en produccion. Nunca `db:push`.
- Usar connection string pooled de Neon en rutas de Next.js.
- Transacciones para escrituras multi-tabla.
- Inserts idempotentes: `onConflictDoNothing()` o `onConflictDoUpdate()` segun el caso.

## Next.js

- Server Components por defecto. `"use client"` solo para hooks, eventos de browser o estado local.
- API routes para disparar jobs de Inngest — no server actions.

## Boundary TypeScript / Python

- Crawl4AI recibe URLs y devuelve HTML/markdown. No toca Neon directamente.
- Contrato HTTP tipado en `apps/web/types/crawl4ai.ts`.
- La llamada al microservicio va dentro de un step.run con timeout explicito.

## Error handling

- Errores tipados: `class VeronicaError extends Error { constructor(public code: ErrorCode, message: string) { super(message) } }`.
- Nunca `throw new Error("string suelto")`.
- Tabla `errors`: job_id, engine_name, step_name, error_code, error_message, timestamp, payload.

## Observability

- run_id en todos los logs y en la tabla errors.
- Estructura Pino: `{ level, timestamp, run_id, engine, step, duration_ms }` mas contexto del engine.

# Constraints

- Secrets en env vars unicamente — nunca hardcodeados en codigo.
- PII (contactos Apollo) no va a DB — solo al CSV del job.
- tenant_id + user_id en todas las tablas desde el inicio (hardcodeados en MVP).
- Apollo solo Camino A: enrich directo. Sin LinkedIn, sin Instagram.
- Browserbase solo como fallback cuando Crawl4AI detecta bloqueo anti-bot.
- Costo maximo por run: target $0.20 para 10 empresas, kill switch en $1.00.
- Migraciones ya aplicadas son intocables.
- No modificar archivos fuera del scope de la tarea asignada.
- Email notifications (Resend) son opcionales — implementar solo si queda tiempo en H6.

# Testing

- Al menos 1 test basico por tarea como minimo documentacional.
- Cobertura baja es aceptable en MVP — los tests no son prioridad.

# Done checklist

- [ ] `pnpm typecheck` sin errores
- [ ] `pnpm lint` sin errores
- [ ] `pnpm test` con al menos 1 test verde
- [ ] AC del spec cumplida al 100%
- [ ] SOLID + clean code aplicados, cero comentarios en el codigo
- [ ] Solucion minima — sin scope creep ni features no pedidas
- [ ] Diff limitado al scope de la tarea

# Skills

## Frontend

- Usar `taste-skill` como baseline de calidad en todo trabajo de UI. Previene interfaces genericas. Tratarlo como capa de calidad por defecto, no como paso separado para tweaks menores.
- Usar `impeccable` al inicio de cualquier nueva superficie de producto o feature de UI significativo. Primero para definir estructura y sistema visual; despues para auditoria y pulido final. No usar para cambios de una linea.
- Usar `emil-design-eng` solo cuando la tarea incluye motion: transiciones, timing, easing, micro-interacciones. Aplicar despues de que la estructura visual ya esta definida. No usar si no hay motion requerido.
- Orden frontend: `taste-skill` -> `impeccable` -> build -> `emil-design-eng` si aplica -> `impeccable` para auditoria final.

## Architecture

- Usar `ddd-architecture` antes de crear cualquier modulo, dominio o estructura de feature nueva. Define boundaries, capas y responsabilidades. Usar antes de crear carpetas, modelos o servicios. No usar para funciones utilitarias aisladas.
- Pregunta obligatoria antes de arrancar: que problema de negocio se esta modelando y donde esta el boundary del dominio.

## Backend

- Usar `api-patterns` antes de implementar o cambiar endpoints. Define contratos, validacion, errores, auth y consistencia de interfaces. No usar para logica de negocio interna.
- Usar `database` antes de cambiar schema, relaciones, migraciones o estructura de queries. Define persistencia correctamente y previene errores de datos. No usar para logica no relacionada con persistencia.
- Orden backend: `ddd-architecture` -> `api-patterns` -> `database` -> build.

## Testing

- Usar `testing` despues de cada feature no trivial. Verifica comportamiento, protege cambios y fuerza claridad. No escribir solo happy-path tests. Un feature sin tests no esta completo.

## Learning layer

- [PLACEHOLDER] `learn-codebase` — skill no instalada actualmente. Proposito: forzar entendimiento real sobre aceptacion pasiva, verificar modelos mentales, requerir explicacion de trade-offs antes de continuar. Instalar o crear antes de la primera sesion de implementacion.
- Pregunta de cierre requerida despues de cualquier cambio significativo: por que se eligio este approach en lugar de la principal alternativa.

# Reference artifacts

Leer antes de cada sesion de trabajo:
- `spec/discovery-brief.md` — que construye Veronica, para quien, alcance MVP vs post-MVP
- `spec/timeline.md` — plan H1-H6 del MVP 6h y roadmap post-MVP
