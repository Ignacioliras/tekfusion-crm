# Tests de base de datos (pgTAP)

`npx supabase test db` corre todos los `*.test.sql` de esta carpeta contra el Supabase local (con el seed cargado); el CI los corre en cada PR (`.github/workflows/seguridad.yml`). Si una policy no pasa su test, se arregla la policy, no el test.

- `00_humo.test.sql`: comprueba que la cañería funciona.
- `10_rls_deals.test.sql`: ejecutivo ve solo sus leads y los sin asignar, no edita ni reasigna ajenos, toma un lead sin asignar (`take_deal`); lector solo lee; gerencia ve y edita todo; nadie borra leads; anon no ve nada.
- `11_rls_contacts_companies.test.sql`: contactos visibles a través de los leads visibles; empresas visibles para todo usuario interno; solo gerencia borra contactos y empresas; `contacts_summary` y `companies_summary` respetan la RLS.
- `12_rls_roles_config.test.sql`: `role` ↔ `administrator` sincronizados; solo gerencia cambia `role`, `administrator` y `disabled`; configuración, líneas de negocio, motivos y ausencias: todos leen, gerencia escribe; un usuario desactivado no ve nada.
- `13_rls_notes_tasks_views.test.sql`: notas y tareas heredan la visibilidad del padre; `activity_log`, `contacts_summary` y `global_search` pasan por la RLS.
- `14_rls_cobertura.test.sql`: toda tabla con RLS, ninguna policy `using (true)` ni de anon, vistas `security_invoker`, sin policy de delete en las tablas que nunca se borran.

Patrón para actuar como un usuario del seed (cada archivo define sus helpers temporales):
```sql
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');  -- set_config de role + request.jwt.claims
reset role;                                                  -- vuelve a postgres antes del siguiente login
select pg_temp.exec_count('update public.deals set ...');   -- filas que tocó un DML bajo RLS
```
Los `insert` y los `with check` que fallan lanzan `42501`; los `update`/`delete` filtrados simplemente afectan 0 filas.
