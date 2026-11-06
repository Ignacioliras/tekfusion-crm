-- RF-17 (Ley 21.719): "Anonimizar contacto" (solo gerencia, con verificación
-- en dos pasos) y retención programada. Los datos personales se van; los leads
-- y sus montos quedan. Un lead compartido con otro contacto no se toca y la
-- actividad reciente frena la retención (Ignacio, 2026-11-05).
begin;
select plan(32);

create function pg_temp.login_as(p_email text, p_aal text default 'aal2') returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Datos ficticios. A: se anonimiza a mano (un lead propio y uno compartido con
-- B). Todos los demás tienen un único lead de hace 25 meses: C perdido, con
-- nota y tarea igual de antiguas (vence); D abierto; E perdido con una nota de
-- ayer; F archivado con una tarea de ayer; G perdido con una nota del lead de
-- ayer.
alter table public.contacts disable trigger "20_contact_saved";
create temp table fx as
with c as (
  insert into public.contacts (first_name, last_name, gender, title, background, linkedin_url, email_jsonb, phone_jsonb)
  values
    ('Ana', 'Prueba', 'female', 'Jefa de compras', 'Contacto ficticio', 'https://linkedin.example/ana',
     '[{"email": "ana@prueba.example", "type": "Work"}]', '[{"number": "+56 9 0000 0001", "type": "Work"}]'),
    ('Beto', 'Prueba', null, null, null, null, '[{"email": "beto@prueba.example", "type": "Work"}]', '[]'),
    ('Carla', 'Prueba', null, null, null, null, '[{"email": "carla@prueba.example", "type": "Work"}]', '[]'),
    ('Dario', 'Prueba', null, null, null, null, '[{"email": "dario@prueba.example", "type": "Work"}]', '[]'),
    ('Elsa', 'Prueba', null, null, null, null, '[{"email": "elsa@prueba.example", "type": "Work"}]', '[]'),
    ('Fabio', 'Prueba', null, null, null, null, '[{"email": "fabio@prueba.example", "type": "Work"}]', '[]'),
    ('Gema', 'Prueba', null, null, null, null, '[{"email": "gema@prueba.example", "type": "Work"}]', '[]')
  returning id, first_name
)
select
  (select id from c where first_name = 'Ana') as a,
  (select id from c where first_name = 'Beto') as b,
  (select id from c where first_name = 'Carla') as c,
  (select id from c where first_name = 'Dario') as d,
  (select id from c where first_name = 'Elsa') as e,
  (select id from c where first_name = 'Fabio') as f,
  (select id from c where first_name = 'Gema') as g;
grant select on fx to authenticated;

insert into public.deals (name, contact_ids, stage, amount, last_activity_at, raw_source)
select v.name, v.contact_ids, v.stage, v.amount, v.last_activity_at, v.raw_source
  from fx, lateral (values
    ('Lead solo de A', array[a], 'ganado', 1500000, now(), '{"from": "ana@prueba.example", "body": "Hola, soy Ana Prueba"}'::jsonb),
    ('Lead de A y B', array[a, b], 'cotizado', 700000, now(), '{"from": "ana@prueba.example"}'::jsonb),
    ('Lead vencido de C', array[c], 'perdido', 900000, now() - interval '25 months', null),
    ('Lead abierto de D', array[d], 'contactado', 300000, now() - interval '25 months', null),
    ('Lead vencido de E', array[e], 'perdido', 100000, now() - interval '25 months', null),
    ('Lead vencido de F', array[f], 'archivado', 100000, now() - interval '25 months', null),
    ('Lead vencido de G', array[g], 'perdido', 100000, now() - interval '25 months', null)
  ) as v(name, contact_ids, stage, amount, last_activity_at, raw_source);

insert into public.contact_notes (contact_id, text, date, attachments)
select a, 'Llamó desde su celular personal', now(), array['{"path": "ana-cedula.pdf", "title": "cedula.pdf"}'::jsonb] from fx
union all select c, 'Nota antigua de Carla', now() - interval '25 months', '{}' from fx
union all select e, 'Elsa volvió a escribir', now() - interval '1 day', '{}' from fx;
insert into public.deal_notes (deal_id, text, attachments)
select d.id, 'Nota del lead ' || d.name,
       array[jsonb_build_object('path', case d.name when 'Lead solo de A' then 'ana-plano.pdf' else 'compartido.pdf' end)]
  from public.deals d where d.name in ('Lead solo de A', 'Lead de A y B');
