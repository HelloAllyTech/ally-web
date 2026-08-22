import { FC } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { BugFindingSeverity, BugFindingSource } from "@types";

import { hasFilterParams, useBugHunterUrlState } from "../bugHunterUrlState";

/**
 * A probe that renders the parsed state and offers a button per writer, plus a
 * Back button — the only honest way to assert that opening a bug pushes history
 * while typing in the search box replaces it.
 */
const Probe: FC = () => {
  const state = useBugHunterUrlState();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <p data-testid="search-string">{location.search}</p>
      <p data-testid="parsed">
        {JSON.stringify({
          bug: state.bug,
          bucket: state.bucket,
          search: state.search,
          run: state.run,
          repo: state.repo,
          severity: state.severity,
          source: state.source,
          density: state.density,
        })}
      </p>
      <p data-testid="has-filters">{String(hasFilterParams(state))}</p>

      <button onClick={() => state.setBug("bug-1")}>open bug</button>
      <button onClick={() => state.setSearch("terms")}>search terms</button>
      <button onClick={() => state.setBucket("needs_you")}>bucket needs_you</button>
      <button onClick={() => state.setBucket("all")}>bucket all</button>
      <button onClick={() => state.setRun("run-a")}>scope run-a</button>
      <button onClick={() => state.setRun(null)}>scope none</button>
      <button onClick={() => state.setSeverity(BugFindingSeverity.HIGH)}>severity high</button>
      <button onClick={() => state.setDensity("compact")}>compact</button>
      <button onClick={() => state.setDensity("comfortable")}>comfortable</button>
      <button onClick={() => state.clearFilters()}>clear filters</button>
      <button onClick={() => navigate(-1)}>back</button>
    </div>
  );
};

const mount = (url = "/") =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe />
    </MemoryRouter>,
  );

const parsed = () => JSON.parse(screen.getByTestId("parsed").textContent ?? "{}");
const search = () => screen.getByTestId("search-string").textContent;

describe("reading the query string", () => {
  it("defaults everything when the address bar is bare", () => {
    mount();
    expect(parsed()).toEqual({
      bug: null,
      bucket: "all",
      run: null,
      search: "",
      repo: "all",
      severity: "all",
      source: "all",
      density: "comfortable",
    });
    expect(screen.getByTestId("has-filters").textContent).toBe("false");
  });

  it("reads a whole view out of a link", () => {
    mount(
      `/?bug=abc&bucket=problem&q=terms&run=run-a&repo=ally-be&sev=${BugFindingSeverity.HIGH}&src=${BugFindingSource.CODE_REVIEW}&density=compact`,
    );
    expect(parsed()).toEqual({
      bug: "abc",
      bucket: "problem",
      search: "terms",
      run: "run-a",
      repo: "ally-be",
      severity: BugFindingSeverity.HIGH,
      source: BugFindingSource.CODE_REVIEW,
      density: "compact",
    });
    expect(screen.getByTestId("has-filters").textContent).toBe("true");
  });

  /**
   * The URL is untrusted input. A hand-typed `?sev=critical` must fall back to
   * "all" rather than reaching a filter that then matches nothing and looks
   * broken — and the page is not the place to complain about a mistyped link.
   */
  it("falls back to the default for a value that isn't in the enum", () => {
    mount("/?bucket=urgent&sev=critical&src=telepathy&density=cosy");
    const state = parsed();
    expect(state.bucket).toBe("all");
    expect(state.severity).toBe("all");
    expect(state.source).toBe("all");
    expect(state.density).toBe("comfortable");
  });

  /**
   * Repo is deliberately unvalidated — the real set is whatever the loaded
   * findings mention, which the hook cannot see, and a repo matching nothing
   * already renders as an empty table with a "clear filters" button on it.
   */
  it("passes an unknown repo through rather than guessing", () => {
    mount("/?repo=ally-quantum");
    expect(parsed().repo).toBe("ally-quantum");
  });

  it("treats an empty q as no search", () => {
    mount("/?q=");
    expect(parsed().search).toBe("");
    expect(screen.getByTestId("has-filters").textContent).toBe("false");
  });
});

