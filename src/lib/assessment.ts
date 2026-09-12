/**
 * Illustrative planning model. These allowances and aircraft configurations are
 * demo assumptions, not verified airport performance, layouts, or aircraft data.
 * A comfortable time assessment never establishes aircraft suitability.
 */
export interface Profile {
  wheelchair: boolean;
  personalChair: boolean;
  stepFree: boolean;
  restroom: boolean;
  serviceAnimal: boolean;
  lowVision: boolean;
  walkingPace: "standard" | "relaxed" | "slow";
}

export interface Itinerary {
  id: string;
  origin: string;
  connection: string;
  destination: string;
  date: string;
  layoverMinutes: number;
  terminalChange: boolean;
  internationalArrival: boolean;
  aircraft: "A321" | "B777" | "CRJ900";
  arrivalTime: string;
  departureTime: string;
}

export interface AssessmentWarning {
  id: string;
  title: string;
  description: string;
  severity: "warning" | "info";
}

export interface ConnectionStage {
  id: string;
  label: string;
  min: number;
  max: number;
  description: string;
}

export interface ConnectionAssessment {
  minMinutes: number;
  maxMinutes: number;
  recommendedMinutes: number;
  status: "comfortable" | "tight" | "high-risk";
  label: string;
  stages: ConnectionStage[];
  warnings: AssessmentWarning[];
}

export const DEFAULT_PROFILE: Profile = {
  wheelchair: true,
  personalChair: false,
  stepFree: true,
  restroom: true,
  serviceAnimal: false,
  lowVision: false,
  walkingPace: "relaxed",
};

export const DEFAULT_ITINERARY: Itinerary = {
  id: "demo-pit-ord-lax",
  origin: "PIT",
  connection: "ORD",
  destination: "LAX",
  date: "2026-09-25",
  layoverMinutes: 58,
  terminalChange: true,
  internationalArrival: false,
  aircraft: "A321",
  arrivalTime: "10:00",
  departureTime: "10:58",
};

export const AIRPORTS = [
  { code: "PIT", name: "Pittsburgh International Airport", city: "Pittsburgh" },
  { code: "ORD", name: "O’Hare International Airport", city: "Chicago" },
  {
    code: "LAX",
    name: "Los Angeles International Airport",
    city: "Los Angeles",
  },
  {
    code: "ATL",
    name: "Hartsfield–Jackson Atlanta International Airport",
    city: "Atlanta",
  },
  {
    code: "DFW",
    name: "Dallas Fort Worth International Airport",
    city: "Dallas / Fort Worth",
  },
  {
    code: "JFK",
    name: "John F. Kennedy International Airport",
    city: "New York",
  },
  { code: "DEN", name: "Denver International Airport", city: "Denver" },
  {
    code: "SFO",
    name: "San Francisco International Airport",
    city: "San Francisco",
  },
];

interface AircraftConfiguration {
  name: string;
  lavatory: "available" | "unverified" | "limited";
  onboardChair: "available" | "unverified";
  stepFreeBoarding: "unverified";
  chairStorage: "standard" | "restricted" | "unverified";
}

/** Scenario values only: the aircraft model does not establish actual access. */
export const AIRCRAFT: Record<Itinerary["aircraft"], AircraftConfiguration> = {
  A321: {
    name: "Airbus A321",
    lavatory: "unverified",
    onboardChair: "unverified",
    stepFreeBoarding: "unverified",
    chairStorage: "unverified",
  },
  B777: {
    name: "Boeing 777",
    lavatory: "available",
    onboardChair: "available",
    stepFreeBoarding: "unverified",
    chairStorage: "standard",
  },
  CRJ900: {
    name: "Bombardier CRJ-900",
    lavatory: "limited",
    onboardChair: "unverified",
    stepFreeBoarding: "unverified",
    chairStorage: "restricted",
  },
};

function validateMinutes(minutes: number): void {
  if (
    !Number.isFinite(minutes) ||
    minutes < 0 ||
    minutes > Number.MAX_SAFE_INTEGER
  ) {
    throw new RangeError("Minutes must be a finite, non-negative safe number.");
  }
}

