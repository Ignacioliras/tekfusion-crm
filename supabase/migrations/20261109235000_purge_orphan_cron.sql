-- Purga diaria de adjuntos huérfanos (T11 de la cola nocturna, 2026-11-09):
-- pg_cron llama por pg_net a la Edge Function purge-orphan-attachments con
-- {"apply": true} todos los días a las 04:00 UTC (01:00 en Chile). La función
-- borra los archivos del bucket attachments con más de 24 h que ninguna fila
-- referencia (lista única en supabase/functions/_shared/attachmentRefs.ts).
-- Escrita a mano: db diff no ve cron jobs ni secretos de Vault.
--
-- El job solo se programa si Vault tiene los dos secretos que necesita. Los
-- crea Ignacio en cada proyecto (staging y producción), nunca van en el repo:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- Si faltan (como en local), el bloque de abajo solo deja un NOTICE y no
-- programa nada. Para programar el job después de crear los secretos, correr
-- este mismo bloque `do` desde el SQL editor: es idempotente (desprograma el
-- job anterior con el mismo nombre antes de crearlo). Para quitarlo:
--   select cron.unschedule('purge-orphan-attachments');
-- Para probar la función a mano sin borrar nada, llamarla sin cuerpo (dry run)
-- con el service role key en Authorization: devuelve {candidatos, borrados}.
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
    where name in ('project_url', 'service_role_key')
  $sql$ into secrets;
  if secrets < 2 then
    raise notice 'purge-orphan-attachments: faltan los secretos project_url y service_role_key en Vault, job no programado (ver migración 20261109235000)';
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
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := '{"apply": true}'::jsonb,
        timeout_milliseconds := 60000
      )
    $job$
  );
  raise notice 'purge-orphan-attachments: job programado (04:00 UTC)';
end
$$;
