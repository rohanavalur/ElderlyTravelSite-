import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Accessibility,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Armchair,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Dog,
  Eye,
  Footprints,
  Heart,
  Info,
  MapPin,
  MoveRight,
  Plane,
  Plus,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  AIRCRAFT,
  AIRPORTS,
  DEFAULT_ITINERARY,
  DEFAULT_PROFILE,
  assessAircraftChange,
  assessConnection,
  formatMinutes,
} from "./lib/assessment";
import type { Itinerary, Profile } from "./lib/assessment";
import {
  clearLocalData,
  readProfile,
  readTrips,
  storeProfile,
  storeTrips,
} from "./lib/storage";
import type { SavedTrip } from "./lib/storage";

type Page = "planner" | "saved";
type ModalName = "profile" | "methodology" | "compare" | "clear" | null;
type NeedKey = Exclude<keyof Profile, "walkingPace">;
const NEEDS: {
  key: NeedKey;
  label: string;
  short: string;
  description: string;
  icon: typeof Accessibility;
}[] = [
  {
    key: "wheelchair",
    label: "Wheelchair assistance",
    short: "Wheelchair assistance",
    description: "Assistance from the aircraft door to my next gate.",
    icon: Accessibility,
  },
  {
    key: "stepFree",
    label: "A step-free journey",
    short: "Step-free access",
    description: "I cannot use stairs, including when boarding.",
    icon: Footprints,
  },
  {
    key: "restroom",
    label: "Accessible restroom stops",
    short: "Restroom stop",
    description:
      "Restroom time between flights, plus a check of onboard lavatory access.",
    icon: MapPin,
  },
  {
    key: "personalChair",
    label: "My own wheelchair",
    short: "Personal wheelchair",
    description: "Allow time to retrieve my wheelchair at the aircraft.",
    icon: Armchair,
  },
  {
    key: "serviceAnimal",
    label: "A service animal",
    short: "Animal relief stop",
    description: "Include a service-animal relief stop.",
    icon: Dog,
  },
  {
    key: "lowVision",
    label: "Guided assistance",
    short: "Guided assistance",
    description: "Help navigating the airport for low or no vision.",
    icon: Eye,
  },
];

