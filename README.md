# AccessFlight

**Before you book, explore whether a connection works for your needs.**

AccessFlight is a working prototype for personalized connection planning and aircraft-change impact previews. It combines an accessibility profile with a transparent time model, so travelers can compare connection scenarios and see aircraft-access questions separately.

## Run locally

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

Open the local URL shown by Vite, normally `http://127.0.0.1:5173`.

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution policy blocks `npm.ps1`.

```sh
npm run build
npm test
npm run test:e2e
```

The browser tests use locally installed Google Chrome. For an environment without Chrome, install it or change `channel` in `playwright.config.ts` and install the corresponding Playwright browser. `npm run preview` serves the production build locally.

## Try the core flow

1. Start with the illustrative PIT → ORD → LAX itinerary and its 58-minute connection.
2. Edit your profile: wheelchair assistance, step-free access, restroom stops, personal wheelchair retrieval, service-animal relief, guided assistance, and walking pace.
3. Review the modeled time range, expand the individual allowances, and check aircraft-access details.
4. Compare example connection options and select a longer connection.
5. Save the trip. In **Saved trips**, preview a simulated aircraft change and see how it affects the profile saved with that itinerary.

The itinerary form also accepts other supported airport combinations, travel dates, and connection durations. **Journey details** lets you set the terminal-change assumption, international-arrival processing, and onward demo aircraft. Airport selection does not automatically supply gate layouts or real flight schedules.

## What is implemented

- Profile-based connection estimates, with an inspectable breakdown and conservative planning buffer.
- Separate timing and aircraft suitability information; more connection time does not imply an aircraft is accessible.
- Editable scenarios and comparison of alternative connection durations.
- Saved itineraries with profile snapshots, retained in this browser across reloads.
- Simulated aircraft substitutions that explain potential consequences for the saved profile.
- Keyboard-accessible dialogs, responsive layouts, visible focus states, reduced-motion support, and an option to clear local data.
- Domain tests and end-to-end browser tests.

## Data and limits

**All flight details, aircraft configurations, and timing allowances are illustrative.** This application does not look up available flights, airport walking routes, actual assistance waits, aircraft dimensions, or airline-specific accessibility configurations. The displayed scenarios are not bookable flight offers or verified travel recommendations.

The estimate adds allowances for deplaning, assistance, wheelchair retrieval when selected, gate transfer, selected stops, international processing when selected, and boarding cutoff. The recommendation rounds the upper estimate up to the next five minutes and adds ten minutes. An itinerary below the lower estimate is marked high risk; one below the recommendation is tight. More breathing room is a timing assessment, not a guarantee or a complete accessibility clearance.

Aircraft model alone cannot establish wheelchair fit or lavatory access. Example configurations exist to demonstrate how an update could affect a traveler; exact airline configuration, device dimensions, and boarding equipment still require verification.

Saving a trip does **not** book travel, request assistance, start live monitoring, or send notifications. It stores the itinerary and profile in browser `localStorage`. There is no account, backend, or collection of names or medical records. If storage is unavailable, the interface reports that changes last only for the current session. **Clear my data** removes the stored profile and trips.

Opening a saved assessment clearly identifies its historical profile. **Use my current profile** restores your current planning preferences without changing the trip’s snapshot. Up to 30 trips can be saved; reaching the limit prompts you to remove a trip rather than silently overwriting one.

## Official guidance

The methodology dialog links to these sources. They support the product’s planning context; they do not supply or validate its example timing model.

- [U.S. DOT: Wheelchair and guided assistance](https://www.transportation.gov/individuals/aviation-consumer-protection/wheelchair-and-guided-assistance)
- [U.S. DOT: Airline Passengers with Disabilities Bill of Rights](https://www.transportation.gov/airconsumer/disabilitybillofrights)
- [U.S. DOT: Preparing for accessible air travel](https://www.transportation.gov/individuals/aviation-consumer-protection/general-travel-tips-persons-disabilities)

## Project layout

```text
src/App.tsx                  Planner, profile, saved trips, and change previews
src/styles.css               Responsive interface and accessibility styles
src/lib/assessment.ts        Typed model, example data, and assessment functions
src/lib/assessment.test.ts   Model behavior and boundary tests
src/lib/storage.ts           Validated local persistence
tests/accessflight.spec.ts   Browser integration tests
```

Built with React, TypeScript, Vite, and Lucide icons. No API keys are needed. Fonts have local fallbacks if Google Fonts is unavailable.

For live use, the next integration work is verified flight and aircraft updates, airline-specific configurations and chair dimensions, airport routing data, measured assistance reliability, and a backend for opt-in monitoring. Those inputs should preserve explicit unknowns and source timestamps in each assessment.
