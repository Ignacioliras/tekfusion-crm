# Tests de base de datos (pgTAP)

`npx supabase test db` corre todos los `*.test.sql` de esta carpeta contra el Supabase local; el CI los corre en cada PR (`.github/workflows/seguridad.yml`).

- `00_humo.test.sql`: comprueba que la cañería funciona.
- Fase 2: `10_rls_deals.test.sql`, `11_rls_conversaciones.test.sql`, … — cada política de `docs/08-seguridad-roles.md` con su test: ejecutivo no ve leads ajenos, lector no edita, gerencia ve todo, service role es el único que inserta mensajes.

Patrón para probar RLS como un usuario concreto:
```sql
select tests.authenticate_as('ejecutivo1');   -- helper de supabase-test-helpers, o:
set local role authenticated;
set local request.jwt.claims = '{"sub":"<uuid del usuario>","role":"authenticated"}';
```
