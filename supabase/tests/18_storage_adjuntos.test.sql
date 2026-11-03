-- Adjuntos privados (docs/08): el bucket no es público y la policy de Storage
-- solo entrega los archivos de leads y contactos que el usuario puede ver.
-- Los archivos viven bajo la carpeta de su dueño: deals/<id>/…, contacts/<id>/…,
-- companies/…, sales/…, config/…; lo que quedó en la raíz, solo gerencia.
begin;
select plan(10);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
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
reset role;

-- Lector ---------------------------------------------------------------------
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments' and name like 'deals/%'), 3::bigint,
  'lector lee los adjuntos de todos los leads (los ve todos)');
select is((select count(*) from storage.objects where bucket_id = 'attachments' and name = '0.6.pdf'), 0::bigint,
  'lector no lee los archivos de la raíz');
select throws_ok('insert into storage.objects (bucket_id, name) values (''attachments'', ''companies/0.9.png'')', '42501', null,
  'lector no sube archivos');
reset role;

-- Gerencia -------------------------------------------------------------------
select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments'), 7::bigint, 'gerencia lee todo, incluida la raíz');
reset role;

-- Usuario dado de baja -------------------------------------------------------
update public.sales set disabled = true where id = (select diego from fx);
select pg_temp.login_as('diego.munoz@tekfusion-demo.cl');
select is((select count(*) from storage.objects where bucket_id = 'attachments'), 0::bigint, 'un usuario desactivado no lee ningún archivo');
reset role;

select is((select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'attachments_select' and qual like '%can_read_attachment%'),
  1::bigint, 'la policy de lectura pasa por can_read_attachment');

select * from finish();
rollback;
