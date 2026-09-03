alter table public.profielen
add column if not exists mag_moppen_toevoegen boolean not null default false;

update public.profielen
set mag_moppen_toevoegen = true
where id in (
  select id
  from auth.users
  where lower(email) in (
    'fons@accounts.woordgrappen.invalid',
    'f0ns@accounts.woordgrappen.invalid'
  )
);

drop policy if exists "Aangewezen beheerders voegen woordgrappen toe"
on public.woordgrappen;

create policy "Aangewezen gebruikers voegen woordgrappen toe"
on public.woordgrappen
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and exists (
    select 1
    from public.profielen
    where profielen.id = (select auth.uid())
      and profielen.mag_moppen_toevoegen
  )
);
