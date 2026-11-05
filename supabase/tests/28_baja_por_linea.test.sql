-- "Dar de baja" con suplente por línea (docs/10, 2026-11-03): cada lead abierto
-- va al suplente de su línea; uno 'indeterminada' o sin suplente válido, al de
-- la primera línea del usuario; cada contacto, al que recibió la mayoría de
-- sus leads; las tareas pendientes siguen a su contacto. Escenario: Camila
-- (válvulas, suplente Diego; geoceldas, suplente Andrea para esta prueba).
begin;
select plan(13);

create temp table fx as
select
  (select id from public.sales where email = 'andrea.soto@tekfusion-demo.cl') as andrea,
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego;
grant select on fx to service_role;

update public.business_lines set substitute_sales_id = (select andrea from fx) where code = 'geoceldas';

-- Contacto X en dos leads de válvulas y uno de geoceldas; Y sin leads.
insert into public.contacts (first_name, last_name, sales_id) values
  ('Ximena', 'Prueba', (select camila from fx)),
  ('Yerko', 'Prueba', (select camila from fx));
create temp table c as
select (select id from public.contacts where first_name = 'Ximena' and last_name = 'Prueba') as x,
       (select id from public.contacts where first_name = 'Yerko' and last_name = 'Prueba') as y;
grant select on c to service_role;

insert into public.deals (name, stage, business_line, sales_id, contact_ids) values
  ('Prueba V1', 'nuevo',      'valvulas',      (select camila from fx), array[(select x from c)]),
  ('Prueba V2', 'contactado', 'valvulas',      (select camila from fx), array[(select x from c)]),
  ('Prueba G1', 'cotizado',   'geoceldas',     (select camila from fx), array[(select x from c)]),
  ('Prueba I1', 'nuevo',      'indeterminada', (select camila from fx), '{}');
create temp table d as
select name, id from public.deals where name like 'Prueba _1' or name = 'Prueba V2';
grant select on d to service_role;

insert into public.tasks (contact_id, type, text, due_date, sales_id, done_date) values
  ((select x from c), 'call', 'Tarea pendiente de prueba', now() + interval '1 day', (select camila from fx), null),
  ((select x from c), 'call', 'Tarea cerrada de prueba',   now() - interval '1 day', (select camila from fx), now());

select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select lives_ok(format('select public.offboard_sale(%s, %s)', (select camila from fx), (select andrea from fx)),
  'gerencia da de baja a Camila');
reset role;

select is((select sales_id from public.deals where id = (select id from d where name = 'Prueba V1')), (select diego from fx),
  'un lead de válvulas va al suplente de válvulas');
select is((select sales_id from public.deals where id = (select id from d where name = 'Prueba G1')), (select andrea from fx),
  'un lead de geoceldas va al suplente de geoceldas');
select is((select sales_id from public.deals where id = (select id from d where name = 'Prueba I1')), (select diego from fx),
  'un lead indeterminado va al suplente de la primera línea');
select is((select sales_id from public.contacts where id = (select x from c)), (select diego from fx),
  'el contacto va a quien recibió la mayoría de sus leads (2 de 3)');
select is((select sales_id from public.contacts where id = (select y from c)), (select diego from fx),
  'un contacto sin leads reasignados va al suplente por defecto');
select is((select sales_id from public.tasks where text = 'Tarea pendiente de prueba'), (select diego from fx),
  'la tarea pendiente sigue al nuevo dueño de su contacto');
select is((select sales_id from public.tasks where text = 'Tarea cerrada de prueba'), (select camila from fx),
  'la tarea cerrada conserva su dueño');
select is((select owner_sales_id from public.business_lines where code = 'valvulas'), (select diego from fx),
  'válvulas pasa a su suplente');
select is((select owner_sales_id from public.business_lines where code = 'geoceldas'), (select andrea from fx),
  'geoceldas pasa a su suplente');
select is((select details ->> 'to' from public.audit_log where action = 'deal.reassigned'
             and deal_id = (select id from d where name = 'Prueba G1')),
  (select andrea from fx)::text, 'el registro de cada lead dice a quién fue');
select ok((select details -> 'reassigned_contact_ids' @> to_jsonb(array[(select x from c), (select y from c)])
             from public.audit_log where action = 'sale.offboarded' and target_sales_id = (select camila from fx)),
  'la baja registra los contactos reasignados');
select ok((select details -> 'reassigned_task_ids' @> (select to_jsonb(array_agg(id)) from public.tasks where text = 'Tarea pendiente de prueba')
              and not details -> 'reassigned_task_ids' @> (select to_jsonb(array_agg(id)) from public.tasks where text = 'Tarea cerrada de prueba')
             from public.audit_log where action = 'sale.offboarded' and target_sales_id = (select camila from fx)),
  'registra las tareas pendientes reasignadas, no las cerradas');

select * from finish();
rollback;
