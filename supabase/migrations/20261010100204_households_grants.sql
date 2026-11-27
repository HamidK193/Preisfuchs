grant select on public.households to authenticated;
grant update (name, emoji) on public.households to authenticated;
grant select on public.household_members to authenticated;
grant update (display_name) on public.household_members to authenticated;
grant select, insert, update, delete on public.shared_lists to authenticated;
grant select, insert, update, delete on public.shared_list_items to authenticated;