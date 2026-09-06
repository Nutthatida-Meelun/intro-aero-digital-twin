import { describe, expect, test } from "vitest";

import {
  degreesToRadians,
  calculateCm,
  calculateTrimAngleRad,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../../src/student/physics/trim-response.js";

const FLOAT_TOLERANCE = 1e-6;

describe("Stage 4 trim-response physics", () => {
  test("numerical verification case", () => {
    const cm0 = 0.05;
    const cmAlphaPerRad = -0.86;
    const disturbanceAlphaDeg = 2.0;

    const deltaAlphaRad = degreesToRadians(
      disturbanceAlphaDeg
    );

    const trimAngleRad = calculateTrimAngleRad(
      cm0,
      cmAlphaPerRad
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      cm0,
      cmAlphaPerRad
    );

    const deltaCm = calculateDeltaCm(
      cmAlphaPerRad,
      disturbanceAlphaDeg
    );

    expect(deltaAlphaRad).toBeCloseTo(
      0.0349066,
      6
    );

    expect(trimAngleRad).toBeCloseTo(
      0.0581395,
      6
    );

    expect(trimAngleDeg).toBeCloseTo(
  3.3311,
  4
    );

    expect(deltaCm).toBeCloseTo(
      -0.030020,
      5
    );
  });

  test("behavioral case: doubling slope magnitude decreases trim-angle magnitude", () => {
    const cm0 = 0.05;

    const originalTrimDeg = calculateTrimAngleDeg(
      cm0,
      -0.86
    );

    const doubledTrimDeg = calculateTrimAngleDeg(
      cm0,
      -1.72
    );

    expect(originalTrimDeg).toBeCloseTo(
      3.3311,
      4
    );

    expect(doubledTrimDeg).toBeCloseTo(1.6656, 4);

    expect(
      Math.abs(doubledTrimDeg)
    ).toBeLessThan(
      Math.abs(originalTrimDeg)
    );
  });

  test("boundary case: zero Cm slope makes trim angle unavailable", () => {
    const trimAngleRad = calculateTrimAngleRad(
      0.05,
      0
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      0.05,
      0
    );

    expect(trimAngleRad).toBeNull();
    expect(trimAngleDeg).toBeNull();
  });

  test("reference calculation selected condition is not trimmed", () => {
    const cm = calculateCm(
      0.04,
      -0.8,
      2.86
    );

    expect(cm).toBeCloseTo(
      0.0000668667,
      FLOAT_TOLERANCE
    );

    expect(isTrimmed(cm)).toBe(false);
  });

  test("reference calculation has restoring disturbance tendency", () => {
    const deltaCm = calculateDeltaCm(
      -0.8,
      2.0
    );

    expect(deltaCm).toBeCloseTo(
      -0.027925268,
      6
    );

    expect(
      classifyDisturbance(2.0, deltaCm)
    ).toBe("restoring");
  });

  test("positive slope with positive disturbance is destabilizing", () => {
    const deltaCm = calculateDeltaCm(
      0.8,
      2.0
    );

    expect(
      classifyDisturbance(2.0, deltaCm)
    ).toBe("destabilizing");
  });

  test("zero slope produces neutral disturbance response", () => {
    const deltaCm = calculateDeltaCm(
      0,
      2.0
    );

    expect(deltaCm).toBe(0);

    expect(
      classifyDisturbance(2.0, deltaCm)
    ).toBe("neutral");
  });
});