function validateProfile(profile: Profile): void {
  const needs: (keyof Omit<Profile, "walkingPace">)[] = [
    "wheelchair",
    "personalChair",
    "stepFree",
    "restroom",
    "serviceAnimal",
    "lowVision",
  ];
  if (
    !profile ||
    needs.some((need) => typeof profile[need] !== "boolean") ||
    !["standard", "relaxed", "slow"].includes(profile.walkingPace)
  ) {
    throw new RangeError(
      "Provide a complete accessibility profile and a valid walking pace.",
    );
  }
}

function aircraftConfiguration(
  code: Itinerary["aircraft"],
): AircraftConfiguration {
  if (!Object.prototype.hasOwnProperty.call(AIRCRAFT, code)) {
    throw new RangeError("Choose a supported demo aircraft.");
  }
  return AIRCRAFT[code];
}

function aircraftWarnings(
  aircraft: Itinerary["aircraft"],
  profile: Profile,
): AssessmentWarning[] {
  const config = aircraftConfiguration(aircraft);
  const warnings: AssessmentWarning[] = [];
  if (profile.restroom) {
    warnings.push({
      id: "lavatory",
      title:
        config.lavatory === "limited"
          ? "Lavatory access may be limited"
          : "Confirm accessible lavatory access",
      description:
        config.lavatory === "available"
          ? "This demo shows an accessible lavatory. Verify the exact airline cabin layout and whether it meets your transfer needs."
          : config.lavatory === "limited"
            ? "This demo configuration has limited lavatory access. Confirm the actual layout and whether you can use it before booking."
            : "Lavatory access is unverified in this demo. The aircraft model alone does not establish whether the restroom meets your needs.",
      severity: config.lavatory === "available" ? "info" : "warning",
    });
  }
  if (profile.wheelchair || profile.personalChair) {
    warnings.push({
      id: "onboard-chair",
      title: "Confirm onboard transfer arrangements",
      description:
        config.onboardChair === "available"
          ? "An onboard wheelchair is shown in this demo. Verify availability, transfer assistance, and how it works with your seating and lavatory needs."
          : "Onboard wheelchair availability is unverified. Confirm the actual equipment and the assistance you need for transfers.",
      severity: config.onboardChair === "available" ? "info" : "warning",
    });
  }
  if (profile.personalChair) {
    warnings.push({
      id: "chair-storage",
      title:
        config.chairStorage === "restricted"
          ? "Your wheelchair may need a new fit check"
          : "Confirm your personal wheelchair fits",
      description:
        config.chairStorage === "restricted"
          ? "This demo marks storage as restricted. Actual fit is unknown: the airline needs your device dimensions, weight, battery details, and permitted handling position."
          : "Storage in this demo does not confirm fit. Verify cargo-door dimensions, usable hold space, device weight, battery details, and handling position with the airline.",
      severity: "warning",
    });
  }
  if (profile.stepFree) {
    warnings.push({
      id: "step-free-boarding",
      title: "Step-free boarding needs confirmation",
      description:
        "Boarding equipment is unverified in this demo. Confirm a jet bridge, lift, or another suitable step-free boarding arrangement at each airport.",
      severity: "warning",
    });
  }
  return warnings;
}

