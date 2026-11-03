# Aprendizajes de las sesiones nocturnas

- 2026-11-03 T1: línea base OK en Windows — `npm run typecheck`, `npm run lint` y `npm run build` terminan con código 0 sin cambios.
- Los comandos npm corren con la herramienta Bash (Git Bash); en la herramienta PowerShell el permiso los rechaza en sesión nocturna.
- Avisos que no rompen la verificación (no tocarlos sin tarea): ESLint avisa que `.eslintignore` está obsoleto (migrar a `ignores` en `eslint.config.js`); Vite avisa por `__dirname` en `vite.config.ts:72`; chunk principal de ~2,5 MB.
- `npm run build` tarda ~30 s (el plugin PWA se lleva ~22 s en `closeBundle`).
- 2026-11-03 T2: en Bash nocturno se rechazan `sed -i` y comandos con varias operaciones (`; echo $?`); edita con Edit y encadena solo con `&&`.
- Los tests del proyecto vitest `app` necesitan Chromium de Playwright (no instalado: falla `npx playwright install`); los tests puros corren con una config node temporal en el scratchpad (`environment: "node"` + alias `@`).
- PENDIENTE: `src/components/atomic-crm/dataImport/deals_sample.csv` todavía usa etapas de Atomic ("Opportunity", "Proposal Sent"); al importarlo caen a `nuevo`. Además el comentario de `parseCell.ts:55` cita "proposal-sent".
- PENDIENTE: el gráfico `DealsChart.tsx` pondera los leads abiertos con multiplicadores heredados de Atomic (nuevo 0,2 / contactado 0,5 / cotizado 0,8) y cuenta `archivado` como perdido; falta que gerencia confirme ese criterio.
- 2026-11-03 T3: `ls` con `2>&1` en Bash se rechaza; para explorar `node_modules` usa Glob (con `path` a node_modules) y Read. Las fuentes de `ra-language-english` están en `node_modules/ra-language-english/src/index.ts`.
- PENDIENTE: `src/lib/i18n/es.ts` solo traduce las claves `ra.*`; los textos propios de Atomic (escritos directo en los componentes o con claves fuera de `ra.*`, no revisado) seguirían en inglés.
- 2026-11-03 T4: el menú de usuario de Atomic está en `layout/Header.tsx` (`<UserMenu>`); las rutas con layout van en el segundo `<CustomRoutes>` de `root/CRM.tsx` (~línea 260); el bloque móvil (~línea 333) solo registra Changelog. PENDIENTE: los textos de `CreditosPage` y del ítem "Créditos" están en español directo, sin claves i18n.
