import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ITINERARY,
  DEFAULT_PROFILE,
  assessAircraftChange,
  assessConnection,
  formatMinutes,
} from "./assessment";
import type { Profile } from "./assessment";

const independent: Profile = {
  wheelchair: false,
  personalChair: false,
  stepFree: false,
  restroom: false,
  serviceAnimal: false,
  lowVision: false,
  walkingPace: "standard",
};

test("the illustrative short connection is high risk and exposes assumptions", () => {
  const result = assessConnection(DEFAULT_ITINERARY, DEFAULT_PROFILE);
  assert.equal(result.status, "high-risk");
  assert.deepEqual(
    [result.minMinutes, result.maxMinutes, result.recommendedMinutes],
    [71, 94, 105],
  );
  assert.ok(
    result.warnings.some((warning) => warning.id === "illustrative-estimate"),
  );
  assert.ok(
    result.warnings.some(
      (warning) => warning.id === "lavatory" && warning.severity === "warning",
    ),
  );
  assert.ok(result.recommendedMinutes > result.maxMinutes);
});

test("classification has a distinct buffer band and never confuses aircraft access with time", () => {
  const base = assessConnection(DEFAULT_ITINERARY, DEFAULT_PROFILE);
  const at = (minutes: number) =>
    assessConnection(
      { ...DEFAULT_ITINERARY, layoverMinutes: minutes },
      DEFAULT_PROFILE,
    );
  assert.equal(at(0).status, "high-risk");
  assert.equal(at(base.minMinutes - 1).status, "high-risk");
  assert.equal(at(base.minMinutes).status, "tight");
  assert.equal(at(base.maxMinutes).status, "tight");
  assert.equal(at(base.recommendedMinutes - 1).status, "tight");
  const comfortable = at(base.recommendedMinutes);
  assert.equal(comfortable.status, "comfortable");
  assert.ok(
    comfortable.warnings.some(
      (warning) =>
        warning.id === "step-free-boarding" && warning.severity === "warning",
    ),
  );
  assert.ok(
    comfortable.warnings.some(
      (warning) => warning.id === "lavatory" && warning.severity === "warning",
    ),
  );
});

test("adding any accessibility need cannot reduce time across every profile combination", () => {
  const needs = [
    "wheelchair",
    "personalChair",
    "stepFree",
    "restroom",
    "serviceAnimal",
    "lowVision",
  ] as const;
  const paces = ["standard", "relaxed", "slow"] as const;
  for (const walkingPace of paces) {
    for (let combination = 0; combination < 2 ** needs.length; combination++) {
      const profile = { ...independent, walkingPace };
      needs.forEach((need, index) => {
        profile[need] = Boolean(combination & (1 << index));
      });
      const before = assessConnection(DEFAULT_ITINERARY, profile);
      for (const need of needs) {
        const after = assessConnection(DEFAULT_ITINERARY, {
          ...profile,
          [need]: true,
        });
        assert.ok(
          after.minMinutes >= before.minMinutes,
          `${need} lowered minimum`,
        );
        assert.ok(
          after.maxMinutes >= before.maxMinutes,
          `${need} lowered maximum`,
        );
        assert.ok(
          after.recommendedMinutes >= before.recommendedMinutes,
          `${need} lowered recommendation`,
        );
      }
    }
  }
});

test("slower pace, terminal change, and international processing increase the allowance", () => {
  const simpleTrip = { ...DEFAULT_ITINERARY, terminalChange: false };
  const base = assessConnection(simpleTrip, independent);
  const relaxed = assessConnection(simpleTrip, {
    ...independent,
    walkingPace: "relaxed",
  });
  const slow = assessConnection(simpleTrip, {
    ...independent,
    walkingPace: "slow",
  });
  assert.ok(
    base.maxMinutes < relaxed.maxMinutes &&
      relaxed.maxMinutes < slow.maxMinutes,
  );
  assert.ok(
    assessConnection({ ...simpleTrip, terminalChange: true }, independent)
      .minMinutes > base.minMinutes,
  );
  const international = assessConnection(
    { ...simpleTrip, internationalArrival: true },
    independent,
  );
  assert.ok(international.minMinutes > base.minMinutes);
  assert.ok(international.stages.some((stage) => stage.id === "international"));
});