insert into public.deal_notes (deal_id, text, date)
select d.id, 'Gema pidió otra cotización', now() - interval '1 day' from public.deals d where d.name = 'Lead vencido de G';
insert into public.tasks (contact_id, type, text, created_at)
select a, 'call', 'Llamar a Ana a su celular', now() from fx
union all select c, 'call', 'Tarea antigua de Carla', now() - interval '25 months' from fx
union all select f, 'call', 'Llamar a Fabio', now() - interval '1 day' from fx;
insert into public.followups (deal_id, step, scheduled_at, channels, messages)
select d.id, 1, now(), '{correo,whatsapp}',
       '{"correo": {"template_id": 7, "subject": "Hola Ana", "body": "Estimada Ana Prueba"}, "whatsapp": {"template_id": null, "body": "Hola Ana"}}'
  from public.deals d where d.name in ('Lead solo de A', 'Lead de A y B');
insert into public.alerts (type, recipient_sales_id, deal_id, message)
select 'cliente_respondio', (select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl'), d.id, 'Ana Prueba respondió'
  from public.deals d where d.name in ('Lead solo de A', 'Lead de A y B');

create temp table before_deals as
select count(*) as n, sum(amount)::bigint as total, array_agg(stage order by id) as stages, array_agg(name order by id) as names
  from public.deals d, fx where d.contact_ids @> array[fx.a];

-- Ejecutivo y lector no pueden; gerencia sin verificación en dos pasos, tampoco.
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact((select a from fx))$$, '42501', null, 'un ejecutivo no anonimiza');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact((select a from fx))$$, '42501', null, 'un lector no anonimiza');
reset role;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal1');
select throws_ok($$select public.anonymize_contact((select a from fx))$$, '42501', null, 'gerencia sin verificar (aal1) no anonimiza');
reset role;

-- Gerencia verificada sí.
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact(-1)$$, 'P0002', null, 'un contacto que no existe se rechaza');
select set_eq($$select unnest(public.anonymize_contact((select a from fx)))$$,
  array['ana-cedula.pdf', 'ana-plano.pdf'], 'gerencia anonimiza y recibe las rutas de los adjuntos quitados');
reset role;

select is((select first_name || ' ' || last_name from public.contacts, fx where id = fx.a),
  'Contacto anonimizado #' || (select a from fx), 'el nombre queda anónimo');
select is((select jsonb_build_array(email_jsonb, phone_jsonb, avatar, title, background, linkedin_url, gender) from public.contacts, fx where id = fx.a),
  '[[], [], null, null, null, null, null]'::jsonb, 'sin correo, teléfono, cargo, antecedentes, LinkedIn ni género');
select ok((select anonymized_at is not null from public.contacts, fx where id = fx.a), 'anonymized_at queda puesto');
select is((select array[n.text, n.attachments::text] from public.contact_notes n, fx where n.contact_id = fx.a),
  array['[contenido anonimizado]', '{}'], 'sus notas quedan sin texto ni adjuntos');
select is((select t.text from public.tasks t, fx where t.contact_id = fx.a), '[contenido anonimizado]', 'sus tareas quedan sin texto');
select is((select array[n.text, n.attachments::text] from public.deal_notes n join public.deals d on d.id = n.deal_id where d.name = 'Lead solo de A'),
  array['[contenido anonimizado]', '{}'], 'también las notas del lead que solo lo tenía a él');
select ok((select raw_source is null from public.deals where name = 'Lead solo de A'), 'el raw_source de ese lead queda vacío');
select is((select f.messages from public.followups f join public.deals d on d.id = f.deal_id where d.name = 'Lead solo de A'),
  '{"correo": {"template_id": 7, "subject": "[contenido anonimizado]", "body": "[contenido anonimizado]"}, "whatsapp": {"template_id": null, "body": "[contenido anonimizado]"}}'::jsonb,
  'los textos de sus seguimientos se van; canal y plantilla quedan');
select is((select a.message from public.alerts a join public.deals d on d.id = a.deal_id where d.name = 'Lead solo de A'),
  '[contenido anonimizado]', 'las alertas de ese lead quedan sin texto');

