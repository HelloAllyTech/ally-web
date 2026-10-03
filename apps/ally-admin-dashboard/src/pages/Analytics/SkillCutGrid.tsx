import { levelCellStyle } from "./foundationalSkillsProgressChart";

export interface SkillCutGridCell {
  value: number | null;
  /** Shown on hover: the n behind the cell, or why it is blank. */
  title?: string;
}

/**
 * A skill × cut grid of 1–4 levels, darker = higher.
 *
 * Plain HTML rather than a Carbon heatmap because the row labels are the full
 * rubric skill names ("Assessment of harm and developing a response plan"),
 * which a chart axis would truncate at 14 characters, and because every cell
 * carries its value as text — colour is the overview, the number is the
 * reading, so the grid survives greyscale and colour-blindness.
 *
 * A blank cell is "not enough to say" (too few learners, or no opportunity),
 * never a low score; its tooltip says which.
 */
export const SkillCutGrid = ({
  rows,
  cuts,
  cell,
  decimals = 2,
  caption,
}: {
  rows: { key: string; label: string; group?: string }[];
  cuts: number[];
  cell: (skill: string, cut: number) => SkillCutGridCell;
  decimals?: number;
  caption?: string;
}) => {
  let lastGroup: string | undefined;
  return (
    <div className="overflow-auto">
      <table className="w-full border-separate border-spacing-[2px] text-xs">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="text-typography-500">
            <th className="py-1 pr-3 text-left font-medium">Skill</th>
            {cuts.map(c => (
              <th key={c} className="min-w-[44px] px-1 py-1 text-center font-medium tabular-nums">
                Cut {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const groupRow =
              r.group && r.group !== lastGroup ? (
                <tr key={`g-${r.group}`}>
                  <th
                    colSpan={cuts.length + 1}
                    className="pb-0.5 pt-2 text-left text-[11px] font-semibold uppercase tracking-wide text-typography-500"
                  >
                    {r.group}
                  </th>
                </tr>
              ) : null;
            lastGroup = r.group ?? lastGroup;
            return [
              groupRow,
              <tr key={r.key}>
                <th className="py-1 pr-3 text-left font-normal text-typography-700">{r.label}</th>
                {cuts.map(c => {
                  const { value, title } = cell(r.key, c);
                  const style = levelCellStyle(value);
                  return (
                    <td
                      key={c}
                      title={title}
                      className="rounded-sm px-1 py-1 text-center tabular-nums"
                      style={{ background: style.background, color: style.color }}
                    >
                      {value === null ? "—" : value.toFixed(decimals)}
                    </td>
                  );
                })}
              </tr>,
            ];
          })}
        </tbody>
      </table>
    </div>
  );
};
