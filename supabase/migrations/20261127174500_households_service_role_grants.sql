-- Correction to 20261010100204_households_grants.
-- That file stays byte-identical to the migration applied on 10.10. (md5 checked),
-- so the fix lives here: the household tables were created without any
-- service_role privilege. service_role bypasses RLS but still needs table grants,
-- e.g. for a later notify-household function or account clean-up jobs.
-- Client roles are unchanged: anon has nothing, authenticated keeps the grants
-- from 20261010100034/20261010100204, household_invites stays RPC-only.

grant select, insert, update, delete
  on public.households,
     public.household_members,
     public.household_invites,
     public.shared_lists,
     public.shared_list_items
  to service_role;