export function assessConnection(
  itinerary: Itinerary,
  profile: Profile,
): ConnectionAssessment {
  validateMinutes(itinerary.layoverMinutes);
  validateProfile(profile);
  aircraftConfiguration(itinerary.aircraft);
  if (
    typeof itinerary.terminalChange !== "boolean" ||
    typeof itinerary.internationalArrival !== "boolean"
  ) {
    throw new RangeError(
      "Provide terminal-change and international-arrival assumptions.",
    );
  }

  const stages: ConnectionStage[] = [];
  const add = (
    id: string,
    label: string,
    min: number,
    max: number,
    description: string,
  ) => {
    stages.push({ id, label, min, max, description });
  };
  const chairTransfer = profile.wheelchair || profile.personalChair;
  add(
    "deplaning",
    "Leaving the aircraft",
    chairTransfer ? 8 : 5,
    chairTransfer ? 12 : 8,
    "Example allowance for leaving your seat and reaching the aircraft door.",
  );
  if (profile.wheelchair || profile.lowVision) {
    add(
      "assistance",
      "Assistance handoff",
      10,
      18,
      "Illustrative waiting and handoff allowance; actual assistance timing is not measured.",
    );
  }
  if (profile.personalChair) {
    add(
      "chair-retrieval",
      "Your wheelchair",
      10,
      20,
      "Example allowance for returning your personal wheelchair at the aircraft; actual return arrangements vary.",
    );
  }
  const pace = { standard: [0, 0], relaxed: [3, 3], slow: [7, 10] }[
    profile.walkingPace
  ];
  const stepFree = profile.stepFree ? 2 : 0;
  add(
    "transfer",
    "Between gates",
    8 + pace[0] + stepFree + (itinerary.terminalChange ? 8 : 0),
    12 + pace[1] + stepFree + (itinerary.terminalChange ? 9 : 0),
    "Example gate-transfer allowance adjusted for your pace, step-free needs, and selected terminal-change assumption.",
  );
  if (profile.restroom) {
    add(
      "restroom",
      "Restroom stop",
      7,
      8,
      "Example time for an accessible restroom stop; gate distances and restroom availability are unverified.",
    );
  }
  if (profile.serviceAnimal) {
    add(
      "animal-relief",
      "Animal relief stop",
      8,
      12,
      "Example stop allowance; confirm the relief area location and whether re-screening is required.",
    );
  }
  if (itinerary.internationalArrival) {
    add(
      "international",
      "Arrival processing",
      35,
      65,
      "Illustrative allowance for immigration, customs, and any required security re-screening; actual queues and routing vary.",
    );
  }
  add(
    "boarding",
    "Boarding cutoff",
    25,
    30,
    "Example allowance to reach the gate before boarding closes. Verify the operating airline’s actual cutoff.",
  );

  const minMinutes = stages.reduce((total, stage) => total + stage.min, 0);
  const maxMinutes = stages.reduce((total, stage) => total + stage.max, 0);
  const recommendedMinutes = Math.ceil(maxMinutes / 5) * 5 + 10;
  const status =
    itinerary.layoverMinutes < minMinutes
      ? "high-risk"
      : itinerary.layoverMinutes < recommendedMinutes
        ? "tight"
        : "comfortable";
  const warnings = aircraftWarnings(itinerary.aircraft, profile);
  warnings.unshift({
    id: "illustrative-estimate",
    title: "Illustrative estimate, not live performance data",
    description:
      "These planning assumptions are not verified airport wait times or layouts. Extra time does not guarantee a connection or establish aircraft accessibility.",
    severity: "info",
  });
  return {
    minMinutes,
    maxMinutes,
    recommendedMinutes,
    status,
    label:
      status === "high-risk"
        ? "More time recommended"
        : status === "tight"
          ? "Limited planning buffer"
          : "Includes a planning buffer",
    stages,
    warnings,
  };
}

export function assessAircraftChange(
  previous: Itinerary["aircraft"],
  next: Itinerary["aircraft"],
  profile: Profile,
): AssessmentWarning[] {
  aircraftConfiguration(previous);
  aircraftConfiguration(next);
  validateProfile(profile);
  if (previous === next) return [];
  const warnings = aircraftWarnings(next, profile);
  if (profile.serviceAnimal) {
    warnings.push({
      id: "animal-space",
      title: "Recheck service-animal space",
      description:
        "Cabin and seat space may change in this simulation. Confirm an appropriate seating arrangement with the operating airline.",
      severity: "info",
    });
  }
  if (profile.lowVision) {
    warnings.push({
      id: "guided-assistance",
      title: "Reconfirm your guided-assistance arrangements",
      description:
        "This simulated aircraft change may mean a different cabin layout or boarding process. Confirm the assistance you requested still covers your journey.",
      severity: "info",
    });
  }
  warnings.unshift({
    id: "aircraft-change",
    title: "Aircraft changed in this example",
    description: `${AIRCRAFT[previous].name} to ${AIRCRAFT[next].name}. This is a simulation, not an airline notification. Exact configuration and equipment remain unverified.`,
    severity: "info",
  });
  return warnings;
}

export function formatMinutes(minutes: number): string {
  validateMinutes(minutes);
  const rounded = Math.ceil(minutes);
  const hours = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return hours === 0
    ? `${remainder}m`
    : remainder === 0
      ? `${hours}h`
      : `${hours}h ${remainder}m`;
}
