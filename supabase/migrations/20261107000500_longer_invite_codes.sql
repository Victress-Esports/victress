-- Longer team invite codes (additive). NOT APPLIED to production. Proposal: docs/proposals/team-invite-rate-limiting.md, option 1.
--
-- Until now an invite code was the first 12 hex characters of a random UUID: 48 bits. New codes are 26 characters of
-- lower case base 32 (a-z and 2-7, URL safe, no padding): 130 bits taken from 144 random bits (three UUID prefixes,
-- each 12 hex characters = 48 fully random bits; gen_random_uuid() is backed by the server's strong random source).
-- Lower case matters: team_invite_info and join_team lower case their input, so they work unchanged, and the join page
-- already accepts 6 to 32 letters and digits.
--
-- Existing codes are NOT changed. A team that already exists keeps its 12 character code until its owner regenerates it
-- (production has 0 teams at the time of writing). If teams exist when this runs, decide separately whether to regenerate
-- their codes, because that invalidates links already shared.

create function public.new_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijklmnopqrstuvwxyz234567';
  b bytea := decode(
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12) ||
    substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), 'hex');  -- 18 bytes = 144 random bits
  bits text := '';
  code text := '';
  i int;
begin
  for i in 0..17 loop
    bits := bits || (get_byte(b, i))::bit(8)::text;
  end loop;
  for i in 0..25 loop  -- 26 groups of 5 bits = 130 bits
    code := code || substr(alphabet, 1 + (substr(bits, i * 5 + 1, 5))::bit(5)::int, 1);
  end loop;
  return code;
end;
$$;
-- Used only as a column default and inside regenerate_invite_code (owner). Nobody else needs to call it.
revoke execute on function public.new_invite_code() from public, anon, authenticated;

alter table public.teams alter column invite_code set default public.new_invite_code();

-- Same function as before, with the new generator. Everything else is unchanged.
create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := public.new_invite_code();
begin
  update public.teams set invite_code = code where owner_id = auth.uid();
  if not found then return null; end if;
  return code;
end;
$$;

-- Guard against a weak code being written later. Added only if every existing code already satisfies it; otherwise skipped
-- with a notice (legacy 12 character codes would make the constraint fail on any update of those rows).
do $$
begin
  if not exists (select 1 from public.teams where char_length(invite_code) < 26 or invite_code !~ '^[a-z2-7]+$') then
    alter table public.teams add constraint teams_invite_code_strength
      check (char_length(invite_code) >= 26 and invite_code ~ '^[a-z2-7]+$');
  else
    raise notice 'teams_invite_code_strength not added: legacy invite codes exist';
  end if;
end $$;
