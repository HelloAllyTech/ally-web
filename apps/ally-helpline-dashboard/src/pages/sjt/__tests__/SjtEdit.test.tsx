import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sjt1 } from "../Sjt1";
import { SjtEdit } from "../SjtEdit";
import { COPY_PATHS, DEFAULT_COPY } from "../sjtCopy";
import { ITEMS } from "../sjtData";
import { COPY_STORAGE_KEY, parseOverrides } from "../useSjtCopy";

/** An editable line, by the name a reviewer would look for it under. */
const field = (name: string) => screen.getByRole("textbox", { name });

/**
 * Rewrites one line the way the page does it: type into the text where it
 * sits, then click away. The field is uncontrolled while focused, so the
 * commit happens on blur.
 */
const rewrite = (name: string, value: string) => {
  const target = field(name);
  target.textContent = value;
  fireEvent.blur(target);
};

const stored = () => parseOverrides(window.localStorage.getItem(COPY_STORAGE_KEY));

const setup = () => userEvent.setup({ delay: null });

describe("SjtEdit", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("opens on the intro screen with the page's own words as fields", () => {
    render(<SjtEdit />);

    expect(field("Intro screen · lede")).toHaveTextContent(DEFAULT_COPY.intro.lede);
    expect(field("Area VN · label")).toHaveTextContent("Validate & normalise");
    expect(screen.getByRole("button", { name: "No changes" })).toBeInTheDocument();
    // The self-check's own controls must not act while their labels are text:
    // clicking "Start the first scenario" to edit it can't also start the run.
    expect(screen.queryByRole("button", { name: /start the first scenario/i })).toBeNull();
    expect(field("Intro screen · start label")).toHaveTextContent("Start the first scenario");
  });

  it("keeps an edit, counts it, and hands it to /SJT1 in the same browser", () => {
    const edit = render(<SjtEdit />);

    rewrite("Intro screen · lede", "Thirty seconds at the door is where this happens.");

    expect(stored()).toEqual({
      "intro.lede": "Thirty seconds at the door is where this happens.",
    });
    expect(screen.getByRole("button", { name: "1 change" })).toBeInTheDocument();

    edit.unmount();
    render(<Sjt1 />);

    expect(
      screen.getByText("Thirty seconds at the door is where this happens."),
    ).toBeInTheDocument();
    expect(screen.queryByText(DEFAULT_COPY.intro.lede)).toBeNull();
  });

  it("reaches the reasoning behind every option, which is the point of the page", async () => {
    const user = setup();
    render(<SjtEdit />);

    await user.click(screen.getByRole("button", { name: "Scenario" }));

    const item = ITEMS[0];
    expect(field(`Scenario ${item.id} · scenario`)).toHaveTextContent(item.scenario);
    // Reasoning is only ever read on the results screen, but it belongs to the
    // option, so the editor offers it there too — on the same card as the words
    // it defends.
    await user.click(screen.getByRole("button", { name: "Results" }));
    expect(field(`Scenario ${item.id} · option b reasoning`.replace("b", "B"))).toHaveTextContent(
      item.options.b.why,
    );

    rewrite(`Scenario ${item.id} · option B reasoning`, "Names the feeling, then narrows it.");
    expect(stored()).toEqual({
      [`items.${item.id}.options.b.why`]: "Names the feeling, then narrows it.",
    });
  });

  it("puts the previous wording back when a line is emptied", () => {
    render(<SjtEdit />);

    rewrite("Intro screen · start label", "   ");

    expect(stored()).toEqual({});
    expect(field("Intro screen · start label")).toHaveTextContent("Start the first scenario");
  });

  it("drops an edit that is just the committed wording retyped", () => {
    render(<SjtEdit />);

    rewrite("Intro screen · start label", DEFAULT_COPY.intro.startLabel);

    expect(stored()).toEqual({});
    expect(screen.getByRole("button", { name: "No changes" })).toBeInTheDocument();
  });

  it("flags a line whose {placeholder} an edit removed", async () => {
    const user = setup();
    render(<SjtEdit />);
    await user.click(screen.getByRole("button", { name: "Scenario" }));

    rewrite("Scenario screen · remaining", "still some to rank");

    expect(screen.getByText("1 line is missing a {placeholder}")).toBeInTheDocument();
    expect(field("Scenario screen · remaining")).toHaveClass("drift");
  });

  it("lists what has changed and reverts one line without touching the rest", async () => {
    const user = setup();
    render(<SjtEdit />);

    rewrite("Intro screen · lede", "First edit.");
    rewrite("Intro screen · start label", "Begin");

    await user.click(screen.getByRole("button", { name: "2 changes" }));
    const listed = screen.getByText("Intro screen · lede").closest("div") as HTMLElement;
    await user.click(within(listed).getByRole("button", { name: "Revert" }));

    expect(stored()).toEqual({ "intro.startLabel": "Begin" });
    expect(field("Intro screen · lede")).toHaveTextContent(DEFAULT_COPY.intro.lede);
  });

  it("asks before discarding a whole pass, and keeps it if the answer is no", async () => {
    const user = setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<SjtEdit />);
    rewrite("Intro screen · lede", "Kept for now.");

    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(confirm).toHaveBeenCalled();
    expect(stored()).toEqual({ "intro.lede": "Kept for now." });

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(stored()).toEqual({});
    expect(window.localStorage.getItem(COPY_STORAGE_KEY)).toBeNull();

    confirm.mockRestore();
  });

  it("loads a pass exported from another browser, and says what it dropped", async () => {
    const user = setup();
    render(<SjtEdit />);

    await user.click(screen.getByRole("button", { name: "Load a file" }));
    // Pasted rather than typed: userEvent reads "{" as a key descriptor, and a
    // reviewer pastes a file here anyway.
    fireEvent.change(screen.getByRole("textbox", { name: "Exported changes to load" }), {
      target: {
        value: JSON.stringify({
          version: 1,
          changes: { "intro.lede": "From the panel.", "intro.gone": "No such line." },
        }),
      },
    });
    await user.click(screen.getByRole("button", { name: /replace changes with this/i }));

    expect(stored()).toEqual({ "intro.lede": "From the panel." });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loaded 1 of 2 changes — the rest name lines this page no longer has.",
    );
  });

  it("leaves no line of the page unreachable", async () => {
    // The promise of the route is *every* word, so this walks the screens the
    // editor can show and checks the set of fields against the copy model. A
    // line that can only be reached by finishing a run, or that only appears
    // in a state the editor can't reproduce, has to be offered in the panel
    // instead — this is what catches one that isn't.
    const user = setup();
    const seen = new Set<string>();
    const collect = () =>
      document
        .querySelectorAll("[data-path]")
        .forEach(node => seen.add(node.getAttribute("data-path") as string));

    render(<SjtEdit />);
    collect();

    await user.click(screen.getByRole("button", { name: "Scenario" }));
    collect();

    // Unranked shows the counter and the tap-again hint; ranked shows the four
    // rank labels and the Clear control.
    await user.click(screen.getByRole("button", { name: "Ranked" }));
    collect();

    const which = screen.getByLabelText("Which");
    for (let position = 1; position < ITEMS.length; position += 1) {
      await user.selectOptions(which, String(position));
      collect();
    }

    await user.click(screen.getByRole("button", { name: "Results" }));
    collect();

    expect(COPY_PATHS.filter(path => !seen.has(path))).toEqual([]);
  }, 30_000);

  it("says plainly that nothing here changes the page anyone else reads", () => {
    render(<SjtEdit />);

    expect(screen.getByText(/saved in this browser only/i)).toBeInTheDocument();
    expect(screen.getByText(/do not change \/SJT1 for anyone else/i)).toBeInTheDocument();
  });
});
