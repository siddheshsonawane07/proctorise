import type { EventKind } from "./rules/engine";

/** What the student is told when an event opens: what was seen, and what to do (Critic.md #6). */
export const STUDENT_MESSAGE: Partial<Record<EventKind, string>> = {
  face_missing: "We can't see your face. Sit in front of the camera, in good light.",
  multiple_faces: "Someone else is in view. You need to be alone for the test.",
  looking_away: "Please keep your eyes on the test.",
  object_phone: "A phone is in view. Put it away from your desk.",
  object_book: "A book or notes are in view. Put them away.",
  speech: "Please don't talk during the test.",
  tab_hidden: "You left the test page. That was recorded for your teacher.",
  window_blur: "You switched to another window. That was recorded for your teacher.",
  camera_lost: "Your camera stopped. Check it's connected and not used by another app.",
  second_display: "A second screen is connected. Disconnect it to continue.",
  identity_mismatch: "We couldn't match your face to your photo. Your teacher will check.",
};
