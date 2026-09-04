import { FC, ReactNode, useMemo, useState } from "react";

import { COPY_PATHS, describePath, hasTokenDrift, readCopy, sectionOf } from "./sjtCopy";
import { SjtCopyProvider, T, fillNodes } from "./SjtCopyContext";
import { ITEMS, OptionId } from "./sjtData";
import { SjtIntro } from "./SjtIntro";
import { SjtQuestion } from "./SjtQuestion";
import { SjtResults } from "./SjtResults";
import { CopyOverrides, buildExport, coerceOverrides, useSjtCopy } from "./useSjtCopy";
import { useSjtFonts } from "./useSjtFonts";
import { usePageMeta } from "../blog/usePageMeta";

import "./sjt.css";

type EditStage = "intro" | "quiz" | "results";

/**
 * A finished run, seeded so the results screen has something to render.
 *
 * Not a perfect one: a flat 100% would show a single band, one bar length and
 * one tone, hiding most of the copy that only appears when the scores differ.
 * Every third item is scrambled a little instead.
 */
const DEMO_ANSWERS: Record<number, OptionId[]> = Object.fromEntries(
  ITEMS.map((item, position) => {
    const order = [...item.key];
    if (position % 3 === 1) [order[0], order[1]] = [order[1], order[0]];
    if (position % 3 === 2) [order[1], order[3]] = [order[3], order[1]];
    return [item.id, order];
  }),
);

/**
 * The lines the page cannot show in position on the screen being edited.
 *
 * Two kinds: text a reader meets elsewhere entirely (the browser tab, the link
 * preview, the three score bands their own result didn't land in, the badge on
 * a breakdown card that is closed), and the few labels that are mostly
 * `{placeholder}` — each of those carries a sample so a reviewer can see what
 * their wording produces, and notices immediately if they drop a token.
 */
const ELSEWHERE: { path: string; label: string; sample?: Record<string, ReactNode> }[] = [
  { path: "meta.title", label: "Browser tab & shared-link title" },
  { path: "meta.description", label: "Link preview description" },
  { path: "bands.closely", label: "Score band · 85% and above" },
  { path: "bands.broadly", label: "Score band · 65–84%" },
  { path: "bands.mixed", label: "Score band · 45–64%" },
  { path: "bands.revisit", label: "Score band · below 45%" },
  { path: "review.openLabel", label: "Breakdown badge, closed" },
  {
    path: "question.remaining",
    label: "Options still to rank",
    sample: { remaining: 3 },
  },
  {
    path: "results.areaMeta",
    label: "Area line on the results",
    sample: { pct: 72, count: 3, items: "items" },
  },
  { path: "results.itemWord", label: "Unit, one of them" },
  { path: "results.itemsWord", label: "Unit, more than one" },
  {
    path: "review.meta",
    label: "Breakdown card subtitle",
    sample: { domain: "Boundaries & referral", pct: 83 },
  },
];

const noop = () => undefined;

const EXPORT_FILENAME = () => `sjt1-copy-${new Date().toISOString().slice(0, 10)}.json`;

/**
 * /SJT1/edit — the self-check with every word on it editable in place.
 *
 * Why it exists: the scenarios, the four options and the reasoning behind each
 * one are explicitly unvalidated (sjtData.ts says so, and the page says so to
 * the reader). They have to be read and reworded by people who are not going
 * to open a pull request — a safeguarding lead, a school counsellor, an EP —
 * and the text they are judging only makes sense in position, at the size and
 * in the order a teacher meets it. So this is the page itself, not a form
 * beside it: click any line and type.
 *
 * What it deliberately is not: a CMS. /SJT1 is public and unauthenticated, so
 * this route cannot be allowed to change what anyone else reads. Edits live in
 * this browser's localStorage and travel by being exported — the JSON names
 * every changed line by path, which is what someone needs to commit them. Both
 * the header and the footnote here say that plainly, so nobody reviews for an
 * afternoon believing they have published something.
 */
