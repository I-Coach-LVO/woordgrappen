grant insert on table public.woordgrappen to authenticated;

drop policy if exists "Aangewezen beheerders voegen woordgrappen toe"
on public.woordgrappen;

create policy "Aangewezen beheerders voegen woordgrappen toe"
on public.woordgrappen
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.profielen
    where profielen.id = (select auth.uid())
      and profielen.mag_moppen_verwijderen
  )
);