function initialItinerary(): Itinerary {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { ...DEFAULT_ITINERARY, date: localDate };
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function airportCity(code: string) {
  return AIRPORTS.find((airport) => airport.code === code)?.city ?? code;
}
function routeLabel(trip: Itinerary) {
  return `${trip.origin} → ${trip.connection} → ${trip.destination}`;
}

function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    return () => {
      element?.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? "modal-wide" : ""}`}
      ref={dialog}
      aria-labelledby="modal-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          ),
        ).filter(
          (element) =>
            !element.hasAttribute("disabled") &&
            element.getClientRects().length > 0,
        );
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">A JOURNEY THAT FITS YOU</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function RouteIllustration() {
  return (
    <div className="hero-art" aria-hidden="true">
      <svg viewBox="0 0 420 200" fill="none">
        <ellipse cx="224" cy="105" rx="173" ry="82" fill="#e7eadc" />
        <path
          d="M56 125C120 142 145 44 214 83S281 160 369 47"
          stroke="#9eac93"
          strokeWidth="2"
          strokeDasharray="5 7"
        />
        <circle
          cx="74"
          cy="126"
          r="8"
          fill="#173f39"
          stroke="#fffef9"
          strokeWidth="4"
        />
        <circle
          cx="217"
          cy="86"
          r="9"
          fill="#e19a58"
          stroke="#fffef9"
          strokeWidth="4"
        />
        <circle
          cx="364"
          cy="53"
          r="8"
          fill="#173f39"
          stroke="#fffef9"
          strokeWidth="4"
        />
        <text
          x="53"
          y="155"
          fill="#526356"
          fontSize="12"
          fontFamily="Arial"
          letterSpacing="2"
        >
          YOUR PLANS
        </text>
        <text
          x="259"
          y="32"
          fill="#526356"
          fontSize="12"
          fontFamily="Arial"
          letterSpacing="2"
        >
          YOUR POSSIBILITIES
        </text>
        <path
          d="m285 99 12-12-3-28 6-5 11 25 18-12 8 3-18 20 6 10-4 4-13-7-19 8Z"
          fill="#173f39"
          transform="rotate(-12 309 85)"
        />
        <path
          d="M107 49h18m-9-9v18M344 151h14m-7-7v14"
          stroke="#9eac93"
          strokeWidth="1.5"
        />
      </svg>
      <div className="art-note">
        <Heart size={15} /> A little planning. A lot more possibility.
      </div>
    </div>
  );
}

function ProfileEditor({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (profile: Profile) => void;
}) {
  const [draft, setDraft] = useState(profile);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSave(draft);
      }}
    >
      <div className="needs-list">
        {NEEDS.map(({ key, label, description, icon: Icon }) => (
          <label
            key={key}
            className={`need-option ${draft[key] ? "selected" : ""}`}
          >
            <span className="need-icon">
              <Icon size={21} />
            </span>
            <span className="need-copy">
              <strong>{label}</strong>
              <span>{description}</span>
            </span>
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.checked })
              }
            />
          </label>
        ))}
      </div>
      <label className="field pace-field">
        <span>My walking pace</span>
        <select
          value={draft.walkingPace}
          onChange={(event) =>
            setDraft({
              ...draft,
              walkingPace: event.target.value as Profile["walkingPace"],
            })
          }
        >
          <option value="standard">A steady pace</option>
          <option value="relaxed">A relaxed pace</option>
          <option value="slow">A slower pace, with breaks</option>
        </select>
      </label>
      <p className="privacy-note">
        <ShieldCheck size={16} /> Saved only in this browser. No account or
        medical details needed.
      </p>
      <button className="button primary full-width" type="submit">
        Save my accessibility profile <Check size={18} />
      </button>
    </form>
  );
}

function Methodology() {
  return (
    <div className="methodology-content">
      <div className="info-callout">
        <Info size={21} />
        <p>
          <strong>This is an interactive prototype.</strong> Flight details,
          aircraft features, and connection allowances are illustrative. No live
          airline or airport data is connected.
        </p>
      </div>
      <h3>Time for your whole connection</h3>
      <p>
        We add example allowances for deplaning, requested assistance, moving
        between gates, personal wheelchair retrieval, restroom or service-animal
        stops, and boarding cutoff. Terminal changes, walking pace, and
        international-arrival processing can add time.
      </p>
      <p>
        The recommended connection rounds the upper estimate up to the next five
        minutes and adds a ten-minute buffer. These are planning assumptions,
        not measured airport wait times or an airline’s official minimum
        connection time.
      </p>
      <h3>A longer layover is only part of the picture</h3>
      <p>
        Aircraft suitability is assessed separately. Aircraft model alone does
        not establish lavatory access, boarding arrangements, or wheelchair fit.
        The exact airline configuration, your device dimensions, and available
        equipment need confirmation.
      </p>
      <h3>What saving a trip does</h3>
      <p>
        Your itinerary and the profile used to assess it stay in this browser.
        You can simulate an aircraft change to see which needs are affected.
        Saving does not request airline assistance or start live monitoring.
      </p>
      <h3>Grounded in official guidance</h3>
      <a
        className="source-link"
        href="https://www.transportation.gov/individuals/aviation-consumer-protection/wheelchair-and-guided-assistance"
        target="_blank"
        rel="noreferrer"
      >
        <span>
          <strong>Wheelchair and guided assistance</strong>
          <small>
            U.S. Department of Transportation · Connecting-flight assistance
          </small>
        </span>
        <ArrowUpRight size={19} />
      </a>
      <a
        className="source-link"
        href="https://www.transportation.gov/airconsumer/disabilitybillofrights"
        target="_blank"
        rel="noreferrer"
      >
        <span>
          <strong>Airline Passengers with Disabilities Bill of Rights</strong>
          <small>
            U.S. Department of Transportation · Aircraft accessibility
            information
          </small>
        </span>
        <ArrowUpRight size={19} />
      </a>
      <a
        className="source-link"
        href="https://www.transportation.gov/individuals/aviation-consumer-protection/general-travel-tips-persons-disabilities"
        target="_blank"
        rel="noreferrer"
      >
        <span>
          <strong>Preparing for accessible air travel</strong>
          <small>
            U.S. Department of Transportation · Planning with each airline
          </small>
        </span>
        <ArrowUpRight size={19} />
      </a>
    </div>
  );
}

function AircraftPanel({
  itinerary,
  profile,
}: {
  itinerary: Itinerary;
  profile: Profile;
}) {
  const aircraft = AIRCRAFT[itinerary.aircraft];
  const featureItems = [
    {
      label: "Onboard wheelchair & transfers",
      value:
        aircraft.onboardChair === "available"
          ? "Shown in demo · confirm assistance"
          : "Confirm equipment and assistance",
      active: profile.wheelchair || profile.personalChair,
      icon: Armchair,
    },
    {
      label: "Accessible lavatory",
      value:
        aircraft.lavatory === "limited"
          ? "Limited in this example"
          : aircraft.lavatory === "available"
            ? "Shown in demo · verify layout"
            : "Needs confirmation",
      active: profile.restroom,
      icon: Accessibility,
    },
    {
      label: "Step-free boarding",
      value: "Confirm gate equipment",
      active: profile.stepFree,
      icon: Footprints,
    },
    {
      label: "Wheelchair storage",
      value:
        aircraft.chairStorage === "restricted"
          ? "Fit may be restricted"
          : "Confirm device dimensions",
      active: profile.personalChair,
      icon: Armchair,
    },
  ].filter((item) => item.active);
  return (
    <section className="aircraft-panel" aria-label="Aircraft accessibility">
      <div className="subsection-title">
        <span className="small-icon">
          <Plane size={18} />
        </span>
        <div>
          <h3>Your next aircraft</h3>
          <p>
            {AIRCRAFT[itinerary.aircraft].name} · {itinerary.connection} to{" "}
            {itinerary.destination} · Demo configuration
          </p>
        </div>
        <span className="neutral-tag">Verify details</span>
      </div>
      {featureItems.length ? (
        <div className="aircraft-features">
          {featureItems.map(({ label, value, icon: Icon }) => (
            <div key={label}>
              <Icon size={18} />
              <span>
                <strong>{label}</strong>
                <small>{value}</small>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small">
          No aircraft-specific needs selected. Accessibility varies by airline
          configuration.
        </p>
      )}
    </section>
  );
}

function ConnectionResult({
  itinerary,
  profile,
  onCompare,
  onSave,
  onMethodology,
  isSaved,
}: {
  itinerary: Itinerary;
  profile: Profile;
  onCompare: () => void;
  onSave: () => void;
  onMethodology: () => void;
  isSaved: boolean;
}) {
  const result = assessConnection(itinerary, profile);
  const [expanded, setExpanded] = useState(false);
  const comfortable = result.status === "comfortable";
  const shortfall = Math.max(
    0,
    result.recommendedMinutes - itinerary.layoverMinutes,
  );
  return (
    <article className="result-card" aria-label="Connection assessment">
      <div className="result-top">
        <div className="connection-airport">
          <span className="airport-icon">
            <Plane size={22} />
          </span>
          <div>
            <h3>Your connection at {itinerary.connection}</h3>
            <p>
              {airportCity(itinerary.connection)} ·{" "}
              {itinerary.terminalChange ? "Terminal change" : "Same terminal"} ·{" "}
              {dateLabel(itinerary.date)}
            </p>
          </div>
        </div>
        <span className={`status-tag ${result.status}`}>
          {comfortable ? <Check size={14} /> : <TriangleAlert size={14} />}
          {comfortable
            ? "More breathing room"
            : result.status === "tight"
              ? "Tight connection"
              : "High risk"}
        </span>
      </div>
      <div className={`assessment-banner ${comfortable ? "comfortable" : ""}`}>
        <span className="assessment-symbol">
          {comfortable ? <ShieldCheck size={26} /> : <Clock3 size={26} />}
        </span>
        <div>
          <h3>
            {comfortable
              ? "A little more time. A better fit."
              : result.status === "tight"
                ? "This connection leaves little room."
                : "This connection asks you to rush."}
          </h3>
          <p>
            {comfortable
              ? "Your connection includes our suggested time buffer. Review aircraft access below."
              : `Based on your needs, we’d allow ${formatMinutes(shortfall)} more between flights.`}
          </p>
        </div>
      </div>
      <div className="time-comparison">
        <div>
          <span className="metric-label">Your connection</span>
          <strong data-testid="connection-duration">
            {formatMinutes(itinerary.layoverMinutes)}
          </strong>
          <span
            className={comfortable ? "metric-note teal" : "metric-note orange"}
          >
            {comfortable
              ? "Includes a planning buffer"
              : "Less time than recommended"}
          </span>
        </div>
        <div className="time-divider">
          <ArrowRight size={20} />
        </div>
        <div>
          <span className="metric-label">
            Estimated time you’ll need{" "}
            <button
              className="inline-icon"
              aria-label="How estimates work"
              onClick={onMethodology}
            >
              <CircleHelp size={14} />
            </button>
          </span>
          <strong className="estimate" data-testid="estimated-range">
            {result.minMinutes}–{result.maxMinutes}
            <small> min</small>
          </strong>
          <span className="metric-note">
            A planning range, including boarding cutoff
          </span>
        </div>
      </div>
      <div className="timeline-label">
        <h4>Every part of your connection counts</h4>
        <button
          className="text-button"
          aria-expanded={expanded}
          aria-controls="time-breakdown"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Hide breakdown" : "See breakdown"}
          <ChevronDown size={15} className={expanded ? "rotated" : ""} />
        </button>
      </div>
      <div className="time-bar" aria-hidden="true">
        {result.stages
          .filter((stage) => stage.max > 0)
          .map((stage, index) => (
            <span
              className={`bar-segment segment-${index % 6}`}
              key={stage.id}
              style={{ flexGrow: stage.max }}
              title={`${stage.label}: ${stage.min}–${stage.max} min`}
            />
          ))}
      </div>
      <div className="time-legend">
        {result.stages
          .filter((stage) => stage.max > 0)
          .map((stage, index) => (
            <span key={stage.id}>
              <i className={`segment-${index % 6}`} />
              {stage.label}
            </span>
          ))}
      </div>
      {expanded && (
        <div id="time-breakdown" className="breakdown">
          {result.stages
            .filter((stage) => stage.max > 0)
            .map((stage) => (
              <div className="breakdown-row" key={stage.id}>
                <span>
                  <strong>{stage.label}</strong>
                  <small>{stage.description}</small>
                </span>
                <b>
                  {stage.min === stage.max
                    ? stage.max
                    : `${stage.min}–${stage.max}`}{" "}
                  min
                </b>
              </div>
            ))}
          <div className="breakdown-total">
            <span>Recommended with a planning buffer</span>
            <strong>{formatMinutes(result.recommendedMinutes)}</strong>
          </div>
        </div>
      )}
      <div className="key-factors">
        <h4>What this means for your journey</h4>
        <div>
          <Route size={17} />
          <p>
            {itinerary.terminalChange
              ? "Changing terminals adds travel time and may involve elevators or an airport train."
              : "Staying in one terminal reduces transfer time; gate distance still matters."}
          </p>
        </div>
        {profile.wheelchair && (
          <div>
            <Accessibility size={17} />
            <p>
              Assistance includes a waiting allowance. Actual availability and
              handoffs vary.
            </p>
          </div>
        )}
        {profile.stepFree && (
          <div>
            <Footprints size={17} />
            <p>
              A step-free route is included in the model. Boarding equipment
              needs confirmation.
            </p>
          </div>
        )}
        {profile.personalChair && (
          <div>
            <Armchair size={17} />
            <p>
              Retrieving your personal wheelchair adds time before the gate
              transfer.
            </p>
          </div>
        )}
        {profile.lowVision && (
          <div>
            <Eye size={17} />
            <p>
              Guided-assistance handoffs may take extra time between flights.
            </p>
          </div>
        )}
        {profile.serviceAnimal && (
          <div>
            <Dog size={17} />
            <p>
              An animal relief stop is included. Its distance from your gates
              needs confirmation.
            </p>
          </div>
        )}
        {itinerary.internationalArrival && (
          <div>
            <Info size={17} />
            <p>
              Extra time is included for immigration, customs, and any required
              security re-screening.
            </p>
          </div>
        )}
      </div>
      <AircraftPanel itinerary={itinerary} profile={profile} />
      <div className="recommendation">
        <div>
          <Sparkles size={20} />
          <p>
            <strong>
              {comfortable
                ? "Keep this extra breathing room."
                : `Look for at least a ${formatMinutes(result.recommendedMinutes)} connection.`}
            </strong>
            <span>
              {comfortable
                ? "More time helps. Confirm aircraft details before booking."
                : "A more comfortable connection starts with a little more time."}
            </span>
          </p>
        </div>
        <button className="button primary" onClick={onCompare}>
          Compare options <ArrowRight size={17} />
        </button>
      </div>
      <div className="result-bottom">
        <span>
          <Info size={14} /> Illustrative estimate · Not a guarantee
        </span>
        <button className="text-button" onClick={onSave}>
          {isSaved ? <CheckCheck size={17} /> : <Bookmark size={17} />}
          {isSaved ? "Saved · view trip" : "Save this trip"}
        </button>
      </div>
    </article>
  );
}

function Comparison({
  itinerary,
  profile,
  onSelect,
}: {
  itinerary: Itinerary;
  profile: Profile;
  onSelect: (minutes: number) => void;
}) {
  const result = assessConnection(itinerary, profile);
  const recommended =
    result.recommendedMinutes +
    (itinerary.layoverMinutes === result.recommendedMinutes + 2 ? 7 : 2);
  const spacious =
    recommended + (itinerary.layoverMinutes === recommended + 38 ? 43 : 38);
  const options = [itinerary.layoverMinutes, recommended, spacious];
  return (
    <div>
      <div className="info-callout compact">
        <Info size={19} />
        <p>
          Example connection options for {routeLabel(itinerary)}. These are
          planning scenarios, not available flights or fares.
        </p>
      </div>
      <div className="comparison-options">
        {options.map((minutes, index) => {
          const assessment = assessConnection(
            { ...itinerary, layoverMinutes: minutes },
            profile,
          );
          return (
            <div
              className={`comparison-option ${index === 1 ? "recommended-option" : ""}`}
              key={`${minutes}-${index}`}
            >
              <div className="option-heading">
                <span>
                  {index === 0
                    ? "Your current plan"
                    : index === 1
                      ? "Our suggested fit"
                      : "More time to settle in"}
                </span>
                {index === 1 && <Sparkles size={17} />}
              </div>
              <h3>
                {formatMinutes(minutes)}
                <small>connection at {itinerary.connection}</small>
              </h3>
              <span className={`status-tag ${assessment.status}`}>
                {assessment.status === "comfortable" ? (
                  <Check size={14} />
                ) : (
                  <TriangleAlert size={14} />
                )}
                {assessment.status === "comfortable"
                  ? "More breathing room"
                  : assessment.status === "tight"
                    ? "Tight connection"
                    : "High risk"}
              </span>
              <p>
                {index === 0
                  ? "The itinerary you are assessing now."
                  : `${formatMinutes(minutes - result.maxMinutes)} above the upper planning estimate.`}
              </p>
              <button
                className={`button ${index === 1 ? "primary" : "secondary"} full-width`}
                onClick={() => onSelect(minutes)}
              >
                {index === 0 ? "Keep current plan" : "Use this connection"}
                <ArrowRight size={16} />
              </button>
            </div>
          );
        })}
      </div>
      <p className="privacy-note">
        <Plane size={16} /> All options use the same demo aircraft. Changing the
        connection does not resolve aircraft-access concerns.
      </p>
    </div>
  );
}

function AircraftChange({
  trip,
  onApply,
}: {
  trip: SavedTrip;
  onApply: (aircraft: Itinerary["aircraft"]) => void;
}) {
  const [aircraft, setAircraft] = useState<Itinerary["aircraft"]>(
    trip.itinerary.aircraft === "CRJ900" ? "B777" : "CRJ900",
  );
  const impacts = assessAircraftChange(
    trip.itinerary.aircraft,
    aircraft,
    trip.profile,
  );
  return (
    <div className="change-preview">
      <div className="info-callout">
        <Bell size={21} />
        <p>
          <strong>A preview of what could change.</strong> This is a simulation.
          We have not received an update from your airline.
        </p>
      </div>
      <div className="aircraft-change-route">
        <div>
          <span>Saved aircraft</span>
          <strong>{AIRCRAFT[trip.itinerary.aircraft].name}</strong>
        </div>
        <ArrowRight size={24} />
        <label className="field">
          <span>Simulate a change to</span>
          <select
            value={aircraft}
            onChange={(event) =>
              setAircraft(event.target.value as Itinerary["aircraft"])
            }
          >
            {Object.entries(AIRCRAFT)
              .filter(([key]) => key !== trip.itinerary.aircraft)
              .map(([key, value]) => (
                <option key={key} value={key}>
                  {value.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <h3>What it means for your saved profile</h3>
      <div className="change-impacts">
        {impacts.length ? (
          impacts.map((impact) => (
            <div key={impact.id}>
              <span
                className={impact.severity === "warning" ? "orange" : "teal"}
              >
                {impact.severity === "warning" ? (
                  <TriangleAlert size={20} />
                ) : (
                  <Info size={20} />
                )}
              </span>
              <p>
                <strong>{impact.title}</strong>
                <span>{impact.description}</span>
              </p>
            </div>
          ))
        ) : (
          <div>
            <Info size={20} />
            <p>
              <strong>No specific conflict identified in this example.</strong>
              <span>
                Aircraft configuration and accessibility still need
                confirmation.
              </span>
            </p>
          </div>
        )}
      </div>
      <p className="privacy-note">
        This preview uses the accessibility profile saved with this trip.
      </p>
      <button
        className="button primary full-width"
        onClick={() => onApply(aircraft)}
      >
        Apply simulated change to saved trip <ArrowRight size={17} />
      </button>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>("planner");
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [defaultProfile, setDefaultProfile] = useState<Profile>(profile);
  const [usingSavedProfile, setUsingSavedProfile] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary>(initialItinerary);
  const [draft, setDraft] = useState<Itinerary>(itinerary);
  const [trips, setTrips] = useState<SavedTrip[]>(readTrips);
  const [modal, setModal] = useState<ModalName>(null);
  const [changeTrip, setChangeTrip] = useState<SavedTrip | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function notify(message: string) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 6500);
  }
  function persistTrips(next: SavedTrip[]) {
    setTrips(next);
    const persisted = storeTrips(next);
    if (!persisted)
      notify(
        "Browser storage is unavailable. Changes will last only for this session.",
      );
    return persisted;
  }
  function saveProfile(next: Profile) {
    setProfile(next);
    setDefaultProfile(next);
    setUsingSavedProfile(false);
    setModal(null);
    notify(
      storeProfile(next)
        ? "Profile saved. Your connection estimate has been updated."
        : "Profile updated for this session. Browser storage is unavailable.",
    );
  }
  const isSaved = trips.some(
    (trip) =>
      JSON.stringify(trip.itinerary) === JSON.stringify(itinerary) &&
      JSON.stringify(trip.profile) === JSON.stringify(profile),
  );
  function saveTrip() {
    if (isSaved) {
      setPage("saved");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (trips.length >= 30) {
      notify("You have 30 saved trips. Remove a trip before saving another.");
      return;
    }
    const next: SavedTrip = {
      id: crypto.randomUUID(),
      itinerary: { ...itinerary },
      profile: { ...profile },
      savedAt: new Date().toISOString(),
    };
    const persisted = persistTrips([next, ...trips]);
    if (persisted)
      notify("Trip saved in this browser. Find it in Saved trips.");
  }
  function analyze(event: FormEvent) {
    event.preventDefault();
    if (new Set([draft.origin, draft.connection, draft.destination]).size < 3) {
      setError("Choose a different airport for each part of your journey.");
      return;
    }
    if (
      !draft.date ||
      !Number.isFinite(draft.layoverMinutes) ||
      draft.layoverMinutes < 15 ||
      draft.layoverMinutes > 720
    ) {
      setError(
        "Enter a travel date and a connection between 15 and 720 minutes.",
      );
      return;
    }
    setError("");
    setItinerary({ ...draft });
    notify("Your connection has been assessed for your accessibility profile.");
    requestAnimationFrame(() => {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
  function chooseConnection(minutes: number) {
    const next = { ...itinerary, layoverMinutes: minutes };
    setItinerary(next);
    setDraft(next);
    setModal(null);
    notify(
      `Connection updated to ${formatMinutes(minutes)}. Your assessment is ready.`,
    );
  }
  function applyAircraft(aircraft: Itinerary["aircraft"]) {
    if (!changeTrip) return;
    const next = trips.map((trip) =>
      trip.id === changeTrip.id
        ? {
            ...trip,
            previousAircraft: trip.itinerary.aircraft,
            itinerary: { ...trip.itinerary, aircraft },
          }
        : trip,
    );
    const persisted = persistTrips(next);
    if (JSON.stringify(itinerary) === JSON.stringify(changeTrip.itinerary)) {
      setItinerary({ ...itinerary, aircraft });
      if (JSON.stringify(draft) === JSON.stringify(changeTrip.itinerary)) {
        setDraft({ ...draft, aircraft });
      }
    }
    setChangeTrip(null);
    if (persisted)
      notify(
        "Simulated aircraft change applied. Review the updated trip below.",
      );
  }
  function loadTrip(trip: SavedTrip) {
    setItinerary({ ...trip.itinerary });
    setDraft({ ...trip.itinerary });
    setProfile({ ...trip.profile });
    setUsingSavedProfile(true);
    setPage("planner");
    window.scrollTo({ top: 0, behavior: "smooth" });
    notify("Opened this trip with its saved accessibility profile.");
  }
  const selectedNeeds = NEEDS.filter((need) => profile[need.key]);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setPage("planner");
            }}
            aria-label="AccessFlight home"
          >
            <span className="brand-icon">
              <Plane size={22} />
            </span>
            Access<span>Flight</span>
            <span className="brand-dot">.</span>
          </a>
          <nav aria-label="Main navigation">
            <button
              className={`nav-link ${page === "planner" ? "active" : ""}`}
              aria-current={page === "planner" ? "page" : undefined}
              onClick={() => setPage("planner")}
            >
              Plan a trip
            </button>
            <button
              className={`nav-link ${page === "saved" ? "active" : ""}`}
              aria-current={page === "saved" ? "page" : undefined}
              onClick={() => setPage("saved")}
            >
              Saved trips
              {trips.length > 0 && (
                <span className="nav-count">{trips.length}</span>
              )}
            </button>
            <button
              className="nav-link how-it-works"
              onClick={() => setModal("methodology")}
            >
              How it works <ArrowUpRight size={13} />
            </button>
          </nav>
          <button
            className="profile-nav"
            aria-label="My accessibility profile"
            onClick={() => setModal("profile")}
          >
            <span className="profile-avatar">
              <Accessibility size={19} />
            </span>
            <span>My accessibility profile</span>
            <ChevronDown size={15} />
          </button>
        </div>
      </header>
      <main id="main-content" className="main-shell">
        {page === "planner" ? (
          <>
            <section className="hero">
              <div>
                <div className="eyebrow">
                  <span className="tiny-star">✳</span> YOUR NEEDS. YOUR PACE.
                  YOUR NEXT ADVENTURE.
                </div>
                <h1>
                  A little more room <em>to travel.</em>
                </h1>
                <p>
                  Find out if your connection works for you.
                  <br className="desktop-break" /> Because a valid itinerary
                  should be a doable journey, too.
                </p>
              </div>
              <RouteIllustration />
            </section>
            <section className="trip-search" aria-labelledby="trip-heading">
              <div className="search-heading">
                <h2 id="trip-heading">
                  <Route size={19} /> Let’s look at your journey
                </h2>
                <span className="demo-pill">
                  <span /> Demo itinerary
                </span>
              </div>
              <form onSubmit={analyze}>
                <div className="search-fields">
                  {(["origin", "connection", "destination"] as const).map(
                    (key, index) => (
                      <label
                        className={`field airport-field airport-field-${index}`}
                        key={key}
                      >
                        <span>
                          {index === 0
                            ? "Flying from"
                            : index === 1
                              ? "Connecting at"
                              : "Flying to"}
                        </span>
                        <div className="input-with-icon">
                          <MapPin size={17} />
                          <select
                            value={draft[key]}
                            onChange={(event) =>
                              setDraft({ ...draft, [key]: event.target.value })
                            }
                          >
                            {AIRPORTS.map((airport) => (
                              <option value={airport.code} key={airport.code}>
                                {airport.city} ({airport.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    ),
                  )}
                  <label className="field date-field">
                    <span>Travel date</span>
                    <div className="input-with-icon">
                      <CalendarDays size={17} />
                      <input
                        type="date"
                        value={draft.date}
                        required
                        onChange={(event) =>
                          setDraft({ ...draft, date: event.target.value })
                        }
                      />
                    </div>
                  </label>
                  <label className="field duration-field">
                    <span>Connection time</span>
                    <div className="duration-input">
                      <Clock3 size={17} />
                      <input
                        aria-label="Connection time in minutes"
                        type="number"
                        min="15"
                        max="720"
                        step="1"
                        required
                        value={
                          Number.isNaN(draft.layoverMinutes)
                            ? ""
                            : draft.layoverMinutes
                        }
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            layoverMinutes: event.target.valueAsNumber,
                          })
                        }
                      />
                      <span>min</span>
                    </div>
                  </label>
                  <button
                    type="submit"
                    className="button primary analyze-button"
                  >
                    Check my connection <ArrowRight size={17} />
                  </button>
                </div>
                <div className="search-footer">
                  <span>Start with our example, or enter your own route.</span>
                  <button
                    type="button"
                    className="text-button"
                    aria-expanded={advanced}
                    aria-controls="journey-details"
                    onClick={() => setAdvanced(!advanced)}
                  >
                    <SlidersHorizontal size={14} /> Journey details{" "}
                    <ChevronDown
                      size={14}
                      className={advanced ? "rotated" : ""}
                    />
                  </button>
                </div>
                {advanced && (
                  <div id="journey-details" className="advanced-fields">
                    <label className="simple-check">
                      <input
                        type="checkbox"
                        checked={draft.terminalChange}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            terminalChange: event.target.checked,
                          })
                        }
                      />{" "}
                      Terminal change required
                    </label>
                    <label className="simple-check">
                      <input
                        type="checkbox"
                        checked={draft.internationalArrival}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            internationalArrival: event.target.checked,
                          })
                        }
                      />{" "}
                      Include international-arrival processing
                    </label>
                    <label className="field">
                      <span>Onward aircraft (demo configuration)</span>
                      <select
                        value={draft.aircraft}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            aircraft: event.target
                              .value as Itinerary["aircraft"],
                          })
                        }
                      >
                        {Object.entries(AIRCRAFT).map(([key, aircraft]) => (
                          <option key={key} value={key}>
                            {aircraft.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Gate layouts and aircraft details are not looked up
                      automatically. Set these assumptions for your scenario.
                    </p>
                  </div>
                )}
                {error && (
                  <p role="alert" className="form-error">
                    <TriangleAlert size={16} />
                    {error}
                  </p>
                )}
              </form>
            </section>
            <div className="assessment-heading" ref={resultRef} tabIndex={-1}>
              <div>
                <h2>Your journey, through your lens</h2>
                <p>A connection check built around what you need.</p>
              </div>
              <span className="route-breadcrumb">
                {itinerary.origin}
                <MoveRight size={17} />
                {itinerary.connection}
                <MoveRight size={17} />
                {itinerary.destination}
              </span>
            </div>
            <div className="assessment-layout">
              <aside className="profile-sidebar">
                <section className="profile-card">
                  <div className="profile-card-heading">
                    <span className="profile-emblem">
                      <Accessibility size={23} />
                    </span>
                    <span className="mini-label">
                      {usingSavedProfile
                        ? "SAVED TRIP PROFILE"
                        : "PERSONALIZED FOR YOU"}
                    </span>
                  </div>
                  <h3>A journey at your pace.</h3>
                  <p>We’re making room for the things that matter to you.</p>
                  {usingSavedProfile && (
                    <div className="saved-profile-note">
                      <p>Using the profile saved with this trip.</p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setProfile({ ...defaultProfile });
                          setUsingSavedProfile(false);
                          notify(
                            "Your current profile is restored. The trip’s saved profile is unchanged.",
                          );
                        }}
                      >
                        Use my current profile <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                  <div className="profile-needs">
                    {selectedNeeds.length ? (
                      selectedNeeds.map(({ key, short, icon: Icon }) => (
                        <div key={key}>
                          <Icon size={18} />
                          <span>{short}</span>
                          <Check size={15} />
                        </div>
                      ))
                    ) : (
                      <div>
                        <Footprints size={18} />
                        <span>Independent travel</span>
                        <Check size={15} />
                      </div>
                    )}
                    <div>
                      <Clock3 size={18} />
                      <span>
                        {profile.walkingPace === "standard"
                          ? "Steady pace"
                          : profile.walkingPace === "relaxed"
                            ? "A relaxed pace"
                            : "Slower pace, with breaks"}
                      </span>
                      <Check size={15} />
                    </div>
                  </div>
                  <button
                    className="button secondary full-width"
                    onClick={() => setModal("profile")}
                  >
                    <SlidersHorizontal size={16} /> Edit my profile
                  </button>
                  <span className="profile-private">
                    <ShieldCheck size={13} /> Private to this browser
                  </span>
                </section>
                <section className="little-note">
                  <span className="note-icon">
                    <Heart size={20} />
                  </span>
                  <h3>You’re more than a passenger.</h3>
                  <p>
                    Your needs deserve to be part of the plan, from the first
                    gate to the last.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setModal("methodology")}
                  >
                    How we make room <ArrowUpRight size={15} />
                  </button>
                </section>
                <div className="demo-note">
                  <Info size={17} />
                  <p>
                    <strong>A transparent starting point.</strong> This
                    prototype uses example allowances and aircraft details.{" "}
                    <button onClick={() => setModal("methodology")}>
                      See our approach
                    </button>
                  </p>
                </div>
              </aside>
              <ConnectionResult
                itinerary={itinerary}
                profile={profile}
                onCompare={() => setModal("compare")}
                onSave={saveTrip}
                onMethodology={() => setModal("methodology")}
                isSaved={isSaved}
              />
            </div>
            <section className="watch-banner">
              <div className="watch-graphic">
                <Bell size={27} />
                <span />
              </div>
              <div>
                <span className="eyebrow">PLANS CHANGE. YOUR NEEDS DON’T.</span>
                <h2>The right flight today. What about tomorrow?</h2>
                <p>
                  Save your trip and explore how an aircraft change could affect
                  your accessibility needs.
                </p>
              </div>
              <button className="button secondary" onClick={saveTrip}>
                {isSaved ? "View saved trip" : "Save this trip"}
                <Bookmark size={16} />
              </button>
              <span className="watch-footnote">
                Aircraft-change preview · Live monitoring is not connected
              </span>
            </section>
          </>
        ) : (
          <>
            <section className="saved-hero">
              <button
                className="text-button"
                onClick={() => setPage("planner")}
              >
                <ArrowLeft size={16} /> Back to planner
              </button>
              <div className="eyebrow">YOUR PLANS, ALL IN ONE PLACE</div>
              <h1>
                A little peace <em>of mind.</em>
              </h1>
              <p>
                Your saved journeys, with your accessibility needs along for the
                ride.
              </p>
            </section>
            <div className="saved-title">
              <h2>
                Saved trips <span>{trips.length}</span>
              </h2>
              <button
                className="button primary"
                onClick={() => setPage("planner")}
              >
                <Plus size={17} /> Plan a trip
              </button>
            </div>
            <div className="info-callout saved-info">
              <Info size={20} />
              <p>
                Trips stay in this browser with the profile used to assess them.
                Aircraft-change previews are simulated; live monitoring and
                notifications are not connected.
              </p>
            </div>
            {trips.length === 0 ? (
              <div className="empty-state">
                <span>
                  <Bookmark size={34} />
                </span>
                <h2>Your next adventure starts here.</h2>
                <p>
                  Check a connection, then save your trip to keep your
                  accessibility assessment close.
                </p>
                <button
                  className="button primary"
                  onClick={() => setPage("planner")}
                >
                  Check a connection <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <div className="saved-trips">
                {trips.map((trip) => {
                  const assessment = assessConnection(
                    trip.itinerary,
                    trip.profile,
                  );
                  const impacts = trip.previousAircraft
                    ? assessAircraftChange(
                        trip.previousAircraft,
                        trip.itinerary.aircraft,
                        trip.profile,
                      )
                    : [];
                  return (
                    <article className="saved-trip" key={trip.id}>
                      <div className="saved-trip-header">
                        <div>
                          <span className="eyebrow">
                            {dateLabel(trip.itinerary.date)} · DEMO ITINERARY
                          </span>
                          <h3>
                            {trip.itinerary.origin}
                            <ArrowRight size={19} />
                            {trip.itinerary.connection}
                            <ArrowRight size={19} />
                            {trip.itinerary.destination}
                          </h3>
                          <p>
                            {airportCity(trip.itinerary.origin)} to{" "}
                            {airportCity(trip.itinerary.destination)}
                          </p>
                        </div>
                        <button
                          className="icon-button delete-button"
                          aria-label={`Delete saved trip ${routeLabel(trip.itinerary)}`}
                          onClick={() => {
                            if (
                              persistTrips(
                                trips.filter((item) => item.id !== trip.id),
                              )
                            )
                              notify("Trip removed from this browser.");
                          }}
                        >
                          <Trash2 size={19} />
                        </button>
                      </div>
                      <div className="saved-trip-details">
                        <span>
                          <Clock3 size={18} />
                          <strong>
                            {formatMinutes(trip.itinerary.layoverMinutes)}
                          </strong>{" "}
                          connection
                        </span>
                        <span>
                          <Plane size={18} />
                          {AIRCRAFT[trip.itinerary.aircraft].name}
                        </span>
                        <span className={`status-tag ${assessment.status}`}>
                          {assessment.status === "comfortable" ? (
                            <Check size={14} />
                          ) : (
                            <TriangleAlert size={14} />
                          )}
                          {assessment.status === "comfortable"
                            ? "More breathing room"
                            : assessment.status === "tight"
                              ? "Tight connection"
                              : "High risk"}
                        </span>
                      </div>
                      {trip.previousAircraft && (
                        <div className="saved-change">
                          <div>
                            <Bell size={19} />
                            <strong>
                              Simulated change:{" "}
                              {AIRCRAFT[trip.previousAircraft].name} →{" "}
                              {AIRCRAFT[trip.itinerary.aircraft].name}
                            </strong>
                          </div>
                          <p>
                            {impacts
                              .filter((impact) => impact.severity === "warning")
                              .map((impact) => impact.title)
                              .join(" · ") ||
                              "Review aircraft details for your saved accessibility needs."}
                          </p>
                          <span>Example update · Not an airline alert</span>
                        </div>
                      )}
                      <div className="saved-needs">
                        {NEEDS.filter((need) => trip.profile[need.key]).map(
                          (need) => (
                            <span key={need.key}>{need.short}</span>
                          ),
                        )}
                      </div>
                      <div className="saved-actions">
                        <button
                          className="button secondary"
                          onClick={() => loadTrip(trip)}
                        >
                          Open assessment <ArrowUpRight size={16} />
                        </button>
                        <button
                          className="button primary"
                          onClick={() => setChangeTrip(trip)}
                        >
                          <Bell size={16} /> Preview aircraft change
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
        <footer className="site-footer">
          <a
            className="footer-brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setPage("planner");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <Plane size={16} />
            AccessFlight<span>Travel is for you, too.</span>
          </a>
          <div>
            <button onClick={() => setModal("methodology")}>
              Our approach & sources
            </button>
            <span>·</span>
            <button onClick={() => setModal("clear")}>Clear my data</button>
            <span className="footer-demo">Built with care. Prototype v0.1</span>
          </div>
        </footer>
      </main>
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={19} />
            <span>{toast}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </>
        )}
      </div>
      {modal === "profile" && (
        <Modal
          title="Make room for your needs."
          subtitle={
            usingSavedProfile
              ? "You’re editing this trip’s saved profile. Saving also makes it your current profile for future planning."
              : "Choose what would make your journey work for you."
          }
          onClose={() => setModal(null)}
        >
          <ProfileEditor profile={profile} onSave={saveProfile} />
        </Modal>
      )}
      {modal === "methodology" && (
        <Modal
          title="A clearer picture, before you fly."
          subtitle="Our approach, its limits, and the guidance behind it."
          onClose={() => setModal(null)}
        >
          <Methodology />
        </Modal>
      )}
      {modal === "compare" && (
        <Modal
          title="Give your connection some room."
          subtitle="Compare time between flights, with your needs in mind."
          onClose={() => setModal(null)}
          wide
        >
          <Comparison
            itinerary={itinerary}
            profile={profile}
            onSelect={chooseConnection}
          />
        </Modal>
      )}
      {modal === "clear" && (
        <Modal
          title="Clear your saved information?"
          onClose={() => setModal(null)}
        >
          <p className="clear-copy">
            This removes your accessibility profile and all saved trips from
            this browser. You’ll return to the example profile.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setModal(null)}>
              Keep my data
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (!clearLocalData()) {
                  notify(
                    "Browser storage could not be cleared. Try clearing site data in your browser settings.",
                  );
                  return;
                }
                setTrips([]);
                setProfile({ ...DEFAULT_PROFILE });
                setDefaultProfile({ ...DEFAULT_PROFILE });
                setUsingSavedProfile(false);
                setModal(null);
                notify("Your saved profile and trips have been cleared.");
              }}
            >
              Clear profile and trips <Trash2 size={16} />
            </button>
          </div>
        </Modal>
      )}
      {changeTrip && (
        <Modal
          title="When the aircraft changes."
          subtitle={`${routeLabel(changeTrip.itinerary)} · Your needs stay part of the plan.`}
          onClose={() => setChangeTrip(null)}
        >
          <AircraftChange trip={changeTrip} onApply={applyAircraft} />
        </Modal>
      )}
    </>
  );
}

export default App;
