import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function editProfile(page: Page) {
  await page.getByRole("button", { name: "Edit my profile" }).click();
  return page.getByRole("dialog", { name: "Make room for your needs." });
}

async function useIndependentProfile(page: Page) {
  const dialog = await editProfile(page);
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    await checkbox.uncheck();
  }
  await dialog.getByLabel("My walking pace").selectOption("standard");
  await dialog
    .getByRole("button", { name: "Save my accessibility profile" })
    .click();
  await expect(dialog).not.toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport + 1);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport + 1);
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible()) {
    const dialogDimensions = await dialog.evaluate((element) => ({
      width: element.clientWidth,
      content: element.scrollWidth,
    }));
    expect(dialogDimensions.content).toBeLessThanOrEqual(
      dialogDimensions.width + 1,
    );
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
});

test("sample itinerary explains the connection risk and its planning assumptions", async ({
  page,
}) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "A little more room to travel.",
  );
  const result = page.getByRole("article", { name: "Connection assessment" });
  await expect(
    result.getByRole("heading", { name: "Your connection at ORD" }),
  ).toBeVisible();
  await expect(result.getByText("High risk", { exact: true })).toBeVisible();
  await expect(page.getByTestId("connection-duration")).toHaveText("58m");
  await expect(page.getByTestId("estimated-range")).toHaveText("71–94 min");
  await expect(
    result.getByText("Illustrative estimate · Not a guarantee"),
  ).toBeVisible();

  const breakdown = result.getByRole("button", { name: "See breakdown" });
  await breakdown.click();
  await expect(
    result.getByRole("button", { name: "Hide breakdown" }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(
    result.getByText("Recommended with a planning buffer"),
  ).toBeVisible();
  await result.getByRole("button", { name: "How estimates work" }).click();
  const dialog = page.getByRole("dialog", {
    name: "A clearer picture, before you fly.",
  });
  await expect(
    dialog.getByText("This is an interactive prototype."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("link", { name: /Wheelchair and guided assistance/ }),
  ).toHaveAttribute("href", /^https:\/\/www\.transportation\.gov\//);
});

test("changing the accessibility profile recomputes the assessment and persists after reload", async ({
  page,
}) => {
  const before = (await page.getByTestId("estimated-range").innerText())
    .match(/\d+/g)!
    .map(Number);
  await useIndependentProfile(page);
  const after = (await page.getByTestId("estimated-range").innerText())
    .match(/\d+/g)!
    .map(Number);
  expect(after[0]).toBeLessThan(before[0]);
  expect(after[1]).toBeLessThan(before[1]);
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Connection assessment" })
      .getByText("High risk", { exact: true }),
  ).not.toBeVisible();

  await page.reload();
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).toBeVisible();
  const dialog = await editProfile(page);
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    await expect(checkbox).not.toBeChecked();
  }
  await expect(dialog.getByLabel("My walking pace")).toHaveValue("standard");
});

test("custom connection updates risk and invalid routes leave the existing assessment intact", async ({
  page,
}) => {
  await page
    .getByRole("spinbutton", { name: "Connection time in minutes" })
    .fill("240");
  await page.getByRole("button", { name: "Check my connection" }).click();
  await expect(page.getByTestId("connection-duration")).toHaveText("4h");
  const result = page.getByRole("article", { name: "Connection assessment" });
  await expect(
    result.getByText("More breathing room", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "Your journey, through your lens" })
      .locator("..")
      .locator(".."),
  ).toBeFocused();

  await page.getByLabel("Connecting at").selectOption("PIT");
  await page.getByRole("button", { name: "Check my connection" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Choose a different airport for each part of your journey.",
  );
  await expect(page.getByTestId("connection-duration")).toHaveText("4h");
  await expect(
    result.getByRole("heading", { name: "Your connection at ORD" }),
  ).toBeVisible();
});

test("comparison applies the suggested connection to the result and editable itinerary", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Compare options" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Give your connection some room.",
  });
  await expect(
    dialog.getByText(/planning scenarios, not available flights or fares/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Use this connection" }),
  ).toHaveCount(2);
  const suggested = dialog
    .getByText("Our suggested fit", { exact: true })
    .locator("..")
    .locator("..");
  const suggestedDuration = await suggested
    .getByRole("heading", { level: 3 })
    .evaluate((element) => element.firstChild?.textContent?.trim());
  await suggested.getByRole("button", { name: "Use this connection" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId("connection-duration")).toHaveText(
    suggestedDuration!,
  );
  await expect(
    page
      .getByRole("article", { name: "Connection assessment" })
      .getByText("More breathing room", { exact: true }),
  ).toBeVisible();
  expect(
    Number(
      await page
        .getByRole("spinbutton", { name: "Connection time in minutes" })
        .inputValue(),
    ),
  ).toBeGreaterThan(58);
});