test("assistance and stops appear only for the corresponding needs", () => {
  const stageIds = (profile: Profile) =>
    assessConnection(DEFAULT_ITINERARY, profile).stages.map(
      (stage) => stage.id,
    );
  assert.ok(!stageIds(independent).includes("assistance"));
  assert.ok(!stageIds(independent).includes("restroom"));
  assert.ok(!stageIds(independent).includes("animal-relief"));
  assert.ok(!stageIds(independent).includes("chair-retrieval"));
  assert.ok(
    stageIds({ ...independent, wheelchair: true }).includes("assistance"),
  );
  assert.ok(
    stageIds({ ...independent, lowVision: true }).includes("assistance"),
  );
  assert.ok(
    stageIds({ ...independent, personalChair: true }).includes(
      "chair-retrieval",
    ),
  );
  const both = stageIds({ ...independent, wheelchair: true, lowVision: true });
  assert.equal(both.filter((id) => id === "assistance").length, 1);
});

test("invalid numeric and profile input cannot yield a comfortable result", () => {
  for (const layoverMinutes of [
    NaN,
    Infinity,
    -Infinity,
    -1,
    Number.MAX_VALUE,
  ]) {
    assert.throws(
      () =>
        assessConnection(
          { ...DEFAULT_ITINERARY, layoverMinutes },
          DEFAULT_PROFILE,
        ),
      RangeError,
    );
    assert.throws(() => formatMinutes(layoverMinutes), RangeError);
  }
  assert.throws(
    () =>
      assessConnection(DEFAULT_ITINERARY, {
        ...DEFAULT_PROFILE,
        walkingPace: "invalid" as Profile["walkingPace"],
      }),
    RangeError,
  );
  assert.throws(
    () =>
      assessConnection(DEFAULT_ITINERARY, {
        ...DEFAULT_PROFILE,
        wheelchair: undefined as unknown as boolean,
      }),
    RangeError,
  );
  assert.throws(
    () =>
      assessConnection(
        { ...DEFAULT_ITINERARY, aircraft: "toString" as "A321" },
        DEFAULT_PROFILE,
      ),
    RangeError,
  );
});

test("aircraft changes report unknown fit and boarding even with ample connection time", () => {
  const profile = { ...DEFAULT_PROFILE, personalChair: true };
  const impacts = assessAircraftChange("B777", "CRJ900", profile);
  assert.ok(
    impacts.some(
      (impact) => impact.id === "lavatory" && impact.severity === "warning",
    ),
  );
  const storage = impacts.find((impact) => impact.id === "chair-storage");
  assert.ok(storage);
  assert.match(storage.description, /actual fit is unknown/i);
  assert.ok(impacts.some((impact) => impact.id === "step-free-boarding"));
  assert.ok(
    impacts.some(
      (impact) =>
        impact.id === "aircraft-change" &&
        /simulation/i.test(impact.description),
    ),
  );
  const largerAircraft = assessAircraftChange("CRJ900", "B777", profile);
  assert.ok(
    largerAircraft.some(
      (impact) =>
        impact.id === "chair-storage" && impact.severity === "warning",
    ),
  );
  assert.ok(
    largerAircraft.some(
      (impact) =>
        impact.id === "lavatory" && /verify/i.test(impact.description),
    ),
  );
});

test("aircraft-change messages follow selected needs and unchanged aircraft creates no alert", () => {
  assert.deepEqual(assessAircraftChange("A321", "A321", DEFAULT_PROFILE), []);
  const impacts = assessAircraftChange("A321", "CRJ900", independent);
  assert.deepEqual(
    impacts.map((impact) => impact.id),
    ["aircraft-change"],
  );
  const guidedAnimal = assessAircraftChange("A321", "B777", {
    ...independent,
    lowVision: true,
    serviceAnimal: true,
  });
  assert.ok(guidedAnimal.some((impact) => impact.id === "guided-assistance"));
  assert.ok(guidedAnimal.some((impact) => impact.id === "animal-space"));
});

test("assessment does not mutate saved itinerary or profile snapshots", () => {
  const itinerary = Object.freeze({ ...DEFAULT_ITINERARY });
  const profile = Object.freeze({ ...DEFAULT_PROFILE });
  assert.doesNotThrow(() => assessConnection(itinerary, profile));
  assert.doesNotThrow(() => assessAircraftChange("A321", "CRJ900", profile));
});

test("minute labels preserve an hour boundary without understating fractional time", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(58), "58m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(107), "1h 47m");
  assert.equal(formatMinutes(59.5), "1h");
});
