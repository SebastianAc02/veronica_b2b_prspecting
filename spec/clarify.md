# Clarify — Veronica

Decisiones tomadas durante el proceso de spec. Cada entrada tiene fecha, opciones consideradas, opción elegida y razón.

---

## 2026-05-12

### Puerto de desarrollo: 4500 en vez de 3000

- Opciones: puerto 3000 (default Next.js) vs puerto 4500
- Elegido: 4500
- Razon: decision del usuario para evitar conflictos con otros proyectos locales
- Impacto: `package.json` script `"dev": "next dev -p 4500"`, y cualquier referencia a localhost debe usar 4500

### Deploy Fly.io: manual en H1

- Opciones: (a) CI/CD automatico con GitHub Actions desde H1, (b) deploy manual
- Elegido: deploy manual
- Razon: MVP — no agregar complejidad de CI/CD hasta que el core funcione
- Impacto: H1 no incluye GitHub Actions. Se evalua agregar CI/CD en iteracion futura.

### Claude no como contributor en commits

- Decision: Claude no debe aparecer como contributor en ningun commit del repositorio
- Impacto: configurar Claude Code para no agregar lineas "Co-Authored-By: Claude" en los commits
- Estado: RESUELTO 2026-05-12. Doble defensa aplicada en `~/.claude/settings.json` global:
  1. `"includeCoAuthoredBy": false` — desactiva el comportamiento default de Claude Code de agregar la linea de atribucion en commits y PRs.
  2. Hook `PreToolUse` sobre `Bash` con `if: "Bash(git commit*)"` — red de seguridad que intercepta cualquier `git commit` cuyo comando contenga `co-authored-by:.*claude` (case-insensitive) y lo bloquea con `permissionDecision: deny` antes de que git reciba el comando.
- Verificacion: probado en sesion 4. Commit con atribucion → bloqueado por hook. Commit limpio → no bloqueado.
