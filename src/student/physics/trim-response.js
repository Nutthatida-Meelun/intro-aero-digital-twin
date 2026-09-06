// Stage 4: Live Cm-alpha relationship and trim
// Inputs: angles are supplied in degrees; Cm0 is dimensionless;
// CmAlphaPerRad is 1/rad. Outputs use radians internally where applicable.
// Sign convention: positive angle of attack and positive pitching moment are nose-up.
// Assumptions: linear, quasi-static Cm-alpha relationship and small disturbance.

const TRIM_TOLERANCE = 1e-6;

function requireFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

export function degreesToRadians(degrees) {
  requireFiniteNumber(degrees, "degrees");
  return degrees * Math.PI / 180;
}

export function calculateCm(cm0, cmAlphaPerRad, angleOfAttackDeg) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const alphaRad = degreesToRadians(angleOfAttackDeg);

  return cm0 + cmAlphaPerRad * alphaRad;
}

export function calculateTrimAngleRad(cm0, cmAlphaPerRad) {
  requireFiniteNumber(cm0, "cm0");
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");

  if (cmAlphaPerRad === 0) {
    return null;
  }

  return -cm0 / cmAlphaPerRad;
}

export function calculateTrimAngleDeg(cm0, cmAlphaPerRad) {
  const trimAngleRad = calculateTrimAngleRad(cm0, cmAlphaPerRad);

  if (trimAngleRad === null) {
    return null;
  }

  return trimAngleRad * 180 / Math.PI;
}

export function calculateDeltaCm(cmAlphaPerRad, disturbanceAlphaDeg) {
  requireFiniteNumber(cmAlphaPerRad, "cmAlphaPerRad");
  const deltaAlphaRad = degreesToRadians(disturbanceAlphaDeg);

  return cmAlphaPerRad * deltaAlphaRad;
}

export function classifyDisturbance(deltaAlphaDeg, deltaCm) {
  const deltaAlphaRad = degreesToRadians(deltaAlphaDeg);
  requireFiniteNumber(deltaCm, "deltaCm");

  const product = deltaAlphaRad * deltaCm;

  if (product < 0) {
    return "restoring";
  }

  if (product > 0) {
    return "destabilizing";
  }

  return "neutral";
}

export function isTrimmed(cm) {
  requireFiniteNumber(cm, "cm");
  return Math.abs(cm) <= TRIM_TOLERANCE;
}