import { headPose } from "./pose";

/** A column-major 4×4 for a rotation about Y (yaw) then X (pitch). */
function matrix(yawDeg: number, pitchDeg: number): number[] {
  const y = (yawDeg * Math.PI) / 180;
  const p = (pitchDeg * Math.PI) / 180;
  // R = Ry * Rx, written as rows, then laid out by column.
  const rows = [
    [Math.cos(y), Math.sin(y) * Math.sin(p), Math.sin(y) * Math.cos(p)],
    [0, Math.cos(p), -Math.sin(p)],
    [-Math.sin(y), Math.cos(y) * Math.sin(p), Math.cos(y) * Math.cos(p)],
  ];
  const m = new Array(16).fill(0);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[c * 4 + r] = rows[r]![c]!;
  m[15] = 1;
  return m;
}

describe("headPose", () => {
  it("is zero facing the camera", () => {
    const { yaw, pitch } = headPose(matrix(0, 0));
    expect(yaw).toBeCloseTo(0);
    expect(pitch).toBeCloseTo(0);
  });

  it("reads a head turned 40 degrees", () => {
    expect(Math.abs(headPose(matrix(40, 0)).yaw)).toBeCloseTo(40);
  });

  it("reads a head tilted 30 degrees", () => {
    expect(Math.abs(headPose(matrix(0, 30)).pitch)).toBeCloseTo(30);
  });
});
