import { AIRPORTS, DEFAULT_PROFILE } from "./assessment";
import type { Itinerary, Profile } from "./assessment";

export type SavedTrip = {
  id: string;
  itinerary: Itinerary;
  profile: Profile;
  savedAt: string;
  previousAircraft?: Itinerary["aircraft"];
};
const PROFILE_KEY = "accessflight.profile.v1";
const TRIPS_KEY = "accessflight.trips.v1";

function read(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}

function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Profile;
  return (
    [
      "wheelchair",
      "personalChair",
      "stepFree",
      "restroom",
      "serviceAnimal",
      "lowVision",
    ].every((key) => typeof profile[key as keyof Profile] === "boolean") &&
    ["standard", "relaxed", "slow"].includes(profile.walkingPace)
  );
}

function isItinerary(value: unknown): value is Itinerary {
  if (!value || typeof value !== "object") return false;
  const trip = value as Itinerary;
  return (
    [trip.origin, trip.connection, trip.destination].every((code) =>
      AIRPORTS.some((airport) => airport.code === code),
    ) &&
    new Set([trip.origin, trip.connection, trip.destination]).size === 3 &&
    Number.isFinite(trip.layoverMinutes) &&
    trip.layoverMinutes >= 15 &&
    trip.layoverMinutes <= 720 &&
    ["A321", "B777", "CRJ900"].includes(trip.aircraft) &&
    typeof trip.terminalChange === "boolean" &&
    typeof trip.internationalArrival === "boolean" &&
    typeof trip.id === "string" &&
    typeof trip.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(trip.date) &&
    typeof trip.arrivalTime === "string" &&
    typeof trip.departureTime === "string"
  );
}

export function readProfile(): Profile {
  const stored = read(PROFILE_KEY);
  return isProfile(stored) ? stored : { ...DEFAULT_PROFILE };
}

export function readTrips(): SavedTrip[] {
  const stored = read(TRIPS_KEY);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter(
      (trip): trip is SavedTrip =>
        !!trip &&
        typeof trip.id === "string" &&
        isProfile(trip.profile) &&
        isItinerary(trip.itinerary) &&
        typeof trip.savedAt === "string" &&
        (trip.previousAircraft === undefined ||
          ["A321", "B777", "CRJ900"].includes(trip.previousAircraft)),
    )
    .slice(0, 30);
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storeProfile = (profile: Profile) => write(PROFILE_KEY, profile);
export const storeTrips = (trips: SavedTrip[]) => write(TRIPS_KEY, trips);
export function clearLocalData(): boolean {
  try {
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(TRIPS_KEY);
    return true;
  } catch {
    return false;
  }
}
