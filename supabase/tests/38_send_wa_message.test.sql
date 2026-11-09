-- send_wa_message(conversation_id, text): escribir desde la bandeja (todavía no
-- envía nada: deja el mensaje en pendiente y lo encola en send_queue).
-- Ejecutivo solo en sus conversaciones; gerencia con aal2 en cualquiera; lector,
-- usuario sin sale y gerencia sin verificar (aal1), 42501. Texto vacío o de más
-- de 4096 caracteres, 22023. Conversación inexistente o archivada, P0002.
-- Más de 30 mensajes del mismo usuario en un minuto, PT429 (HTTP 429).
-- Seed: +56900000001 es de Camila, +56900000002 de Diego, +56900000003 sin asignar.
begin;
select plan(45);

create function pg_temp.login_as(p_email text, p_aal text default 'aal2') returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Usuario logueado sin fila en sales.
create function pg_temp.login_without_sale() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Una conversación de Camila sin lead activo.
insert into public.wa_conversations (phone, sales_id)
select '+56900000093', id from public.sales where email = 'camila.rojas@tekfusion-demo.cl';
-- Una archivada de Camila y otra de Diego.
insert into public.wa_conversations (phone, sales_id, archived)
select v.phone, s.id, true
  from (values ('+56900000094', 'camila.rojas@tekfusion-demo.cl'), ('+56900000095', 'diego.munoz@tekfusion-demo.cl')) v (phone, email)
  join public.sales s on s.email = v.email;
-- La de Diego con su último mensaje en el futuro: escribir no lo retrocede.
update public.wa_conversations set last_message_at = now() + interval '1 day' where phone = '+56900000002';

create temp table conv as select phone, id, active_deal_id, unread_count from public.wa_conversations;
create temp table people as select email, id from public.sales;
create temp table before as
  select (select count(*) from public.wa_messages) as messages, (select count(*) from public.send_queue) as queued;
grant select on conv, people to authenticated;

-- Permisos de ejecución ----------------------------------------------------------
select ok(has_function_privilege('authenticated', 'public.send_wa_message(bigint, text)', 'execute')
      and not has_function_privilege('anon', 'public.send_wa_message(bigint, text)', 'execute')
      and not has_function_privilege('service_role', 'public.send_wa_message(bigint, text)', 'execute'),
  'send_wa_message solo la ejecuta authenticated');

-- Sin permiso --------------------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'el lector no escribe en una conversación') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_without_sale();
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'un usuario sin sale no escribe en una conversación') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl', 'aal1');
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'gerencia sin verificar (aal1) no escribe') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'el ejecutivo no escribe en la conversación de otro ejecutivo') from conv where phone = '+56900000002';
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'el ejecutivo no escribe en una conversación sin asignar') from conv where phone = '+56900000003';
select throws_ok('select public.send_wa_message(-1, ''Hola'')', 'P0002', null,
  'escribir en una conversación inexistente da P0002');

-- Archivada (decisión de Ignacio 2026-11-06, docs/10) ----------------------------
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), 'P0002', format('conversation %s is archived', id),
  'el ejecutivo no escribe en su conversación archivada') from conv where phone = '+56900000094';
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), '42501', null,
  'en la archivada de otro ejecutivo manda el permiso: 42501, no P0002') from conv where phone = '+56900000095';

