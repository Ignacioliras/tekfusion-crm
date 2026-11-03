-- Cotizaciones (docs/08): se ven con el lead; las escriben gerencia y el
-- ejecutivo dueño del lead; nunca se borran. El PDF vive en el bucket privado
-- "quotes" bajo deals/<id>/<uuid>.pdf (solo PDF, 15 MB).
begin;
select plan(23);

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
create temp table q as
select
  (select min(d.id) from public.deals d where d.sales_id = (select camila from fx) and d.stage = 'cotizado') as own_deal,
  (select min(d.id) from public.deals d where d.sales_id = (select diego from fx) and d.stage = 'cotizado') as foreign_deal,
  (select min(qq.id) from public.quotes qq join public.deals d on d.id = qq.deal_id where d.sales_id = (select diego from fx)) as foreign_quote,
  (select count(*) from public.quotes qq join public.deals d on d.id = qq.deal_id where d.sales_id = (select camila from fx)) as camila_quotes;
grant select on fx, q to authenticated;

insert into storage.objects (bucket_id, name) values
  ('quotes', format('deals/%s/00000000-0000-4000-8000-000000000001.pdf', (select own_deal from q))),
  ('quotes', format('deals/%s/00000000-0000-4000-8000-000000000002.pdf', (select foreign_deal from q)));

-- Lectura ----------------------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select ok((select camila_quotes from q) > 0, 'el seed deja cotizaciones a Camila');
select is((select count(*) from public.quotes), (select camila_quotes from q),
  'ejecutivo ve solo las cotizaciones de sus leads');
reset role;

select pg_temp.login_as('andrea.soto@tekfusion-demo.cl');
select is((select count(*) from public.quotes), 15::bigint, 'gerencia ve todas las cotizaciones');
reset role;

select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select is((select count(*) from public.quotes), 15::bigint, 'lector ve todas las cotizaciones');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path) values (%s, 9, 1000, %L)',
    (select own_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000009.pdf', (select own_deal from q))),
  '42501', null, 'lector no crea cotizaciones');
reset role;

-- Escritura del ejecutivo -------------------------------------------------------
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select lives_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path, is_current) values (%s, 9, 1000, %L, false)',
    (select own_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000003.pdf', (select own_deal from q))),
  'ejecutivo sube una cotización a su lead');
select is((select sales_id from public.quotes where deal_id = (select own_deal from q) and version = 9), (select camila from fx),
  'la cotización queda firmada por quien la sube');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path) values (%s, 9, 1000, %L)',
    (select foreign_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000004.pdf', (select foreign_deal from q))),
  '42501', null, 'ejecutivo no cotiza en un lead ajeno');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path, is_current, sales_id) values (%s, 10, 1000, %L, false, %s)',
    (select own_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000005.pdf', (select own_deal from q)), (select diego from fx)),
  '42501', null, 'ejecutivo no firma una cotización a nombre de otro');
update public.quotes set amount = 1 where id = (select foreign_quote from q);
select throws_ok(format('update public.quotes set sales_id = %s where deal_id = %s and version = 9', (select diego from fx), (select own_deal from q)),
  '42501', null, 'ejecutivo no cambia el autor de una cotización');
select throws_ok(format('update public.quotes set version = 8 where deal_id = %s and version = 9', (select own_deal from q)),
  '42501', null, 'ejecutivo no cambia la versión de una cotización');
select throws_ok(format('delete from public.quotes where deal_id = %s', (select own_deal from q)),
  '42501', null, 'nadie borra cotizaciones (sin grant de delete)');
reset role;
select isnt((select amount from public.quotes where id = (select foreign_quote from q)), 1::bigint,
  'ejecutivo no modifica la cotización de un lead ajeno');

-- Un lector que quedó dueño de un lead (p. ej. lo bajaron de rol) no escribe en él.
update public.deals set sales_id = (select id from public.sales where email = 'pablo.herrera@tekfusion-demo.cl') where id = (select foreign_deal from q);
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path, is_current) values (%s, 12, 1000, %L, false)',
    (select foreign_deal from q), format('deals/%s/00000000-0000-4000-8000-00000000000c.pdf', (select foreign_deal from q))),
  '42501', null, 'lector dueño de un lead no cotiza en él');
reset role;
update public.deals set sales_id = (select diego from fx) where id = (select foreign_deal from q);

-- Restricciones -------------------------------------------------------------------
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path) values (%s, 11, 1000, %L)',
    (select own_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000006.pdf', (select foreign_deal from q))),
  '23514', null, 'el PDF debe estar en la carpeta de su propio lead');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path) values (%s, 11, 1000, %L)',
    (select own_deal from q), format('deals/%s/cotizacion final.pdf', (select own_deal from q))),
  '23514', null, 'el nombre del PDF es regenerado (uuid), no el del usuario');
select throws_ok(format('insert into public.quotes (deal_id, version, amount, pdf_path) values (%s, 11, 1000, %L)',
    (select own_deal from q), format('deals/%s/00000000-0000-4000-8000-000000000007.pdf', (select own_deal from q))),
  '23505', null, 'un lead tiene una sola cotización vigente');

-- Storage ----------------------------------------------------------------------------
select is((select (public, file_size_limit, allowed_mime_types)::text from storage.buckets where id = 'quotes'),
  '(f,15728640,{application/pdf})', 'bucket quotes privado, solo PDF, máximo 15 MB');
select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');
select is((select string_agg(name, ',') from storage.objects where bucket_id = 'quotes'),
  format('deals/%s/00000000-0000-4000-8000-000000000001.pdf', (select own_deal from q)),
  'ejecutivo lee solo los PDF de sus leads');
select lives_ok(format('insert into storage.objects (bucket_id, name) values (''quotes'', %L)',
    format('deals/%s/00000000-0000-4000-8000-000000000008.pdf', (select own_deal from q))),
  'ejecutivo sube el PDF de su lead');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''quotes'', %L)',
    format('deals/%s/cotizacion.pdf', (select own_deal from q))),
  '42501', null, 'el PDF se sube con nombre regenerado');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''quotes'', %L)',
    format('deals/%s/00000000-0000-4000-8000-00000000000a.pdf', (select foreign_deal from q))),
  '42501', null, 'ejecutivo no sube PDF a un lead ajeno');
reset role;
select pg_temp.login_as('pablo.herrera@tekfusion-demo.cl');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (''quotes'', %L)',
    format('deals/%s/00000000-0000-4000-8000-00000000000b.pdf', (select own_deal from q))),
  '42501', null, 'lector no sube PDF');
reset role;

select * from finish();
rollback;
