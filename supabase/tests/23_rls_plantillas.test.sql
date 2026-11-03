-- Plantillas y respuestas rápidas (docs/08, RF-14): configuración; todo
-- usuario interno las lee, solo gerencia las escribe. Las plantillas solo usan
-- las variables que el envío sabe llenar.
begin;
select plan(12);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Ejecutivo y lector: solo leen ----------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select count(*) from public.templates), 4::bigint, 'ejecutivo lee las plantillas');
select is((select count(*) from public.quick_replies), 4::bigint, 'ejecutivo lee las respuestas rápidas');
select throws_ok('insert into public.templates (name, channel, body) values (''x'', ''whatsapp'', ''hola'')',
  '42501', null, 'ejecutivo no crea plantillas');
select throws_ok('insert into public.quick_replies (title, body) values (''x'', ''hola'')',
  '42501', null, 'ejecutivo no crea respuestas rápidas');
update public.templates set body = 'cambiada';
delete from public.quick_replies;
reset role;
select is((select count(*) from public.templates where body = 'cambiada'), 0::bigint, 'ejecutivo no edita plantillas');
select is((select count(*) from public.quick_replies), 4::bigint, 'ejecutivo no borra respuestas rápidas');

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.templates), 4::bigint, 'lector lee las plantillas');
reset role;

-- Gerencia escribe -----------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select lives_ok('insert into public.templates (name, channel, subject, body) values (''pgtap'', ''correo'', ''Hola {{nombre}}'', ''{{empresa}} · {{producto}} · {{ejecutivo}}'')',
  'gerencia crea una plantilla con las cuatro variables');
select lives_ok('delete from public.quick_replies where title = ''Saludo''', 'gerencia borra una respuesta rápida');
reset role;

-- Restricciones --------------------------------------------------------------------
select throws_ok('insert into public.templates (name, channel, body) values (''precio'', ''whatsapp'', ''Hola {{nombre}}, el precio es {{precio}}'')',
  '23514', null, 'una plantilla no usa variables desconocidas');
select throws_ok('insert into public.templates (name, channel, body) values (''abierta'', ''whatsapp'', ''Hola {{nombre'')',
  '23514', null, 'una variable mal cerrada se rechaza');
select throws_ok('insert into public.templates (name, channel, subject, body) values (''asunto'', ''whatsapp'', ''Asunto'', ''hola'')',
  '23514', null, 'solo las plantillas de correo tienen asunto');

select * from finish();
rollback;
