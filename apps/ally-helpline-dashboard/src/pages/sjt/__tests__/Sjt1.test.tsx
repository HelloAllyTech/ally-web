import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { Sjt1 } from "../Sjt1";
import { ITEMS, OptionId } from "../sjtData";
import { STORAGE_KEY } from "../useSjtProgress";

/**
 * Finds an option by the words on it. Not by accessible name: once ranked, the
 * button's name gains its rank label ("… Best"), which is the point of that
 * label but makes a name query brittle.
 */
const optionButton = (itemIndex: number, id: OptionId) =>
  screen.getByText(ITEMS[itemIndex].options[id].text).closest("button") as HTMLButtonElement;

/** Ranks the four options in the order the panel key lists them: a perfect run. */
const answerPerfectly = async (user: ReturnType<typeof userEvent.setup>, itemIndex: number) => {
  for (const id of ITEMS[itemIndex].key) {
    await user.click(optionButton(itemIndex, id));
  }
};

const advance = async (user: ReturnType<typeof userEvent.setup>, label: RegExp) => {
  await user.click(screen.getByRole("button", { name: label }));
};

/**
 * Seeds a finished, perfectly-ranked run straight into storage.
 *
 * Reaching the results screen by hand costs forty clicks and a re-render per
 * scenario, which is slow enough to time out when all three projects' suites
 * run at once. The click-through journey has its own test below; everything
 * that only cares about the results screen starts here instead.
 */
const seedPerfectRun = () => {
  const answers = Object.fromEntries(ITEMS.map(item => [item.id, item.key]));
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ stage: "results", index: ITEMS.length - 1, answers }),
  );
};

/**
 * `delay: null` drops userEvent's inter-event timer. The tests that walk all
 * ten scenarios fire ~40 clicks, and the default delay makes them slow enough
 * to time out when all three projects' suites run concurrently.
 */
const setup = () => userEvent.setup({ delay: null });

describe("Sjt1", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens on the intro, naming all four areas of practice", () => {
    render(<Sjt1 />);

    // The title breaks across two lines, so there is no space in its text content.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Everyday\s*conversations/);
    [
      "Validate & normalise",
      "Build coping & autonomy",
      "Boundaries & referral",
      "Language & modelling",
    ].forEach(label => expect(screen.getByText(label)).toBeInTheDocument());
  });

  it("titles the document and keeps the unvalidated-prototype caveat visible", () => {
    render(<Sjt1 />);

    expect(document.title).toBe("Everyday conversations | Ally");
    expect(screen.getByText(/not validated/)).toBeInTheDocument();
    expect(screen.getByText(/goes to your DSL today/)).toBeInTheDocument();
  });

  it("blocks the first scenario until all four options are ranked", async () => {
    const user = setup();
    render(<Sjt1 />);
    await advance(user, /start the first scenario/i);

    const nextButton = screen.getByRole("button", { name: /next scenario/i });
    expect(nextButton).toBeDisabled();
    expect(screen.getByText("4 left")).toBeInTheDocument();

    await answerPerfectly(user, 0);

    expect(screen.getByText("0 left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next scenario/i })).toBeEnabled();
  });

  it("labels each tap with its rank, and untaps to close the gap behind it", async () => {
    const user = setup();
    render(<Sjt1 />);
    await advance(user, /start the first scenario/i);

    const optionFor = (id: OptionId) => optionButton(0, id);

    await user.click(optionFor("a"));
    await user.click(optionFor("b"));
    expect(within(optionFor("a")).getByText("Best")).toBeInTheDocument();
    expect(within(optionFor("b")).getByText("2nd")).toBeInTheDocument();
    expect(optionFor("a")).toHaveAttribute("aria-pressed", "true");

    // Removing the first pick promotes the second rather than leaving a hole.
    await user.click(optionFor("a"));
    expect(optionFor("a")).toHaveAttribute("aria-pressed", "false");
    expect(within(optionFor("b")).getByText("Best")).toBeInTheDocument();
  });

  it("clears the whole order on Clear order", async () => {
    const user = setup();
    render(<Sjt1 />);
    await advance(user, /start the first scenario/i);
    await answerPerfectly(user, 0);

    await advance(user, /clear order/i);

    expect(screen.getByText("4 left")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next scenario/i })).toBeDisabled();
  });

  it("keeps a ranking when stepping back to the previous scenario", async () => {
    const user = setup();
    render(<Sjt1 />);
    await advance(user, /start the first scenario/i);
    await answerPerfectly(user, 0);
    await advance(user, /next scenario/i);
    await answerPerfectly(user, 1);

    await advance(user, /previous/i);

    expect(screen.getByText(ITEMS[0].scenario)).toBeInTheDocument();
    expect(screen.getByText("0 left")).toBeInTheDocument();
  });

  it("scores a run that matches the panel exactly at 100%", () => {
    seedPerfectRun();

    render(<Sjt1 />);

    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Closely aligned")).toBeInTheDocument();
  });

  it("offers the reasoning for every option, not just the winner", async () => {
    const user = setup();
    seedPerfectRun();
    render(<Sjt1 />);

    // Each scenario collapses to an "Open" toggle so ten breakdowns don't bury
    // the summary above them.
    const toggles = screen.getAllByRole("button", { name: /Open$/ });
    expect(toggles).toHaveLength(ITEMS.length);

    await user.click(toggles[0]);

    const item = ITEMS[0];
    item.key.forEach(id => {
      expect(screen.getByText(item.options[id].why)).toBeInTheDocument();
    });
  });

  it("walks all ten scenarios through to the results screen", async () => {
    const user = setup();
    render(<Sjt1 />);
    await advance(user, /start the first scenario/i);

    for (let index = 0; index < ITEMS.length; index += 1) {
      expect(screen.getByText(ITEMS[index].scenario)).toBeInTheDocument();
      expect(screen.getByText(`${index + 1} / ${ITEMS.length}`)).toBeInTheDocument();
      await answerPerfectly(user, index);
      await advance(user, index === ITEMS.length - 1 ? /see my results/i : /next scenario/i);
    }

    expect(screen.getByText("Your results · 10 scenarios")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
    // Forty clicks and ten re-renders: slower than the default budget allows
    // when the whole monorepo's suites run at once.
  }, 30_000);

  it("resumes a half-finished run after a reload, and Start again wipes it", async () => {
    const user = setup();
    const first = render(<Sjt1 />);
    await advance(user, /start the first scenario/i);
    await answerPerfectly(user, 0);
    await advance(user, /next scenario/i);
    await answerPerfectly(user, 1);

    first.unmount();
    render(<Sjt1 />);

    expect(screen.getByText(ITEMS[1].scenario)).toBeInTheDocument();
    expect(screen.getByText("0 left")).toBeInTheDocument();
    expect(screen.getByText(`2 / ${ITEMS.length}`)).toBeInTheDocument();
  });

  it("returns to the intro and forgets the run on Start again", async () => {
    const user = setup();
    seedPerfectRun();
    render(<Sjt1 />);

    await advance(user, /start again/i);

    expect(screen.getByRole("button", { name: /start the first scenario/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("survives a corrupt stored run instead of blanking the page", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not json");

    render(<Sjt1 />);

    expect(screen.getByRole("button", { name: /start the first scenario/i })).toBeInTheDocument();
  });
});
