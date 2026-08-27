import { FC } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { BugFindingSeverity, BugFindingSource, BugFindingStatus } from "@types";

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
          repos: state.repos,
          severities: state.severities,
          sources: state.sources,
          statuses: state.statuses,
          stages: state.stages,
          age: state.age,
          duplicatesOnly: state.duplicatesOnly,
          sort: state.sort,
          direction: state.direction,
          pageSize: state.pageSize,
          density: state.density,
        })}
      </p>
      <p data-testid="has-filters">{String(hasFilterParams(state))}</p>

      <button onClick={() => state.setBug("bug-1")}>open bug</button>
      <button onClick={() => state.setSearch("terms")}>search terms</button>
      <button onClick={() => state.setSearch("all")}>search all</button>
      <button onClick={() => state.setBucket("needs_you")}>bucket needs_you</button>
      <button onClick={() => state.setBucket("all")}>bucket all</button>
      <button onClick={() => state.setRun("run-a")}>scope run-a</button>
      <button onClick={() => state.setRun(null)}>scope none</button>
      <button onClick={() => state.setSeverities([BugFindingSeverity.HIGH])}>severity high</button>
      <button
        onClick={() => state.setSeverities([BugFindingSeverity.HIGH, BugFindingSeverity.MEDIUM])}
      >
        severity high+medium
      </button>
      <button onClick={() => state.setRepos(["ally-be", "ally-web"])}>two repos</button>
      <button onClick={() => state.setStatuses([BugFindingStatus.NEW])}>status new</button>
      <button onClick={() => state.setAge("stale")}>age stale</button>
      <button onClick={() => state.setDuplicatesOnly(true)}>duplicates on</button>
      <button onClick={() => state.setDuplicatesOnly(false)}>duplicates off</button>
      <button onClick={() => state.toggleSort("severity")}>sort severity</button>
      <button onClick={() => state.toggleSort("discovered")}>sort discovered</button>
      <button onClick={() => state.setPageSize(100)}>page size 100</button>
      <button onClick={() => state.setPageSize(20)}>page size 20</button>
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
      repos: [],
      severities: [],
      sources: [],
      statuses: [],
      stages: [],
      age: "all",
      duplicatesOnly: false,
      sort: "discovered",
      direction: "desc",
      pageSize: 20,
      density: "comfortable",
    });
    expect(screen.getByTestId("has-filters").textContent).toBe("false");
  });

  it("reads a whole view out of a link", () => {
    mount(
      `/?bug=abc&bucket=problem&q=terms&run=run-a&repo=ally-be,ally-web&sev=${BugFindingSeverity.HIGH}&src=${BugFindingSource.CODE_REVIEW}&status=${BugFindingStatus.NEW}&age=stale&dup=1&sort=severity&dir=asc&size=50&density=compact`,
    );
    expect(parsed()).toEqual({
      bug: "abc",
      bucket: "problem",
      search: "terms",
      run: "run-a",
      repos: ["ally-be", "ally-web"],
      severities: [BugFindingSeverity.HIGH],
      sources: [BugFindingSource.CODE_REVIEW],
      statuses: [BugFindingStatus.NEW],
      stages: [],
      age: "stale",
      duplicatesOnly: true,
      sort: "severity",
      direction: "asc",
      pageSize: 50,
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
    mount("/?bucket=urgent&sev=critical&src=telepathy&age=eternal&size=7&sort=vibes&density=cosy");
    const state = parsed();
    expect(state.bucket).toBe("all");
    expect(state.severities).toEqual([]);
    expect(state.sources).toEqual([]);
    expect(state.age).toBe("all");
    expect(state.pageSize).toBe(20);
    expect(state.sort).toBe("discovered");
    expect(state.density).toBe("comfortable");
  });

  /**
   * Half of a hand-edited multi-select is still the link somebody meant to
   * send, so validation is per value and not per param — throwing the whole
   * facet away because one segment is junk loses the part that parsed.
   */
  it("keeps the values it recognises in a partly-bad facet", () => {
    mount(`/?sev=${BugFindingSeverity.HIGH},critical,${BugFindingSeverity.LOW}`);
    expect(parsed().severities).toEqual([BugFindingSeverity.HIGH, BugFindingSeverity.LOW]);
  });

  it("de-duplicates a repeated facet value, so the filter count cannot double", () => {
    mount(`/?sev=${BugFindingSeverity.HIGH},${BugFindingSeverity.HIGH}`);
    expect(parsed().severities).toEqual([BugFindingSeverity.HIGH]);
  });

  /**
   * `?sort=title` with no `dir` should read A-Z, not newest-first — every
   * column has a direction it is normally read in.
   */
  it("falls back to the column's natural direction when dir is absent", () => {
    mount("/?sort=title");
    expect(parsed().direction).toBe("asc");
  });

  /**
   * Repo is deliberately unvalidated — the real set is whatever the loaded
   * findings mention, which the hook cannot see, and a repo matching nothing
   * already renders as an empty table with a "clear filters" button on it.
   */
  it("passes an unknown repo through rather than guessing", () => {
    mount("/?repo=ally-quantum");
    expect(parsed().repos).toEqual(["ally-quantum"]);
  });

  it("drops blank repo segments, which would match nothing at all", () => {
    mount("/?repo=,ally-be,");
    expect(parsed().repos).toEqual(["ally-be"]);
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

  /**
   * "all" is the sentinel `write` uses to drop a facet back to its default,
   * but the search box has no default worth defaulting to — a searcher typing
   * the word "all" means the literal text, not "clear the search."
   */
  it("keeps the literal search term 'all' instead of treating it as a clear sentinel", () => {
    mount();
    fireEvent.click(screen.getByText("search all"));
    expect(search()).toBe("?q=all");
    expect(parsed().search).toBe("all");
  });

  it("joins a multi-select facet with commas", () => {
    mount();
    fireEvent.click(screen.getByText("two repos"));
    expect(search()).toBe("?repo=ally-be%2Cally-web");
    expect(parsed().repos).toEqual(["ally-be", "ally-web"]);
  });

  it("writes the boolean facet as a flag, and drops it when off", () => {
    mount();
    fireEvent.click(screen.getByText("duplicates on"));
    expect(search()).toBe("?dup=1");

    fireEvent.click(screen.getByText("duplicates off"));
    expect(search()).toBe("");
  });

  /**
   * Sort is in the URL for the same reason the filters are: "the oldest bugs
   * nobody has touched" is a sort plus a filter, and a link that carried only
   * the filter handed the recipient the same rows in a different order.
   */
  it("carries the sort, and drops it again at the default", () => {
    mount();
    fireEvent.click(screen.getByText("sort severity"));
    expect(search()).toBe("?sort=severity&dir=desc");
    expect(parsed()).toMatchObject({ sort: "severity", direction: "desc" });

    // Same column again flips the direction rather than picking a new one.
    fireEvent.click(screen.getByText("sort severity"));
    expect(parsed().direction).toBe("asc");

    // Back to newest-first, which is the default, so both keys go.
    fireEvent.click(screen.getByText("sort discovered"));
    expect(search()).toBe("");
  });

  it("writes the page size only when it isn't the default", () => {
    mount();
    fireEvent.click(screen.getByText("page size 100"));
    expect(search()).toBe("?size=100");

    fireEvent.click(screen.getByText("page size 20"));
    expect(search()).toBe("");
  });

  it("clears the filters and nothing else", () => {
    mount(
      `/?bug=abc&bucket=problem&q=terms&repo=ally-be&sev=${BugFindingSeverity.HIGH}&age=stale&dup=1&sort=title&dir=asc&density=compact`,
    );
    fireEvent.click(screen.getByText("clear filters"));

    const state = parsed();
    expect(state.bucket).toBe("all");
    expect(state.search).toBe("");
    expect(state.repos).toEqual([]);
    expect(state.severities).toEqual([]);
    expect(state.age).toBe("all");
    expect(state.duplicatesOnly).toBe(false);
    // The open bug, the sort and the density preference are not filters —
    // none of them changes which bugs are on the page.
    expect(state.bug).toBe("abc");
    expect(state.sort).toBe("title");
    expect(state.direction).toBe("asc");
    expect(state.density).toBe("compact");
  });

  /**
   * The run scope, which is not a filter over the loaded window like the rest
   * of them — it goes to the server and replaces the window. See
   * `BUG_HUNTER_PARAM.run` for why it has to.
   */
  it("scoping to a run clears every other filter in one write", () => {
    mount(
      `/?bucket=closed&q=terms&repo=ally-be&sev=${BugFindingSeverity.HIGH}&src=${BugFindingSource.LINT_ERROR}&status=${BugFindingStatus.NEW}&age=stale&dup=1`,
    );
    fireEvent.click(screen.getByText("scope run-a"));

    const state = parsed();
    expect(state.run).toBe("run-a");
    // "The 10 that sweep found" intersected with a leftover severity filter is
    // an answer to a question nobody asked, next to a log still saying 10.
    expect(state.bucket).toBe("all");
    expect(state.search).toBe("");
    expect(state.repos).toEqual([]);
    expect(state.severities).toEqual([]);
    expect(state.sources).toEqual([]);
    expect(state.statuses).toEqual([]);
    expect(state.age).toBe("all");
    expect(state.duplicatesOnly).toBe(false);
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
