/**
 * Head turn (yaw, left/right) and tilt (pitch, up/down) in degrees, from MediaPipe's facial
 * transformation matrix (4×4, column-major). Zero is facing the camera; the rules compare the
 * absolute value against the preset's limit.
 */
export function headPose(matrix: number[]): { yaw: number; pitch: number } {
  const r20 = matrix[2]!;
  const r21 = matrix[6]!;
  const r22 = matrix[10]!;
  const deg = 180 / Math.PI;
  return {
    yaw: Math.atan2(-r20, Math.hypot(r21, r22)) * deg,
    pitch: Math.atan2(r21, r22) * deg,
  };
}
