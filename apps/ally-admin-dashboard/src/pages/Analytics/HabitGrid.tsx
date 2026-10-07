import { PALETTE } from "./chartScales";
import {
  FoundationalSkillsBehavioursResponse,
  behaviourShort,
  countRate,
  countText,
  rateCellStyle,
} from "./foundationalSkillsHabits";
import { learnerName } from "./foundationalSkillsProgressChart";

/**
 * Learners × the most person-specific helpful habits: each learner's rate —
 * how often they do it where they had the chance — with ▲ / ▼ only where their
 * own start vs now clears an exact test.
 *
 * It is a coaching view, not a league table: rows are ordered by how much
 * practice a learner has (how much the row can be trusted), never by score, and
 * nothing compares one learner with another. Plain HTML so every cell carries
 * its count as text ("3/7"), and colour is only the overview.
 */
export const HabitGrid = ({
  data,
  learners,
  onOpen,
}: {
  data: FoundationalSkillsBehavioursResponse;
  learners: FoundationalSkillsBehavioursResponse["learners"];
  onOpen: (id: number) => void;
}) => {
  const defs = new Map(data.behaviours.map(b => [b.code, b]));
  const cols = data.gridCodes.map(code => defs.get(code)).filter(Boolean) as NonNullable<
    ReturnType<typeof defs.get>
  >[];
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-auto">
        <table className="w-full border-separate border-spacing-[2px] text-xs">
          <thead>
            <tr className="align-bottom text-typography-500">
              <th className="py-1 pr-3 text-left font-medium">Learner</th>
              <th className="px-1 py-1 text-right font-medium">Slices</th>
              {cols.map(b => (
                <th
                  key={b.code}
                  title={b.text}
                  className="min-w-[72px] px-1 py-1 text-center font-medium"
                >
                  {behaviourShort(b.code, b.text)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {learners.map(l => {
              const byCode = new Map(l.behaviours.map(x => [x.code, x]));
              return (
                <tr key={l.id}>
                  <th className="py-1 pr-3 text-left font-normal">
                    <button
                      type="button"
                      className="cursor-pointer text-left text-[#264D8E] underline-offset-2 hover:underline max-sm:min-h-8"
                      onClick={() => onOpen(l.id)}
                    >
                      {learnerName(l)}
                    </button>
                  </th>
                  <td className="px-1 py-1 text-right tabular-nums text-typography-500">
                    {l.cuts}
                  </td>
                  {cols.map(b => {
                    const x = byCode.get(b.code);
                    const r = x ? countRate(x.all) : null;
                    const style = rateCellStyle(r);
                    const arrow = x?.clear === "adopted" ? "▲" : x?.clear === "dropped" ? "▼" : "";
                    return (
                      <td
                        key={b.code}
                        title={
                          x
                            ? `${countText(x.all)} slices · start ${countText(x.start)} → now ${countText(x.now)}${
                                x.clear ? ` · clearly ${x.clear}` : ""
                              }`
                            : "No chance yet"
                        }
                        className="rounded-sm px-1 py-1 text-center tabular-nums"
                        style={{ background: style.background, color: style.color }}
                      >
                        {x ? countText(x.all) : "—"}
                        {arrow && (
                          <span
                            className="ml-1 inline-block rounded-sm bg-white px-0.5 text-[10px] font-semibold leading-none"
                            style={{ color: x?.clear === "adopted" ? PALETTE.green : PALETTE.red }}
                          >
                            {arrow}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-typography-500">
        <span>Rate:</span>
        {[
          { label: "under 25%", r: 0.1 },
          { label: "25–49%", r: 0.3 },
          { label: "50–74%", r: 0.6 },
          { label: "75%+", r: 0.9 },
        ].map(k => (
          <span key={k.label} className="flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block h-3 w-4 rounded-sm"
              style={{ background: rateCellStyle(k.r).background }}
            />
            {k.label}
          </span>
        ))}
        <span>· ▲ / ▼ clear change against their own start · — no chance yet</span>
      </div>
    </div>
  );
};