-- Texto --------------------------------------------------------------------------
select throws_ok(format('select public.send_wa_message(%s, '''')', id), '22023', null,
  'el texto vacío se rechaza') from conv where phone = '+56900000001';
select throws_ok(format('select public.send_wa_message(%s, %L)', id, E'  \n\t '), '22023', null,
  'el texto de solo espacios y saltos de línea se rechaza') from conv where phone = '+56900000001';
select throws_ok(format('select public.send_wa_message(%s, null)', id), '22023', null,
  'el texto nulo se rechaza') from conv where phone = '+56900000001';
select throws_ok(format('select public.send_wa_message(%s, repeat(''a'', 4097))', id), '22023', null,
  'el texto de 4097 caracteres se rechaza') from conv where phone = '+56900000001';
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select throws_ok(format('select public.send_wa_message(%s, ''Hola'')', id), 'P0002', null,
  'gerencia tampoco escribe en una conversación archivada') from conv where phone = '+56900000094';
reset role;

-- Ninguno de los rechazos de arriba (permiso, archivada, texto) guardó nada.
select is((select count(*) from public.wa_messages), (select messages from before),
  'ningún rechazo dejó un mensaje');
select is((select count(*) from public.send_queue), (select queued from before),
  'ningún rechazo dejó una fila en la cola');

-- El ejecutivo en su conversación ------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select t.text from conv, public.send_wa_message(conv.id, E'  Hola, le confirmo el despacho.\n') t
            where conv.phone = '+56900000001'),
  'Hola, le confirmo el despacho.', 'el ejecutivo escribe en la suya y recibe la fila con el texto recortado');
reset role;

create temp table m1 as select * from public.wa_messages order by id desc limit 1;

select is((select direction::text || '/' || type::text || '/' || status::text || '/' || origin::text from m1),
  'saliente/texto/pendiente/crm', 'el mensaje queda saliente, de texto, pendiente y con origen crm');
select is((select author_sales_id from m1), (select id from people where email = 'camila.rojas@tekfusion-demo.cl'),
  'el autor es quien lo escribió');
select is((select deal_id from m1), (select active_deal_id from conv where phone = '+56900000001'),
  'el mensaje queda en el lead activo de la conversación');
select ok((select job_id is not null and wa_message_id = 'pending:' || job_id from m1),
  'job_id generado y wa_message_id provisional derivado de él');
select ok((select sent_at = now() and not from_me_phone from m1),
  'sent_at es el momento del envío y no figura como escrito desde el teléfono');
select is((select channel::text || '/' || status::text from public.send_queue where message_id = (select id from m1)),
  'whatsapp/pendiente', 'queda una fila pendiente en send_queue con canal whatsapp');
select ok((select q.sales_id = m1.author_sales_id and q.deal_id = m1.deal_id and q.quote_id is null
             from public.send_queue q join m1 on m1.id = q.message_id),
  'la fila de la cola lleva al autor y el lead, sin cotización');
select is((select last_message_at from public.wa_conversations where phone = '+56900000001'), now(),
  'last_message_at sube al momento del envío');
select is((select unread_count from public.wa_conversations where phone = '+56900000001'),
  (select unread_count from conv where phone = '+56900000001'), 'los no leídos no cambian');

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select lives_ok(format('select public.send_wa_message(%s, repeat(''a'', 4096))', id),
  'un segundo mensaje de 4096 caracteres justos se acepta') from conv where phone = '+56900000001';
select is((select t.deal_id from conv, public.send_wa_message(conv.id, 'Hola') t where conv.phone = '+56900000093'),
  null::bigint, 'en una conversación sin lead el mensaje queda sin lead');
reset role;

select is((select count(distinct m.job_id) from public.wa_messages m
            where m.conversation_id = (select id from conv where phone = '+56900000001') and m.id >= (select id from m1)),
  2::bigint, 'cada mensaje tiene su propio job_id');
select is((select count(*) from public.send_queue q join public.wa_messages m on m.id = q.message_id
            where m.conversation_id = (select id from conv where phone = '+56900000093') and q.deal_id is null),
  1::bigint, 'el mensaje sin lead también se encola');

-- Gerencia con aal2 --------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select t.author_sales_id from conv, public.send_wa_message(conv.id, 'Buenas tardes, lo retomo yo.') t
            where conv.phone = '+56900000002'),
  (select id from people where email = 'andrea.soto@tekfusion-demo.cl'),
  'gerencia escribe en la conversación de un ejecutivo y queda como autora');
select lives_ok(format('select public.send_wa_message(%s, ''Hola'')', id),
  'gerencia escribe en una conversación sin asignar') from conv where phone = '+56900000003';
reset role;

select is((select last_message_at from public.wa_conversations where phone = '+56900000002'), now() + interval '1 day',
  'last_message_at no retrocede si ya había un mensaje posterior');
select is((select count(*) from public.wa_messages) - (select messages from before), 5::bigint,
  'los cinco envíos aceptados dejaron cinco mensajes');
select is((select count(*) from public.send_queue) - (select queued from before), 5::bigint,
  'y cinco filas en la cola');

-- La cola ------------------------------------------------------------------------
select throws_ok(format('insert into public.send_queue (deal_id, channel) values (%s, ''correo'')', active_deal_id),
  '23514', null, 'una fila de la cola sin cotización ni mensaje se rechaza') from conv where phone = '+56900000001';
select throws_ok(format('insert into public.send_queue (message_id, channel) values (%s, ''whatsapp'')', (select id from m1)),
  '23505', null, 'un mensaje no se encola dos veces');

-- Tope de 30 mensajes por usuario por minuto ---------------------------------------
-- Todo lo anterior (seed incluido) sale de la ventana. Queda dentro un
-- seguimiento a nombre de Camila, que no cuenta: el tope mira solo origen crm.
update public.wa_messages set created_at = now() - interval '1 hour';
insert into public.wa_messages (conversation_id, wa_message_id, direction, type, text, origin, author_sales_id, sent_at)
select c.id, 'test-38-seguimiento', 'saliente', 'texto', 'Seguimiento automático', 'seguimiento', p.id, now()
  from conv c, people p
 where c.phone = '+56900000001' and p.email = 'camila.rojas@tekfusion-demo.cl';
create temp table before_rate as
  select (select count(*) from public.wa_messages) as messages, (select count(*) from public.send_queue) as queued;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from conv, generate_series(1, 30) g, public.send_wa_message(conv.id, 'Aviso ' || g) t
            where conv.phone = '+56900000001'),
  30::bigint, 'gerencia escribe 30 mensajes dentro del mismo minuto');
reset role;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from conv, generate_series(1, 29) g, public.send_wa_message(conv.id, 'Mensaje ' || g) t
            where conv.phone = '+56900000001'),
  29::bigint, 'los 30 de otro usuario y el seguimiento no le cuentan a la ejecutiva: escribe 29');
select lives_ok(format('select public.send_wa_message(%s, ''Mensaje 30'')', id),
  'el mensaje 30 del minuto pasa') from conv where phone = '+56900000001';
select throws_ok(format('select public.send_wa_message(%s, ''Mensaje 31'')', id), 'PT429', 'rate limit: at most 30 messages per minute',
  'el mensaje 31 del minuto da PT429') from conv where phone = '+56900000001';
select throws_ok(format('select public.send_wa_message(%s, ''Mensaje 31'')', id), 'PT429', null,
  'el tope es por usuario, no por conversación') from conv where phone = '+56900000093';
reset role;

select is((select count(*) from public.wa_messages) - (select messages from before_rate), 60::bigint,
  'los rechazados por el tope no dejaron mensaje');
select is((select count(*) from public.send_queue) - (select queued from before_rate), 60::bigint,
  'ni fila en la cola');

-- Uno de los 30 de Camila cumple el minuto justo: deja de contar.
update public.wa_messages set created_at = now() - interval '1 minute'
 where id = (select max(id) from public.wa_messages
              where author_sales_id = (select id from people where email = 'camila.rojas@tekfusion-demo.cl'));
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select lives_ok(format('select public.send_wa_message(%s, ''Mensaje 31'')', id),
  'cuando un mensaje sale de la ventana de un minuto, vuelve a escribir') from conv where phone = '+56900000001';
reset role;

select * from finish();
rollback;