export const SjtEdit: FC = () => {
  const { copy, overrides, changedPaths, isChanged, setField, resetField, resetAll, replaceAll } =
    useSjtCopy();

  usePageMeta({
    title: `Editing · ${copy.meta.title}`,
    // A working surface, and one that renders the page's text out of position:
    // it has no business in search results next to /SJT1 itself.
    robots: "noindex, nofollow",
  });
  useSjtFonts();

  const [stage, setStage] = useState<EditStage>("intro");
  const [index, setIndex] = useState(0);
  /** Whether the scenario on show has its four options ranked. Unranked shows
   * the "n left" counter and the tap-again hint; ranked shows the four rank
   * labels and the enabled button. Both sets of words need editing. */
  const [ranked, setRanked] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const item = ITEMS[index];
  const order = useMemo<OptionId[]>(() => (ranked ? [...item.key] : []), [ranked, item]);

  const drifted = useMemo(
    () => changedPaths.filter(path => hasTokenDrift(path, overrides[path] ?? "")),
    [changedPaths, overrides],
  );

  const grouped = useMemo(() => {
    const sections = new Map<string, string[]>();
    COPY_PATHS.filter(path => path in overrides).forEach(path => {
      const section = sectionOf(path);
      sections.set(section, [...(sections.get(section) ?? []), path]);
    });
    return [...sections.entries()];
  }, [overrides]);

  const payload = () => JSON.stringify(buildExport(overrides), null, 2);

  const onCopy = () => {
    if (changedPaths.length === 0) {
      setStatus("Nothing to export yet — no line has been changed.");
      return;
    }
    if (!navigator.clipboard) {
      setStatus("This browser won't let a page use the clipboard. Use Download instead.");
      return;
    }
    navigator.clipboard
      .writeText(payload())
      .then(() => setStatus(`Copied ${changedPaths.length} changes to the clipboard.`))
      .catch(() => setStatus("This browser wouldn't let the page copy. Use Download instead."));
  };

  const onDownload = () => {
    if (changedPaths.length === 0) {
      setStatus("Nothing to export yet — no line has been changed.");
      return;
    }
    try {
      const blob = new Blob([payload()], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = EXPORT_FILENAME();
      anchor.click();
      URL.revokeObjectURL(href);
      setStatus(`Downloaded ${changedPaths.length} changes.`);
    } catch {
      setStatus("This browser wouldn't start the download. Use Copy JSON instead.");
    }
  };

  const onImport = () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(draft);
    } catch {
      setStatus("That isn't valid JSON — paste the whole exported file, braces included.");
      return;
    }

    const incoming: CopyOverrides = coerceOverrides(parsed);
    // How many the file *claimed*, so the message below can say what was
    // dropped. Anything that isn't an object claims nothing rather than
    // throwing — a pasted "null" is valid JSON.
    const source =
      parsed && typeof parsed === "object"
        ? ((parsed as { changes?: unknown }).changes ?? parsed)
        : {};
    const offered = source && typeof source === "object" ? Object.keys(source).length : 0;
    const kept = Object.keys(incoming).length;

    if (kept === 0) {
      setStatus("Nothing in that file matches a line on this page. Nothing was changed.");
      return;
    }

    replaceAll(incoming);
    setDraft("");
    setImportOpen(false);
    // Say what was dropped rather than silently keeping less than was pasted:
    // a stale export from before a reword is exactly when this matters.
    setStatus(
      kept === offered
        ? `Loaded ${kept} changes, replacing what was here.`
        : `Loaded ${kept} of ${offered} changes — the rest name lines this page no longer has.`,
    );
  };

  const onResetAll = () => {
    if (changedPaths.length === 0) {
      setStatus("Already showing the committed wording.");
      return;
    }
    const confirmed = window.confirm(
      `Discard all ${changedPaths.length} changes and go back to the committed wording? ` +
        "This can't be undone unless you exported them.",
    );
    if (!confirmed) return;
    resetAll();
    setListOpen(false);
    setStatus("Back to the committed wording.");
  };

  return (
    <div className="sjt sjt-editing">
      <header className="sjt-ed-bar">
        <div className="sjt-ed-bar-row">
          <span className="sjt-ed-brand">
            Editing <strong>/SJT1</strong>
          </span>

          <button
            type="button"
            className="sjt-ed-chip count"
            onClick={() => setListOpen(!listOpen)}
            aria-expanded={listOpen}
          >
            {changedPaths.length === 0
              ? "No changes"
              : `${changedPaths.length} ${changedPaths.length === 1 ? "change" : "changes"}`}
          </button>

          {drifted.length > 0 && (
            <span className="sjt-ed-chip warn">
              {drifted.length === 1
                ? "1 line is missing a {placeholder}"
                : `${drifted.length} lines are missing a {placeholder}`}
            </span>
          )}

          <span className="sjt-ed-spacer" />

          <button type="button" className="sjt-ed-chip" onClick={onCopy}>
            Copy JSON
          </button>
          <button type="button" className="sjt-ed-chip" onClick={onDownload}>
            Download
          </button>
          <button
            type="button"
            className="sjt-ed-chip"
            onClick={() => setImportOpen(!importOpen)}
            aria-expanded={importOpen}
          >
            Load a file
          </button>
          <button type="button" className="sjt-ed-chip" onClick={onResetAll}>
            Reset all
          </button>
          <a className="sjt-ed-chip" href="/SJT1" target="_blank" rel="noreferrer">
            Open /SJT1 ↗
          </a>
        </div>

        <div className="sjt-ed-bar-row">
          <span className="sjt-ed-label">Screen</span>
          {(
            [
              ["intro", "Intro"],
              ["quiz", "Scenario"],
              ["results", "Results"],
            ] as [EditStage, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`sjt-ed-chip${stage === value ? " on" : ""}`}
              onClick={() => setStage(value)}
              aria-pressed={stage === value}
            >
              {label}
            </button>
          ))}

          {stage === "quiz" && (
            <>
              <label className="sjt-ed-label" htmlFor="sjt-ed-scenario">
                Which
              </label>
              <select
                id="sjt-ed-scenario"
                className="sjt-ed-select"
                value={index}
                onChange={event => setIndex(Number(event.target.value))}
              >
                {ITEMS.map((each, position) => (
                  <option key={each.id} value={position}>
                    {position + 1}. {each.phase} · {copy.items[each.id].setting}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`sjt-ed-chip${ranked ? " on" : ""}`}
                onClick={() => setRanked(!ranked)}
                aria-pressed={ranked}
              >
                {ranked ? "Ranked" : "Unranked"}
              </button>
            </>
          )}
        </div>

        {status && (
          <p className="sjt-ed-status" role="status">
            {status}
          </p>
        )}
      </header>

      {listOpen && (
        <div className="sjt-ed-panel">
          {changedPaths.length === 0 ? (
            <p className="sjt-ed-panel-empty">
              Nothing changed yet. Click any line on the page below and type.
            </p>
          ) : (
            grouped.map(([section, paths]) => (
              <div className="sjt-ed-group" key={section}>
                <p className="sjt-ed-group-name">{section}</p>
                {paths.map(path => (
                  <div className="sjt-ed-row" key={path}>
                    <span className="sjt-ed-row-main">
                      <span className="sjt-ed-row-name">{describePath(path)}</span>
                      <span className="sjt-ed-row-text">{overrides[path]}</span>
                    </span>
                    <button type="button" className="sjt-ed-chip" onClick={() => resetField(path)}>
                      Revert
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {importOpen && (
        <div className="sjt-ed-panel">
          <p className="sjt-ed-panel-empty">
            Paste an exported file to pick someone else's pass back up. It replaces the changes in
            this browser, so export yours first if you want to keep them.
          </p>
          <textarea
            className="sjt-ed-area"
            value={draft}
            onChange={event => setDraft(event.target.value)}
            rows={6}
            aria-label="Exported changes to load"
            placeholder={'{ "version": 1, "changes": { "intro.lede": "…" } }'}
          />
          <div className="sjt-ed-row">
            <button
              type="button"
              className="sjt-ed-chip on"
              onClick={onImport}
              disabled={!draft.trim()}
            >
              Replace changes with this
            </button>
          </div>
        </div>
      )}

      <div className="sjt-wrap sjt-ed-brief">
        <p className="sjt-eyebrow">Reviewing the wording</p>
        <p style={{ marginTop: 10 }}>
          This is the page as a teacher meets it, with every line editable where it sits. Click a
          line, type, then click away — <strong>Enter</strong> finishes an edit and{" "}
          <strong>Esc</strong> abandons it. Emptying a line puts the previous wording back, because
          the page has no state for a missing sentence.
        </p>
        <p style={{ marginTop: 12 }}>
          This is final text that teachers will read, so wording is the point — but the reasoning
          under each option is what carries the page. Judge whether it is accurate, whether the
          ranking it defends still holds, and whether it survives being read by someone having a bad
          Tuesday. Use the <em>Screen</em> row above to reach every part: the ten scenarios, and the
          results screen with a sample run behind it.
        </p>
        <p className="sjt-hint" style={{ marginTop: 12 }}>
          Text in braces — <code>{"{remaining}"}</code>, <code>{"{pct}"}</code> — is filled in when
          the page renders. Keep it, or that number disappears; anything missing one is flagged
          above.
        </p>
      </div>

      <SjtCopyProvider copy={copy} editing isChanged={isChanged} setField={setField}>
        {stage === "quiz" && (
          <div className="sjt-rail">
            <div className="sjt-rail-top">
              <span>
                <T path="rail.label" />
              </span>
              <span>
                {index + 1} / {ITEMS.length}
              </span>
            </div>
            <div className="sjt-ticks">
              {ITEMS.map((tickItem, tickIndex) => (
                <span
                  key={tickItem.id}
                  className={`sjt-tick${tickIndex === index ? " here" : " done"}`}
                />
              ))}
            </div>
          </div>
        )}

        {stage === "intro" && <SjtIntro onStart={noop} />}

        {stage === "quiz" && (
          <SjtQuestion
            item={item}
            index={index}
            total={ITEMS.length}
            order={order}
            onToggle={noop}
            onClear={noop}
            onNext={noop}
            onBack={noop}
          />
        )}

        {stage === "results" && <SjtResults answers={DEMO_ANSWERS} onRestart={noop} />}

        <div className="sjt-wrap sjt-ed-also">
          <div className="sjt-card">
            <p className="sjt-eyebrow">Also on this page</p>
            <p className="sjt-hint" style={{ marginTop: 8 }}>
              Words a reader meets somewhere other than the screen you are on, and the few lines
              that are mostly a number — those would be unreadable edited in place, so they are here
              with a worked example of how each one comes out.
            </p>

            {ELSEWHERE.map(field => (
              <div className="sjt-ed-field" key={field.path}>
                <span className="sjt-ed-field-name">{field.label}</span>
                <span className="sjt-ed-field-value">
                  <T path={field.path} />
                  {field.sample && (
                    <span className="sjt-ed-field-eg">
                      Renders as “{fillNodes(readCopy(copy, field.path), field.sample)}”
                    </span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <p className="sjt-note">
            Changes are saved in this browser only. They do not change /SJT1 for anyone else, and
            they are not sent anywhere — clearing this browser's site data loses them. To get a pass
            into the page everyone reads, export it and hand the file over: it names each changed
            line, so it can be applied and reviewed like any other change.
          </p>
        </div>
      </SjtCopyProvider>
    </div>
  );
};