-- El lead compartido con otro contacto no se toca.
select is((select n.text from public.deal_notes n join public.deals d on d.id = n.deal_id where d.name = 'Lead de A y B'),
  'Nota del lead Lead de A y B', 'las notas de un lead compartido con otro contacto no se tocan');
select is((select jsonb_build_array(d.raw_source ->> 'from', f.messages -> 'correo' ->> 'body', a.message)
             from public.deals d join public.followups f on f.deal_id = d.id join public.alerts a on a.deal_id = d.id
            where d.name = 'Lead de A y B'),
  '["ana@prueba.example", "Estimada Ana Prueba", "Ana Prueba respondió"]'::jsonb,
  'tampoco su raw_source, sus seguimientos ni sus alertas');
select is((select first_name from public.contacts, fx where id = fx.b), 'Beto', 'el otro contacto del lead compartido sigue igual');
select results_eq(
  $$select count(*), sum(amount)::bigint, array_agg(stage order by id), array_agg(name order by id) from public.deals d, fx where d.contact_ids @> array[fx.a]$$,
  $$select n, total, stages, names from before_deals$$,
  'sus leads conservan cantidad, montos, etapas y nombres');
select is((select jsonb_build_array(l.actor_sales_id, l.details) from public.audit_log l where l.action = 'contact.anonymized'),
  jsonb_build_array((select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl'),
                    jsonb_build_object('contact_id', (select a from fx), 'attachments', 2)),
  'audit_log registra quién, qué contacto y cuántos adjuntos');

-- Anonimizar de nuevo no hace nada: ni toca lo escrito después ni deja rastro.
insert into public.contact_notes (contact_id, text) select a, 'Nota posterior' from fx;
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is(public.anonymize_contact((select a from fx)), '{}'::text[], 'anonimizar un contacto ya anonimizado devuelve vacío');
reset role;
select is(jsonb_build_array(
            (select count(*) from public.audit_log where action = 'contact.anonymized'),
            (select count(*) from public.contact_notes n, fx where n.contact_id = fx.a and n.text = 'Nota posterior')),
  '[1, 1]'::jsonb, 'la segunda vez no cambia nada ni escribe en audit_log');

-- Retención programada: solo el planificador (sin JWT) o service_role.
select ok(not has_function_privilege('authenticated', 'public.anonymize_expired_contacts()', 'execute')
      and not has_function_privilege('anon', 'public.anonymize_contact(bigint)', 'execute')
      and not has_function_privilege('authenticated', 'public.anonymize_contact_data(bigint, bigint)', 'execute'),
  'una sesión de la API no puede lanzar la retención ni la función interna');
select set_config('request.jwt.claims', '', true);

update public.configuration set config = config || '{"dataRetentionMonths": 0}' where id = 1;
select is(public.anonymize_expired_contacts(), 0, 'con retención 0 no se anonimiza nada');
select is((select first_name from public.contacts, fx where id = fx.c), 'Carla', 'el contacto vencido sigue intacto con retención 0');

update public.configuration set config = config || '{"dataRetentionMonths": 24}' where id = 1;
select is(public.anonymize_expired_contacts(), 1, 'con 24 meses solo se anonimiza el contacto sin actividad desde hace 25');
select ok((select anonymized_at is not null from public.contacts, fx where id = fx.c),
  'el del lead vencido queda anónimo: su nota y su tarea antiguas no lo frenan');
select is((select first_name from public.contacts, fx where id = fx.d), 'Dario', 'un contacto con un lead abierto no se anonimiza');
select is((select first_name from public.contacts, fx where id = fx.e), 'Elsa', 'un contacto con una nota de ayer no se anonimiza');
select is((select first_name from public.contacts, fx where id = fx.f), 'Fabio', 'un contacto con una tarea de ayer no se anonimiza');
select is((select first_name from public.contacts, fx where id = fx.g), 'Gema', 'un contacto con una nota de ayer en su lead no se anonimiza');
select is((select l.details from public.audit_log l where l.action = 'retention.run'),
  '{"contacts": 1, "months": 24}'::jsonb, 'la corrida queda en audit_log con su cantidad');

select is((select schedule || ' ' || command from cron.job where jobname = 'anonimizar-retencion'),
  '0 7 * * * select public.anonymize_expired_contacts()', 'el job diario de pg_cron existe');

select * from finish();
rollback;
