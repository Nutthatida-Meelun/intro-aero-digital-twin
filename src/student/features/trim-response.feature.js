import {
  calculateCm,
  calculateTrimAngleDeg,
  calculateDeltaCm,
  classifyDisturbance,
  isTrimmed,
} from "../physics/trim-response.js";

const PLOT_MIN_DEG = -10;
const PLOT_MAX_DEG = 10;
const PLOT_STEP_DEG = 1;

function getCapabilities(capabilityContext) {
  return capabilityContext?.capabilities ?? capabilityContext ?? {};
}

function hasRequiredCapability(capabilityContext, requiredId, minimumVersion) {
  const capabilities = getCapabilities(capabilityContext);

  if (Array.isArray(capabilities)) {
    return capabilities.some(
      (capability) =>
        capability?.id === requiredId &&
        Number(capability?.version) >= minimumVersion
    );
  }

  const capability = capabilities?.[requiredId];

  if (typeof capability === "number") {
    return capability >= minimumVersion;
  }

  if (capability && typeof capability === "object") {
    return Number(capability.version) >= minimumVersion;
  }

  return false;
}

function requireAircraftNumber(aircraft, key) {
  const value = aircraft?.[key];

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be a finite number`);
  }

  return value;
}

function calculateAnalysis(aircraft) {
  const cm0 = requireAircraftNumber(aircraft, "cm0");
  const cmAlphaPerRad = requireAircraftNumber(
    aircraft,
    "cmAlphaPerRad"
  );
  const angleOfAttackDeg = requireAircraftNumber(
    aircraft,
    "angleOfAttackDeg"
  );
  const disturbanceAlphaDeg = requireAircraftNumber(
    aircraft,
    "disturbanceAlphaDeg"
  );

  const cm = calculateCm(
    cm0,
    cmAlphaPerRad,
    angleOfAttackDeg
  );

  const trimAngleDeg = calculateTrimAngleDeg(
    cm0,
    cmAlphaPerRad
  );

  const deltaCm = calculateDeltaCm(
    cmAlphaPerRad,
    disturbanceAlphaDeg
  );

  const trimmed = isTrimmed(cm);
  const tendency = classifyDisturbance(
    disturbanceAlphaDeg,
    deltaCm
  );

  return {
    cm,
    trimAngleDeg,
    deltaCm,
    trimmed,
    tendency,
  };
}

function createPlot(aircraft) {
  const cm0 = requireAircraftNumber(aircraft, "cm0");
  const cmAlphaPerRad = requireAircraftNumber(
    aircraft,
    "cmAlphaPerRad"
  );
  const selectedAngle = requireAircraftNumber(
    aircraft,
    "angleOfAttackDeg"
  );

  const angles = new Set();

  for (
    let angle = PLOT_MIN_DEG;
    angle <= PLOT_MAX_DEG;
    angle += PLOT_STEP_DEG
  ) {
    angles.add(angle);
  }

  angles.add(selectedAngle);

  const points = [...angles]
    .sort((a, b) => a - b)
    .map((angleOfAttackDeg) => ({
      x: angleOfAttackDeg,
      y: calculateCm(
        cm0,
        cmAlphaPerRad,
        angleOfAttackDeg
      ),
    }));

  return {
    id: "cm-alpha",
    title: "Cm–alpha relationship",
    xAxis: {
      label: "Angle of attack",
      unit: "deg",
    },
    yAxis: {
      label: "Pitching-moment coefficient",
      unit: "",
    },
    series: [
      {
        id: "cm-alpha",
        label: "Cm(alpha)",
        points,
      },
    ],
    regions: [],
    referenceLines: [
      {
        id: "trim-line",
        label: "Cm = 0",
        axis: "y",
        value: 0,
      },
    ],
  };
}

function createVerificationCases() {
  const numericalCm0 = 0.05;
  const numericalCmAlpha = -0.86;
  const numericalDisturbanceDeg = 2.0;

  const numericalDeltaCm = calculateDeltaCm(
    numericalCmAlpha,
    numericalDisturbanceDeg
  );

  const numericalTrimDeg = calculateTrimAngleDeg(
    numericalCm0,
    numericalCmAlpha
  );

  const behavioralCm0 = 0.05;
  const originalCmAlpha = -0.86;
  const doubledCmAlpha = -1.72;

  const originalTrimDeg = calculateTrimAngleDeg(
    behavioralCm0,
    originalCmAlpha
  );

  const doubledTrimDeg = calculateTrimAngleDeg(
    behavioralCm0,
    doubledCmAlpha
  );

  const zeroSlopeTrim = calculateTrimAngleDeg(0.05, 0);

  return [
    {
      id: "numerical",
      title: "Numerical case",
      inputs: {
        cm0: numericalCm0,
        cmAlphaPerRad: numericalCmAlpha,
        disturbanceAlphaDeg: numericalDisturbanceDeg,
      },
      expected: {
        deltaAlphaRad: 0.0349066,
        alphaTrimRad: 0.0581395,
        alphaTrimDeg: 3.3311,
        deltaCm: -0.030020,
      },
      passed:
        Number.isFinite(numericalDeltaCm) &&
        Number.isFinite(numericalTrimDeg) &&
        Math.abs(numericalDeltaCm - (-0.030020)) <= 1e-5 &&
        Math.abs(numericalTrimDeg - 3.3311) <= 1e-4,
    },
    {
      id: "behavioral",
      title: "Behavioral case",
      inputs: {
        cm0: behavioralCm0,
        cmAlphaPerRad: doubledCmAlpha,
      },
      expected: {
        originalTrimAngleDeg: 3.3311,
        doubledTrimAngleDeg: 1.6656,
        trend: "trim-angle magnitude decreases",
      },
      passed:
        Math.abs(originalTrimDeg - 3.3311) <= 1e-4 &&
        Math.abs(doubledTrimDeg - 1.6656) <= 1e-4 &&
        Math.abs(doubledTrimDeg) < Math.abs(originalTrimDeg),
    },
    {
      id: "zero-slope",
      title: "Zero-slope boundary case",
      inputs: {
        cm0: 0.05,
        cmAlphaPerRad: 0,
      },
      expected: {
        trimAngle: "not available",
      },
      passed: zeroSlopeTrim === null,
    },
  ];
}

export const feature = {
  contractVersion: 4,
  id: "trim-response",
  title: "Live Cm–alpha relationship and trim",
  description:
    "Evaluates the linear pitching-moment relationship, trim angle, and small-disturbance tendency.",
  category: "Stability · Student feature",
  learningMode: "concept",
  topicId: "stability",
  inputKeys: [
    "cm0",
    "cmAlphaPerRad",
    "angleOfAttackDeg",
    "disturbanceAlphaDeg",
  ],
  requiresCapabilities: [
    {
      id: "loads.pitch.component-sum",
      version: 1,
    },
  ],
  providesCapabilities: [
    {
      id: "stability.pitch.cm-alpha",
      version: 1,
    },
  ],
  assumptions: [
    "The Cm–alpha relationship is linear over the investigated range.",
    "The model is quasi-static and represents a small disturbance about the selected condition.",
    "Cm0 and Cm_alpha represent the same aircraft configuration and flight condition.",
    "Positive pitching moment and positive angle of attack are nose-up.",
  ],
  validityLimits: [
    "Do not use this linear relationship at stall, at large angle of attack, or where aerodynamic coefficients are strongly nonlinear.",
    "This model does not calculate a time history, damping, control motion, or handling quality.",
    "A restoring tendency in this model is not proof of acceptable safety, controllability, or flightworthiness.",
    "The calculated trim angle is meaningful only when the linear model remains valid at that angle.",
  ],
  simulation: {
    display: "analysis-only",
    durationS: 1,
    initialState: {},
    controls: {},
    disturbance: {},
  },

  analyze(aircraft, capabilityContext) {
    const hasCapability = hasRequiredCapability(
      capabilityContext,
      "loads.pitch.component-sum",
      1
    );

    if (!hasCapability) {
      return {
        results: [],
        verificationCases: [],
        decision: {
          question:
            "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
          interpretation:
            "The required longitudinal moment-contribution capability is not available, so the Stage 4 analysis remains locked.",
          status: "caution",
        },
        plots: [],
        scene: null,
      };
    }

    const analysis = calculateAnalysis(aircraft);

    const results = [
      {
        id: "cm-alpha",
        label: "Pitching-moment coefficient at selected angle",
        value: analysis.cm,
        unit: "",
        precision: 7,
        emphasis: true,
      },
      {
        id: "trim-angle",
        label: "Trim angle",
        value:
          analysis.trimAngleDeg === null
            ? "not available"
            : analysis.trimAngleDeg,
        unit: analysis.trimAngleDeg === null ? "" : "deg",
        precision: 4,
      },
      {
        id: "delta-cm",
        label: "Disturbance moment-coefficient change",
        value: analysis.deltaCm,
        unit: "",
        precision: 7,
      },
      {
        id: "trim-status",
        label: "Selected condition trimmed",
        value: analysis.trimmed ? "trimmed" : "not trimmed",
        unit: "",
        precision: 0,
      },
      {
        id: "disturbance-tendency",
        label: "Disturbance tendency",
        value: analysis.tendency,
        unit: "",
        precision: 0,
      },
    ];

    let interpretation;

    if (analysis.trimmed) {
      interpretation =
        `The selected condition is trimmed within the specified ` +
        `Cm tolerance. The disturbance produces a ${analysis.tendency} tendency ` +
        `under this linear, quasi-static model.`;
    } else {
      interpretation =
        `The selected condition is not trimmed within the specified ` +
        `Cm tolerance. The disturbance produces a ${analysis.tendency} tendency ` +
        `under this linear, quasi-static model.`;
    }

    return {
      results,
      verificationCases: createVerificationCases(),
      decision: {
        question:
          "At the selected angle of attack, is the simplified pitching-moment model trimmed, and does a small angle-of-attack disturbance create a restoring moment tendency?",
        interpretation,
        status: analysis.tendency === "restoring" ? "pass" : "neutral",
      },
      plots: [createPlot(aircraft)],
      scene: null,
    };
  },
};

export const model = {
  kind: "derived",

  evaluate(runtimeContext) {
    const aircraft = runtimeContext?.aircraft ?? {};
    const cm0 = requireAircraftNumber(aircraft, "cm0");
    const cmAlphaPerRad = requireAircraftNumber(
      aircraft,
      "cmAlphaPerRad"
    );
    const angleOfAttackDeg = requireAircraftNumber(
      aircraft,
      "angleOfAttackDeg"
    );
    const disturbanceAlphaDeg = requireAircraftNumber(
      aircraft,
      "disturbanceAlphaDeg"
    );

    const cm = calculateCm(
      cm0,
      cmAlphaPerRad,
      angleOfAttackDeg
    );

    const trimAngleDeg = calculateTrimAngleDeg(
      cm0,
      cmAlphaPerRad
    );

    const deltaCm = calculateDeltaCm(
      cmAlphaPerRad,
      disturbanceAlphaDeg
    );

    return {
      values: {
        cm,
        trimAngleDeg:
          trimAngleDeg === null ? "not available" : trimAngleDeg,
        deltaCm,
        trimmed: isTrimmed(cm),
        tendency: classifyDisturbance(
          disturbanceAlphaDeg,
          deltaCm
        ),
      },
    };
  },
};