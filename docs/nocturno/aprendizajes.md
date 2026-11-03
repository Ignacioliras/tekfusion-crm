# Aprendizajes de las sesiones nocturnas

- 2026-11-03 T1: línea base OK en Windows — `npm run typecheck`, `npm run lint` y `npm run build` terminan con código 0 sin cambios.
- Los comandos npm corren con la herramienta Bash (Git Bash); en la herramienta PowerShell el permiso los rechaza en sesión nocturna.
- Avisos que no rompen la verificación (no tocarlos sin tarea): ESLint avisa que `.eslintignore` está obsoleto (migrar a `ignores` en `eslint.config.js`); Vite avisa por `__dirname` en `vite.config.ts:72`; chunk principal de ~2,5 MB.
- `npm run build` tarda ~30 s (el plugin PWA se lleva ~22 s en `closeBundle`).
