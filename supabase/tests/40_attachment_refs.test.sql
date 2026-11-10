-- Consulta de referencias de adjuntos (supabase/functions/_shared/attachmentRefs.ts):
-- la usan delete_note_attachments (una nota soltó un archivo) y
-- purge-orphan-attachments (purga diaria). Dice qué archivos del bucket ya no
-- nombra ninguna fila; lo que devuelve se BORRA, así que acá se ejecuta contra
-- la base real con el seed y con una referencia en cada columna que puede tenerla.
-- quotes.pdf_path no puede: su check exige deals/<id>/<uuid>.pdf (sin el número
-- 0.<dígitos>) y los PDF viven en otro bucket; esa línea de la consulta es inerte.
--
-- El cuerpo de pg_temp.unreferenced es una copia literal de la consulta de
-- attachmentRefs.ts (con $1 en vez del parámetro de kysely). El test de vitest
-- supabase/functions/_shared/attachmentRefs.test.ts falla si dejan de coincidir.
begin;
select plan(12);

create function pg_temp.unreferenced(jsonb) returns setof text language sql as $query$
    with candidates as (
      select name, substring(name from '(0\.[0-9]+)[^/]*$') as stem
      from jsonb_array_elements_text($1::jsonb) as name
    ),
    refs as (
      select attachments::text as text from public.contact_notes
      union all select attachments::text from public.deal_notes
      union all select logo::text from public.companies
      union all select avatar::text from public.contacts
      union all select avatar::text from public.sales
      union all select config::text from public.configuration
      union all select pdf_path from public.quotes
      union all select attachment_path from public.wa_messages where attachment_path is not null
    )
    select c.name
    from candidates c
    where c.stem is not null
      and not exists (
        select 1 from refs where strpos(refs.text, c.stem) > 0
      )
$query$;

-- Seed tal cual ----------------------------------------------------------------
select lives_ok($$select * from pg_temp.unreferenced('["deals/1/0.5.pdf"]')$$,
  'la consulta corre contra la base con el seed (las 8 columnas existen y se pueden leer como texto)');
select is_empty(
  $$select * from pg_temp.unreferenced((
      select jsonb_agg(p) from (
        select pdf_path as p from public.quotes
        union all select attachment_path from public.wa_messages where attachment_path is not null) s))$$,
  'ninguna ruta guardada en el seed (PDF de cotizaciones, adjuntos de WhatsApp) sale como huérfana');

-- Una referencia por columna ---------------------------------------------------
-- Rutas inventadas con el formato real de las subidas: <carpeta>/<Math.random()>.<ext>.
insert into public.contact_notes (contact_id, text, attachments)
select id, 'Nota de prueba 40',
       array['{"src": "http://127.0.0.1:54321/storage/v1/object/sign/attachments/contacts/1/0.4001.pdf?token=x", "path": "contacts/1/0.4001.pdf", "title": "orden.pdf"}'::jsonb,
             -- La extensión puede quedar codificada en la URL guardada: se busca solo el número.
             '{"src": "http://127.0.0.1:54321/storage/v1/object/sign/attachments/contacts/1/0.4009.m%C3%A1s%20datos.pdf?token=x"}'::jsonb]
  from public.contacts order by id limit 1;
insert into public.deal_notes (deal_id, text, attachments)
select id, 'Nota de prueba 40', array['{"path": "deals/2/0.4002.png"}'::jsonb]
  from public.deals order by id limit 1;
update public.companies set logo = '{"src": "http://127.0.0.1:54321/storage/v1/object/sign/attachments/companies/0.4003.png?token=x"}'
 where id = (select min(id) from public.companies);
alter table public.contacts disable trigger "20_contact_saved";
update public.contacts set avatar = '{"src": "contacts/0.4004.jpg"}' where id = (select min(id) from public.contacts);
update public.sales set avatar = '{"src": "sales/0.4005.jpg"}' where email = 'camila.rojas@tekfusion-demo.cl';
update public.configuration set config = config || '{"lightModeLogo": {"src": "config/0.4006.png"}}' where id = 1;
update public.wa_messages set attachment_path = 'deals/2/0.4008.ogg' where wa_message_id = 'DEMO-WA-0004';

create temp table candidatos as select * from (values
  ('contacts/1/0.4001.pdf', 'contact_notes.attachments'),
  ('deals/2/0.4002.png', 'deal_notes.attachments'),
  ('companies/0.4003.png', 'companies.logo'),
  ('contacts/0.4004.jpg', 'contacts.avatar'),
  ('sales/0.4005.jpg', 'sales.avatar'),
  ('config/0.4006.png', 'configuration.config'),
  ('deals/2/0.4008.ogg', 'wa_messages.attachment_path')
) v (name, columna);

select is_empty(format('select * from pg_temp.unreferenced(%L)', jsonb_build_array(name)),
  format('un archivo nombrado en %s no es huérfano', columna))
  from candidatos order by name;

select set_eq(
  $$select * from pg_temp.unreferenced((select jsonb_agg(name) from candidatos)
      || '["deals/2/0.9999.pdf", "contacts/1/0.8888.tar.gz", "contacts/1/0.4009.más datos.pdf", "deals/2/sin-numero.pdf", "deals/2/0.400.pdf"]')$$,
  array['deals/2/0.9999.pdf', 'contacts/1/0.8888.tar.gz'],
  'de la lista completa solo salen los dos que nadie nombra: ni el de extensión codificada en la URL, ni el que no trae número (no se puede comprobar), ni el prefijo de un número referenciado');

-- La nota suelta su archivo: recién entonces es huérfano.
update public.contact_notes set attachments = '{}' where text = 'Nota de prueba 40';
select set_eq(
  $$select * from pg_temp.unreferenced('["contacts/1/0.4001.pdf", "deals/2/0.4002.png"]')$$,
  array['contacts/1/0.4001.pdf'],
  'cuando la nota suelta el archivo pasa a huérfano; el de la otra nota sigue referenciado');

-- El mismo archivo en una nota y en otra columna: soltar la nota no lo libera.
update public.deal_notes set attachments = '{}' where text = 'Nota de prueba 40';
update public.wa_messages set attachment_path = 'deals/2/0.4002.png' where wa_message_id = 'DEMO-WA-0004';
select is_empty($$select * from pg_temp.unreferenced('["deals/2/0.4002.png"]')$$,
  'un archivo que la nota soltó pero un mensaje de WhatsApp todavía nombra no es huérfano');

select * from finish();
rollback;