test("saved trips retain their profile and a simulated aircraft change across reloads", async ({
  page,
}) => {
  const profile = await editProfile(page);
  await profile.getByRole("checkbox", { name: /^My own wheelchair/ }).check();
  await profile
    .getByRole("checkbox", { name: /^Accessible restroom stops/ })
    .check();
  await profile
    .getByRole("button", { name: "Save my accessibility profile" })
    .click();
  await page
    .getByRole("article", { name: "Connection assessment" })
    .getByRole("button", { name: "Save this trip" })
    .click();
  await useIndependentProfile(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Saved trips/ })
    .click();
  const trip = page.getByRole("article");
  await expect(trip).toHaveCount(1);
  await expect(
    trip.getByText("Personal wheelchair", { exact: true }),
  ).toBeVisible();
  await trip.getByRole("button", { name: "Preview aircraft change" }).click();
  const dialog = page.getByRole("dialog", {
    name: "When the aircraft changes.",
  });
  await dialog.getByLabel("Simulate a change to").selectOption("CRJ900");
  await expect(
    dialog.getByText(/This is a simulation\. We have not received an update/),
  ).toBeVisible();
  await expect(
    dialog.getByText(
      "This preview uses the accessibility profile saved with this trip.",
    ),
  ).toBeVisible();
  await expect(
    dialog.getByText("Your wheelchair may need a new fit check", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/No specific conflict identified/),
  ).not.toBeVisible();
  await dialog
    .getByRole("button", { name: "Apply simulated change to saved trip" })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(trip.getByText(/Simulated change:/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: "Plan a trip", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Aircraft accessibility" }),
  ).toContainText(/CRJ/);
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).toBeVisible();

  await page.reload();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Saved trips/ })
    .click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await expect(
    page.getByRole("article").getByText(/Simulated change:/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open assessment" }).click();
  await expect(
    page.getByRole("region", { name: "Aircraft accessibility" }),
  ).toContainText(/CRJ/);
  await expect(
    page.getByText("Personal wheelchair", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("SAVED TRIP PROFILE", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my current profile" }).click();
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("SAVED TRIP PROFILE", { exact: true }),
  ).not.toBeVisible();
});

test("wheelchair assistance alone still highlights onboard equipment and transfers", async ({
  page,
}) => {
  const dialog = await editProfile(page);
  for (const checkbox of await dialog.getByRole("checkbox").all()) {
    await checkbox.uncheck();
  }
  await dialog
    .getByRole("checkbox", { name: /^Wheelchair assistance/ })
    .check();
  await dialog
    .getByRole("button", { name: "Save my accessibility profile" })
    .click();
  const aircraft = page.getByRole("region", { name: "Aircraft accessibility" });
  await expect(
    aircraft.getByText("Onboard wheelchair & transfers", { exact: true }),
  ).toBeVisible();
  await expect(
    aircraft.getByText("Confirm equipment and assistance", { exact: true }),
  ).toBeVisible();
  await expect(
    aircraft.getByText("Accessible lavatory", { exact: true }),
  ).not.toBeVisible();
  await expect(
    aircraft.getByText("Wheelchair storage", { exact: true }),
  ).not.toBeVisible();
});

test("clearing local data requires the explicit dialog action and survives reload", async ({
  page,
}) => {
  await useIndependentProfile(page);
  await page
    .getByRole("article", { name: "Connection assessment" })
    .getByRole("button", { name: "Save this trip" })
    .click();
  await page.getByRole("button", { name: "Clear my data" }).click();
  const dialog = page.getByRole("dialog", {
    name: "Clear your saved information?",
  });
  await dialog.getByRole("button", { name: "Keep my data" }).click();
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear my data" }).click();
  await dialog.getByRole("button", { name: "Clear profile and trips" }).click();
  await page.reload();
  await expect(
    page.getByText("Independent travel", { exact: true }),
  ).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("button", { name: /^Saved trips/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your next adventure starts here." }),
  ).toBeVisible();
});

test("profile dialog supports keyboard focus containment, Escape, and focus restoration", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to main content" }),
  ).toBeFocused();
  const opener = page.getByRole("button", { name: "My accessibility profile" });
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", {
    name: "Make room for your needs.",
  });
  const close = dialog.getByRole("button", { name: "Close dialog" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    dialog.getByRole("button", { name: "Save my accessibility profile" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

for (const width of [390, 320]) {
  test(`planner and dialogs fit a ${width}px mobile viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole("button", { name: "My accessibility profile" }),
    ).toBeVisible();
    await expect(page.getByTestId("connection-duration")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const profile = await editProfile(page);
    await expectNoHorizontalOverflow(page);
    await profile.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "Compare options" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
