-- Adjuntos privados (docs/08): el bucket no es público y la policy de Storage
-- solo entrega los archivos de leads y contactos que el usuario puede ver.
-- Los archivos viven bajo la carpeta de su dueño: deals/<id>/…, contacts/<id>/…,
-- companies/…, sales/…, config/…; lo que quedó en la raíz, solo gerencia.
begin;
select plan(16);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table fx as
select
  (select id from public.sales where email = 'camila.rojas@tekfusion-demo.cl') as camila,
  (select id from public.sales where email = 'diego.munoz@tekfusion-demo.cl') as diego;
create temp table files as
select
  (select min(id) from public.deals where sales_id = (select camila from fx)) as own_deal,
  (select min(id) from public.deals where sales_id = (select diego from fx)) as foreign_deal,
  (select min(id) from public.contacts where sales_id = (select camila from fx)) as own_contact,
  -- A contact of Diego that none of Camila's leads links (the contacts RLS
  -- also shows the contacts of one's own leads).
  (select min(c.id) from public.contacts c
    where c.sales_id = (select diego from fx)
      and not exists (select 1 from public.deals d where d.sales_id = (select camila from fx) and d.contact_ids @> array[c.id])) as foreign_contact;
grant select on fx, files to authenticated;

insert into storage.objects (bucket_id, name) values
  ('attachments', format('deals/%s/0.1.pdf', (select own_deal from files))),
  ('attachments', format('deals/%s/0.2.pdf', (select foreign_deal from files))),
  ('attachments', format('contacts/%s/0.3.png', (select own_contact from files))),
  ('attachments', format('contacts/%s/0.4.png', (select foreign_contact from files))),
  ('attachments', 'companies/0.5.png'),
  ('attachments', '0.6.pdf');

select is((select public from storage.buckets where id = 'attachments'), false, 'el bucket attachments es privado');

-- Ejecutivo ------------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is(
  (select string_agg(name, ',' order by name) from storage.objects where bucket_id = 'attachments'),
  format('companies/0.5.png,contacts/%s/0.3.png,deals/%s/0.1.pdf', (select own_contact from files), (select own_deal from files)),
  'ejecutivo lee los archivos de sus leads y contactos y los logos, no los ajenos ni la raíz');
select lives_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'attachments', format('deals/%s/0.7.pdf', (select own_deal from files))),
  'ejecutivo sube un adjunto a un lead');
select throws_ok('insert into storage.objects (bucket_id, name) values (''attachments'', ''0.8.pdf'')', '42501', null,
  'nadie sube a la raíz del bucket');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'attachments', format('deals/%s/0.9.pdf', (select foreign_deal from files))), '42501', null,
  'ejecutivo no sube a la carpeta de un lead ajeno');
-- Supabase no deja borrar filas de storage.objects desde SQL ("use the Storage
-- API"): el borrado se prueba por su predicado y por la policy que lo usa.
select is(public.can_write_attachment(format('deals/%s/0.2.pdf', (select foreign_deal from files))), false, 'ejecutivo no borra ni sube a un lead ajeno (can_write_attachment)');
select is(public.can_write_attachment(format('deals/%s/0.7.pdf', (select own_deal from files))), true, 'ejecutivo escribe en su lead (can_write_attachment)');
reset role;
-- Un nombre con un id demasiado largo no puede romper los listados de nadie.
insert into storage.objects (bucket_id, name) values ('attachments', 'deals/99999999999999999999/0.1.pdf');
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select lives_ok('select count(*) from storage.objects where bucket_id = ''attachments''', 'un id gigante en una ruta no desborda bigint');
reset role;

-- Lector ---------------------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments' and name like 'deals/%'), 3::bigint,
  'lector lee los adjuntos de todos los leads (los ve todos)');
select is(public.can_write_attachment('companies/0.5.png'), false, 'lector no escribe nada (can_write_attachment)');
select is((select count(*) from storage.objects where bucket_id = 'attachments' and name = '0.6.pdf'), 0::bigint,
  'lector no lee los archivos de la raíz');
select throws_ok('insert into storage.objects (bucket_id, name) values (''attachments'', ''companies/0.9.png'')', '42501', null,
  'lector no sube archivos');
reset role;

-- Gerencia -------------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments'), 8::bigint, 'gerencia lee todo, incluida la raíz y el id gigante');
reset role;

-- Usuario dado de baja -------------------------------------------------------
update public.sales set disabled = true where id = (select diego from fx);
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments'), 0::bigint, 'un usuario desactivado no lee ningún archivo');
reset role;

select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_select' and qual like '%can_read_attachment%'),
  1::bigint, 'la policy de lectura pasa por can_read_attachment');
select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname in ('attachments_insert', 'attachments_delete')
    and coalesce(qual, '') || coalesce(with_check, '') like '%can_write_attachment%'),
  2::bigint, 'subir y borrar pasan por can_write_attachment');

select * from finish();
rollback;