describe("writing the query string", () => {
  /**
   * A default view's URL stays `/bug-hunter`, so a bookmark of the page is not
   * silently a bookmark of one filter combination.
   */
  it("drops a key rather than writing its default", () => {
    mount();
    fireEvent.click(screen.getByText("bucket needs_you"));
    expect(search()).toBe("?bucket=needs_you");

    fireEvent.click(screen.getByText("bucket all"));
    expect(search()).toBe("");
  });

  it("writes density only when it isn't the default", () => {
    mount();
    fireEvent.click(screen.getByText("compact"));
    expect(search()).toBe("?density=compact");

    fireEvent.click(screen.getByText("comfortable"));
    expect(search()).toBe("");
  });

  /**
   * Back closes the drawer and lands you where you were — the behaviour anyone
   * who has used a mail client expects, and the reason this is worth doing at
   * the router rather than with a useState.
   */
  it("pushes history when a bug is opened, so Back closes the drawer", () => {
    mount("/?bucket=problem");
    fireEvent.click(screen.getByText("open bug"));
    expect(parsed().bug).toBe("bug-1");

    fireEvent.click(screen.getByText("back"));
    expect(parsed().bug).toBeNull();
    // And the filters that found it survive the trip back.
    expect(parsed().bucket).toBe("problem");
  });

  /**
   * A search box that pushed one entry per keystroke would make "aut" -> "auth"
   * cost four presses of Back to undo. Replacing means there is nothing behind
   * the first entry to go back to.
   */
  it("replaces history when the search changes", () => {
    mount();
    fireEvent.click(screen.getByText("search terms"));
    expect(search()).toBe("?q=terms");

    fireEvent.click(screen.getByText("back"));
    expect(search()).toBe("?q=terms");
  });

  it("clears the filters and nothing else", () => {
    mount(`/?bug=abc&bucket=problem&q=terms&repo=ally-be&sev=${BugFindingSeverity.HIGH}&density=compact`);
    fireEvent.click(screen.getByText("clear filters"));

    const state = parsed();
    expect(state.bucket).toBe("all");
    expect(state.search).toBe("");
    expect(state.repo).toBe("all");
    expect(state.severity).toBe("all");
    // The open bug and the density preference are not filters.
    expect(state.bug).toBe("abc");
    expect(state.density).toBe("compact");
  });

  /**
   * The run scope, which is not a filter over the loaded window like the rest
   * of them — it goes to the server and replaces the window. See
   * `BUG_HUNTER_PARAM.run` for why it has to.
   */
  it("scoping to a run clears every other filter in one write", () => {
    mount(`/?bucket=closed&q=terms&repo=ally-be&sev=${BugFindingSeverity.HIGH}&src=${BugFindingSource.LINT_ERROR}`);
    fireEvent.click(screen.getByText("scope run-a"));

    const state = parsed();
    expect(state.run).toBe("run-a");
    // "The 10 that sweep found" intersected with a leftover severity filter is
    // an answer to a question nobody asked, next to a log still saying 10.
    expect(state.bucket).toBe("all");
    expect(state.search).toBe("");
    expect(state.repo).toBe("all");
    expect(state.severity).toBe("all");
    expect(state.source).toBe("all");
    expect(search()).toBe("?run=run-a");
  });

  it("counts the run scope as a filter, and clearing the filters drops it", () => {
    mount("/?run=run-a");
    expect(screen.getByTestId("has-filters").textContent).toBe("true");

    fireEvent.click(screen.getByText("clear filters"));
    expect(parsed().run).toBeNull();
  });

  it("drops the scope back to every bug", () => {
    mount("/?run=run-a");
    fireEvent.click(screen.getByText("scope none"));

    expect(parsed().run).toBeNull();
    expect(search()).toBe("");
  });

  it("keeps unrelated params written by anything else on the page", () => {
    mount("/?tab=overview");
    fireEvent.click(screen.getByText("severity high"));
    expect(search()).toContain("tab=overview");
    expect(search()).toContain(`sev=${BugFindingSeverity.HIGH}`);
  });
});
