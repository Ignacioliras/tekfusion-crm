-- Test de humo con pgTAP. Corre con `npx supabase test db` (local) y en CI (seguridad.yml).
-- Los tests de RLS de la Fase 2 van en archivos 10_rls_*.test.sql de esta carpeta.
begin;
select plan(3);

select has_table('public', 'deals', 'existe la tabla deals (leads)');
select has_table('public', 'sales', 'existe la tabla sales (ejecutivos)');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.deals'::regclass),
  'deals tiene RLS activada'
);

select * from finish();
rollback;
