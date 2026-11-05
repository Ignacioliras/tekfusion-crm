-- RF-17 (Ley 21.719): "Anonimizar contacto" (solo gerencia) y retención
-- programada. Los datos personales se van; los leads y sus montos quedan.
begin;
select plan(19);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Datos ficticios: A (a anonimizar a mano, con un lead propio y uno compartido
-- con B), C (lead perdido hace 25 meses) y D (lead abierto).
alter table public.contacts disable trigger "20_contact_saved";
create temp table fx as
with c as (
  insert into public.contacts (first_name, last_name, title, background, linkedin_url, email_jsonb, phone_jsonb)
  values
    ('Ana', 'Prueba', 'Jefa de compras', 'Contacto ficticio', 'https://linkedin.example/ana',
     '[{"email": "ana@prueba.example", "type": "Work"}]', '[{"number": "+56 9 0000 0001", "type": "Work"}]'),
    ('Beto', 'Prueba', null, null, null, '[{"email": "beto@prueba.example", "type": "Work"}]', '[]'),
    ('Carla', 'Prueba', null, null, null, '[{"email": "carla@prueba.example", "type": "Work"}]', '[]'),
    ('Dario', 'Prueba', null, null, null, '[{"email": "dario@prueba.example", "type": "Work"}]', '[]')
  returning id, first_name
)
select
  (select id from c where first_name = 'Ana') as a,
  (select id from c where first_name = 'Beto') as b,
  (select id from c where first_name = 'Carla') as c,
  (select id from c where first_name = 'Dario') as d;
grant select on fx to authenticated;

insert into public.deals (name, contact_ids, stage, amount, last_activity_at)
select 'Lead solo de A', array[a], 'ganado', 1500000, now() from fx
union all select 'Lead de A y B', array[a, b], 'cotizado', 700000, now() from fx
union all select 'Lead vencido de C', array[c], 'perdido', 900000, now() - interval '25 months' from fx
union all select 'Lead abierto de D', array[d], 'contactado', 300000, now() - interval '25 months' from fx;

insert into public.contact_notes (contact_id, text, attachments)
select a, 'Llamó desde su celular personal', array['{"path": "ana-cedula.pdf", "title": "cedula.pdf"}'::jsonb] from fx;
insert into public.deal_notes (deal_id, text, attachments)
select d.id, 'Nota del lead ' || d.name,
       array[jsonb_build_object('path', case d.name when 'Lead solo de A' then 'ana-plano.pdf' else 'compartido.pdf' end)]
  from public.deals d where d.name in ('Lead solo de A', 'Lead de A y B');

create temp table before_deals as
select count(*) as n, sum(amount)::bigint as total, array_agg(stage order by id) as stages
  from public.deals d, fx where d.contact_ids @> array[fx.a];

-- Ejecutivo y lector no pueden.
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact((select a from fx))$$, '42501', null, 'un ejecutivo no anonimiza');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact((select a from fx))$$, '42501', null, 'un lector no anonimiza');
reset role;

-- Gerencia sí.
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok($$select public.anonymize_contact(-1)$$, 'P0002', null, 'un contacto que no existe se rechaza');
select set_eq($$select unnest(public.anonymize_contact((select a from fx)))$$,
  array['ana-cedula.pdf', 'ana-plano.pdf'], 'gerencia anonimiza y recibe las rutas de los adjuntos quitados');
reset role;

select is((select first_name || ' ' || last_name from public.contacts, fx where id = fx.a),
  'Contacto anonimizado #' || (select a from fx), 'el nombre queda anónimo');
select is((select jsonb_build_array(email_jsonb, phone_jsonb, avatar, title, background, linkedin_url) from public.contacts, fx where id = fx.a),
  '[[], [], null, null, null, null]'::jsonb, 'sin correo, teléfono, cargo, antecedentes ni LinkedIn');
select is((select array[n.text, n.attachments::text] from public.contact_notes n, fx where n.contact_id = fx.a),
  array['[contenido anonimizado]', '{}'], 'sus notas quedan sin texto ni adjuntos');
select is((select array[n.text, n.attachments::text] from public.deal_notes n join public.deals d on d.id = n.deal_id where d.name = 'Lead solo de A'),
  array['[contenido anonimizado]', '{}'], 'también las notas del lead que solo lo tenía a él');
select is((select n.text from public.deal_notes n join public.deals d on d.id = n.deal_id where d.name = 'Lead de A y B'),
  'Nota del lead Lead de A y B', 'las notas de un lead compartido con otro contacto no se tocan');
select is((select first_name from public.contacts, fx where id = fx.b), 'Beto', 'el otro contacto del lead compartido sigue igual');
select results_eq(
  $$select count(*), sum(amount)::bigint, array_agg(stage order by id) from public.deals d, fx where d.contact_ids @> array[fx.a]$$,
  $$select n, total, stages from before_deals$$,
  'sus leads conservan cantidad, montos y etapas');
select is((select jsonb_build_array(l.actor_sales_id, l.details) from public.audit_log l where l.action = 'contact.anonymized'),
  jsonb_build_array((select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl'),
                    jsonb_build_object('contact_id', (select a from fx), 'attachments', 2)),
  'audit_log registra quién, qué contacto y cuántos adjuntos');

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
select is(public.anonymize_expired_contacts(), 1, 'con 24 meses se anonimiza el contacto con su único lead perdido hace 25');
select is((select array[c.last_name, d.first_name] from public.contacts c, public.contacts d, fx where c.id = fx.c and d.id = fx.d),
  array['anonimizado #' || (select c from fx), 'Dario'], 'el del lead vencido queda anónimo y el del lead abierto no');
select is((select l.details from public.audit_log l where l.action = 'retention.run'),
  '{"contacts": 1, "months": 24}'::jsonb, 'la corrida queda en audit_log con su cantidad');

select is((select schedule || ' ' || command from cron.job where jobname = 'anonimizar-retencion'),
  '0 7 * * * select public.anonymize_expired_contacts()', 'el job diario de pg_cron existe');

select * from finish();
rollback;
