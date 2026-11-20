-- Leaving a test and coming back are recorded for the teacher (2026-11-20). Resuming stays, so a
-- crashed browser doesn't lose the test; the teacher sees that it happened and decides (D7).
alter table public.proctor_events drop constraint proctor_events_kind_check;
alter table public.proctor_events add constraint proctor_events_kind_check check (kind in (
  'face_missing', 'multiple_faces', 'looking_away', 'object_phone', 'object_book', 'speech',
  'identity_mismatch', 'identity_passed', 'tab_hidden', 'window_blur', 'fullscreen_exit',
  'screen_share_stopped', 'second_display', 'camera_lost', 'copy_paste', 'context_menu',
  'shortcut', 'phone_gone', 'phone_hidden', 'phone_moved', 'phone_person', 'phone_object',
  'phone_camera_lost', 'phone_replaced', 'phone_setup_unconfirmed',
  'left_test', 'resumed_test'
));
