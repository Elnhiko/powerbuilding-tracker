-- ═══════════════════════════════════════════════════════════════
-- Powerbuilding Tracker — schéma Supabase
-- À exécuter une seule fois : Supabase → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════

-- Une ligne par utilisateur, contenant tout l'état de l'app (cycles, charges, exercices faits).
create table if not exists public.app_state (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- Sécurité : chaque utilisateur ne peut lire et modifier QUE ses propres données.
alter table public.app_state enable row level security;

drop policy if exists "lecture de ses donnees"      on public.app_state;
drop policy if exists "creation de ses donnees"     on public.app_state;
drop policy if exists "modification de ses donnees" on public.app_state;
drop policy if exists "suppression de ses donnees"  on public.app_state;

create policy "lecture de ses donnees"      on public.app_state for select using (auth.uid() = user_id);
create policy "creation de ses donnees"     on public.app_state for insert with check (auth.uid() = user_id);
create policy "modification de ses donnees" on public.app_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppression de ses donnees"  on public.app_state for delete using (auth.uid() = user_id);

-- Vue pratique pour consulter / analyser ses charges en SQL (une ligne par exercice saisi).
-- Clé d'origine "semaine-jour-exercice" (index à partir de 0).
create or replace view public.charges
with (security_invoker = true) as
select
  s.user_id,
  c.ord::int                                          as cycle,
  split_part(w.key, '-', 1)::int + 1                  as semaine,
  split_part(w.key, '-', 2)::int + 1                  as jour,
  split_part(w.key, '-', 3)::int + 1                  as exercice,
  replace(w.value, ',', '.')::numeric                 as charge_kg,
  coalesce((c.cycle -> 'done' ->> w.key)::boolean, false) as fait,
  to_timestamp((c.cycle ->> 'started')::bigint / 1000.0) as debut_cycle
from public.app_state s
cross join lateral jsonb_array_elements(s.state -> 'cycles') with ordinality as c(cycle, ord)
cross join lateral jsonb_each_text(c.cycle -> 'weights') as w(key, value)
where w.value ~ '^[0-9]+([.,][0-9]+)?$';
