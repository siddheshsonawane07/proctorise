-- Phase 9.6: a test may turn spoken warnings off. The key is optional so every saved test stays
-- valid; a test without it speaks (the default). The app mirrors this in builder/proctoring.ts.
create or replace function public.valid_proctoring(p jsonb) returns boolean
language sql immutable set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select array_agg(k order by k) from jsonb_object_keys(p - 'spoken_warnings') k) = array[
      'auto_submit_phone_gone_min', 'auto_submit_screen_share_s', 'identity_check',
      'phone_required', 'preset', 'screen_share_required', 'snapshot_interval_s'
    ]
    and (not p ? 'spoken_warnings' or jsonb_typeof(p -> 'spoken_warnings') = 'boolean')
    and p ->> 'preset' in ('light', 'standard', 'strict')
    and jsonb_typeof(p -> 'identity_check') = 'boolean'
    and jsonb_typeof(p -> 'phone_required') = 'boolean'
    and jsonb_typeof(p -> 'screen_share_required') = 'boolean'
    and jsonb_typeof(p -> 'snapshot_interval_s') = 'number'
    and (p ->> 'snapshot_interval_s')::numeric between 30 and 300
    and (jsonb_typeof(p -> 'auto_submit_screen_share_s') = 'null'
         or (jsonb_typeof(p -> 'auto_submit_screen_share_s') = 'number'
             and (p ->> 'auto_submit_screen_share_s')::numeric between 10 and 600))
    and (jsonb_typeof(p -> 'auto_submit_phone_gone_min') = 'null'
         or (jsonb_typeof(p -> 'auto_submit_phone_gone_min') = 'number'
             and (p ->> 'auto_submit_phone_gone_min')::numeric between 1 and 30));
$$;

alter table public.tests alter column proctoring set default '{
  "preset": "standard", "identity_check": true, "phone_required": false,
  "screen_share_required": false, "snapshot_interval_s": 60,
  "auto_submit_screen_share_s": null, "auto_submit_phone_gone_min": null,
  "spoken_warnings": true
}'::jsonb;
