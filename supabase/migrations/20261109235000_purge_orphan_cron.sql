-- Purga diaria de adjuntos huérfanos (T11 de la cola nocturna, 2026-11-09):
-- pg_cron llama por pg_net a la Edge Function purge-orphan-attachments con
-- {"apply": true} todos los días a las 04:00 UTC (01:00 en Chile). La función
-- borra los archivos del bucket attachments con más de 24 h que ninguna fila
-- referencia (lista única en supabase/functions/_shared/attachmentRefs.ts).
-- Escrita a mano: db diff no ve cron jobs ni secretos de Vault.
--
-- El service role key NO va en Vault (decisión de Ignacio, 2026-11-09, docs/10):
-- la función valida un secreto propio, PURGE_CRON_SECRET, que solo sirve para
-- llamar a la purga. Ignacio lo genera en cada proyecto (staging y producción),
-- nunca va en el repo, y lo deja en los dos lados con el mismo valor:
--
--   npx supabase secrets set PURGE_CRON_SECRET=<valor aleatorio largo>
--   select vault.create_secret('<el mismo valor>', 'purge_cron_secret');
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--
-- project_url no es un secreto (es la URL pública del proyecto): está en Vault
-- solo porque el job necesita leerla de algún lado en cada ambiente.
--
-- Si falta alguno de los dos (como en local), el bloque de abajo solo deja un
-- NOTICE y no programa nada. Para programar el job después de crearlos, correr
-- este mismo bloque `do` desde el SQL editor: es idempotente (desprograma el
-- job anterior con el mismo nombre antes de crearlo). Para quitarlo:
--   select cron.unschedule('purge-orphan-attachments');
-- Para probar la función a mano sin borrar nada, llamarla sin cuerpo (dry run)
-- con `Authorization: Bearer <PURGE_CRON_SECRET>`: devuelve {candidatos, borrados}.
-- Rotar el secreto: cambiarlo en `supabase secrets` y en Vault
-- (vault.update_secret); el job lo lee de Vault en cada corrida.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
declare
  secrets integer;
begin
  if not exists (select 1 from pg_namespace where nspname = 'vault') then
    raise notice 'purge-orphan-attachments: Vault no existe, job no programado';
    return;
  end if;
  execute $sql$
    select count(*) from vault.decrypted_secrets
    where name in ('project_url', 'purge_cron_secret')
  $sql$ into secrets;
  if secrets < 2 then
    raise notice 'purge-orphan-attachments: faltan project_url y purge_cron_secret en Vault, job no programado (ver migración 20261109235000)';
    return;
  end if;

  perform cron.unschedule(jobid) from cron.job where jobname = 'purge-orphan-attachments';
  perform cron.schedule(
    'purge-orphan-attachments',
    '0 4 * * *',
    $job$
      select net.http_post(
        url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/purge-orphan-attachments',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'purge_cron_secret')
        ),
        body := '{"apply": true}'::jsonb,
        timeout_milliseconds := 60000
      )
    $job$
  );
  raise notice 'purge-orphan-attachments: job programado (04:00 UTC)';
end
$$;
