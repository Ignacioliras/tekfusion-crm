-- Trigger wa_cliente_respondio (docs/05 tg_mensaje_entrante): un mensaje
-- entrante de WhatsApp en un lead cancela sus seguimientos pendientes y crea la
-- alerta cliente_respondio para el ejecutivo del lead. Saliente, entrante sin
-- lead o reintento del webhook: nada. Lead sin ejecutivo: cancela, sin alerta.
-- Datos propios (leads y números ficticios), los mensajes entran por
-- wa_ingest_message como lo hace el receptor.
begin;
select plan(13);

create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila;

insert into public.deals (name, stage, sales_id, company_id) values
  ('Válvulas planta Ficticia A', 'cotizado', (select camila from fx), 1),
  ('Tuberías obra Ficticia B', 'cotizado', (select camila from fx), 1),
  ('Geoceldas camino Ficticio C', 'cotizado', null, 1);
create temp table dl as select name, id from public.deals
 where name in ('Válvulas planta Ficticia A', 'Tuberías obra Ficticia B', 'Geoceldas camino Ficticio C');

-- A: dos pendientes y uno ya enviado; B y C: un pendiente cada uno.
insert into public.followups (deal_id, step, scheduled_at, channels, status, sent_at)
select dl.id, s.step, now() + s.step * interval '1 day', '{whatsapp}', s.status::public.followup_status, s.sent_at
  from dl
  join (values ('Válvulas planta Ficticia A', 1, 'enviado', now()),
               ('Válvulas planta Ficticia A', 2, 'pendiente', null),
               ('Válvulas planta Ficticia A', 3, 'pendiente', null),
               ('Tuberías obra Ficticia B', 1, 'pendiente', null),
               ('Geoceldas camino Ficticio C', 1, 'pendiente', null)) s(name, step, status, sent_at)
    on s.name = dl.name;

insert into public.wa_conversations (phone, active_deal_id) values
  ('+56900000071', (select id from dl where name = 'Válvulas planta Ficticia A')),
  ('+56900000072', (select id from dl where name = 'Tuberías obra Ficticia B')),
  ('+56900000073', (select id from dl where name = 'Geoceldas camino Ficticio C')),
  ('+56900000074', null);

create function pg_temp.pending(p_name text) returns bigint language sql as $$
  select count(*) from public.followups f join dl on dl.id = f.deal_id
   where dl.name = p_name and f.status = 'pendiente' $$;
create function pg_temp.alerts_of(p_name text) returns bigint language sql as $$
  select count(*) from public.alerts a join dl on dl.id = a.deal_id
   where dl.name = p_name and a.type = 'cliente_respondio' $$;
create temp table alerts_before as select count(*) as n from public.alerts;

-- Nadie de la API ejecuta la función del trigger --------------------------------
select ok(not has_function_privilege('authenticated', 'public.wa_cliente_respondio()', 'execute')
      and not has_function_privilege('anon', 'public.wa_cliente_respondio()', 'execute')
      and not has_function_privilege('service_role', 'public.wa_cliente_respondio()', 'execute'),
  'ningún rol de la API ejecuta wa_cliente_respondio');

-- Saliente: nada -----------------------------------------------------------------
select public.wa_ingest_message('tekfusion', 'T37-OUT-1', '+56900000072', 'saliente', 'texto', 'Hola, le escribo por la cotización', now(), '{}');
select is(pg_temp.pending('Tuberías obra Ficticia B'), 1::bigint, 'un saliente no cancela seguimientos');
select is(pg_temp.alerts_of('Tuberías obra Ficticia B'), 0::bigint, 'un saliente no crea alerta');

-- Entrante sin lead: nada --------------------------------------------------------
select public.wa_ingest_message('tekfusion', 'T37-IN-NOLEAD', '+56900000074', 'entrante', 'texto', 'Hola, quiero información', now(), '{}');
select is((select count(*) from public.alerts), (select n from alerts_before), 'un entrante sin lead no crea alertas');
select is((select count(*) from public.followups where cancel_reason = 'Cliente respondió por WhatsApp'), 0::bigint,
  'un entrante sin lead no cancela seguimientos');

-- Entrante en el lead A ----------------------------------------------------------
select public.wa_ingest_message('tekfusion', 'T37-IN-A1', '+56900000071', 'entrante', 'texto', 'Recibí la cotización, gracias', now(), '{}');
select is(pg_temp.pending('Válvulas planta Ficticia A'), 0::bigint, 'el entrante cancela los pendientes del lead');
select is((select array_agg(f.status::text || ':' || coalesce(f.cancel_reason, '-') order by f.step)
             from public.followups f join dl on dl.id = f.deal_id where dl.name = 'Válvulas planta Ficticia A'),
  array['enviado:-', 'cancelado:Cliente respondió por WhatsApp', 'cancelado:Cliente respondió por WhatsApp'],
  'el ya enviado no cambia y los cancelados llevan el motivo');
select is(pg_temp.pending('Tuberías obra Ficticia B'), 1::bigint, 'los seguimientos de otro lead no se tocan');
select results_eq(
  $$select a.recipient_sales_id, a.message from public.alerts a join dl on dl.id = a.deal_id
     where dl.name = 'Válvulas planta Ficticia A' and a.type = 'cliente_respondio'$$,
  $$select camila, 'El cliente respondió por WhatsApp en el lead «Válvulas planta Ficticia A»' from fx$$,
  'crea una alerta cliente_respondio para el ejecutivo, que nombra al lead');

-- Reintento y segundo mensaje: no repiten la alerta abierta ------------------------
select public.wa_ingest_message('tekfusion', 'T37-IN-A1', '+56900000071', 'entrante', 'texto', 'Recibí la cotización, gracias', now(), '{}');
select is(pg_temp.alerts_of('Válvulas planta Ficticia A'), 1::bigint, 'un reintento del webhook no crea otra alerta');
select lives_ok($$select public.wa_ingest_message('tekfusion', 'T37-IN-A2', '+56900000071', 'entrante', 'texto', '¿Y el plazo de entrega?', now(), '{}')$$,
  'un segundo entrante con la alerta abierta no falla');
select is(pg_temp.alerts_of('Válvulas planta Ficticia A'), 1::bigint, 'ni repite la alerta abierta');

-- Lead sin ejecutivo: cancela, sin alerta -----------------------------------------
select public.wa_ingest_message('tekfusion', 'T37-IN-C1', '+56900000073', 'entrante', 'texto', 'Hola', now(), '{}');
select ok(pg_temp.pending('Geoceldas camino Ficticio C') = 0 and pg_temp.alerts_of('Geoceldas camino Ficticio C') = 0,
  'un lead sin ejecutivo cancela sus pendientes pero no crea alerta');

select * from finish();
rollback;
