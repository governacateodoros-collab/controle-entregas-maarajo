-- Execute este arquivo no SQL Editor do projeto Supabase uma única vez.
create table if not exists public.marajo_app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.marajo_app_state enable row level security;

create policy "Usuarios autenticados leem dados da operacao"
on public.marajo_app_state for select to authenticated using (true);

create policy "Usuarios autenticados gravam dados da operacao"
on public.marajo_app_state for insert to authenticated with check (true);

create policy "Usuarios autenticados atualizam dados da operacao"
on public.marajo_app_state for update to authenticated using (true) with check (true);

create policy "Usuarios autenticados removem dados da operacao"
on public.marajo_app_state for delete to authenticated using (true);
