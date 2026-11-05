-- Seguimiento con texto por canal (fase-3/ajustes, docs/10 2026-11-05): el
-- ejecutivo guarda plantilla, asunto y texto final de cada canal en messages.
begin;
select plan(4);

create function pg_temp.login_as(p_email text) returns void language plpgsql as $$
declare uid uuid;
begin
  select user_id into uid from public.sales where email = p_email;
  if uid is null then raise exception 'no existe el usuario %', p_email; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

create temp table f as
select min(d.id) as own_deal from public.deals d
  join public.sales s on s.id = d.sales_id
 where s.email = 'camila.rojas@tekfusion-demo.cl' and d.stage = 'cotizado';
grant select on f to authenticated;

select pg_temp.login_as('camila.rojas@tekfusion-demo.cl');

select lives_ok(format($q$insert into public.followups (deal_id, step, scheduled_at, channels, messages)
  values (%s, 9, now() + interval '1 day', '{correo,whatsapp}',
  '{"correo": {"template_id": null, "subject": "Cotización", "body": "Hola Ana"}, "whatsapp": {"template_id": null, "body": "Hola Ana 👋"}}')$q$,
  (select own_deal from f)),
  'el ejecutivo guarda un texto por canal');

select is((select messages -> 'whatsapp' ->> 'body' from public.followups where step = 9 and deal_id = (select own_deal from f)),
  'Hola Ana 👋', 'el texto de WhatsApp queda tal como lo dejó');

select throws_ok(format($q$insert into public.followups (deal_id, step, scheduled_at, channels, messages)
  values (%s, 10, now() + interval '1 day', '{correo}', '{"sms": {"body": "x"}}')$q$, (select own_deal from f)),
  '23514', null, 'messages solo admite los canales correo y whatsapp');

select throws_ok(format($q$insert into public.followups (deal_id, step, scheduled_at, channels, messages)
  values (%s, 11, now() + interval '1 day', '{correo}', '[]')$q$, (select own_deal from f)),
  '23514', null, 'messages es un objeto');

reset role;
select * from finish();
rollback;
