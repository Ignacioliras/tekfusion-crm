-- Private attachments (docs/08, Fase 2): the bucket stops being public, every
-- read is a signed URL of 60 minutes, and the storage policy only hands out the
-- files of the leads and contacts the user can see (can_read_attachment).
-- Written by hand: db diff ignores storage.buckets rows and would recreate the
-- four views without security_invoker (CLAUDE.md §4).

update storage.buckets set public = false where id = 'attachments';

CREATE OR REPLACE FUNCTION "public"."can_read_attachment"("object_name" text) RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  parts text[] := string_to_array(object_name, '/');
  owner_id bigint;
begin
  if not public.is_internal_user() then
    return false;
  end if;
  if coalesce(array_length(parts, 1), 0) < 2 then
    return public.is_manager();
  end if;
  if parts[1] in ('companies', 'sales', 'config') then
    return true;
  end if;
  if parts[1] in ('deals', 'contacts') and array_length(parts, 1) >= 3 and parts[2] ~ '^[0-9]+$' then
    owner_id := parts[2]::bigint;
    if parts[1] = 'deals' then
      return exists (select 1 from public.deals d where d.id = owner_id);
    end if;
    return exists (select 1 from public.contacts c where c.id = owner_id);
  end if;
  return public.is_manager();
end;
$$;

revoke execute on function public.can_read_attachment(text) from public, anon;
grant execute on function public.can_read_attachment(text) to authenticated, service_role;

drop policy if exists attachments_select on storage.objects;
drop policy if exists attachments_insert on storage.objects;
create policy attachments_select on storage.objects for select to authenticated
    using (bucket_id = 'attachments' and (select public.is_internal_user()) and public.can_read_attachment(name));
-- Uploads go under a known folder; managers and executives only (docs/08).
create policy attachments_insert on storage.objects for insert to authenticated
    with check (bucket_id = 'attachments' and (select public.current_user_role()) in ('manager', 'executive')
        and (storage.foldername(name))[1] in ('deals', 'contacts', 'companies', 'sales', 'config'));
