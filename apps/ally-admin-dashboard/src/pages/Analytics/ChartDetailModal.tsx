import { ReactNode, useState } from "react";

import { Download } from "@icons";

import {
  Button,
  CarbonToggle,
  ComposedModal,
  ContentSwitcher,
  ModalBody,
  ModalHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@ally-ui-mono/ui-shared";

import { CHART_HEIGHT_EXPANDED } from "./chartKit";

/**
 * The dense tier of the analytics dashboard.
 *
 * The default tile view is deliberately sparse: one idea, no value labels, an
 * axis that shows where a metric sits on the scale the reader knows. That view
 * cannot also serve someone who needs the exact numbers or the small movements —
 * so rather than compromising on one middle density that serves nobody, depth
 * lives here, on demand.
 *
 * What this adds over the tile:
 *  - a bigger plot,
 *  - an optional zoomed value axis, labelled as zoomed, for reading small
 *    changes that a full bounded axis flattens,
 *  - the same data as a table, because a chart is for shape and a table is for
 *    value,
 *  - a CSV export whose header carries the window, filters and sample size, so
 *    the file cannot be misread once it leaves the app.
 */

export interface ChartTableData {
  columns: string[];
  rows: (string | number | null)[][];
}

interface ChartDetailModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  caption?: string;
  /** Provenance line — repeated here so an exported screenshot carries it. */
  source?: string;
  /**
   * Renders the chart. `zoomed` is only ever true when `zoomable` is set; the
   * caller decides what zooming means for its own axis (typically: drop the
   * bounded domain and let the data set the range).
   */
  render: (opts: { height: string; zoomed: boolean }) => ReactNode;
  /** Offer the zoomed-axis toggle. Only for bounded scales where the tile shows
   *  the full range and small movements are consequently hard to see. */
  zoomable?: boolean;
  /** Explains what the zoomed axis is doing, e.g. "Axis zoomed to 3.8–4.6 of
   *  1–5 — magnifies small changes; the tile shows the full scale." */
  zoomNote?: string;
  table?: ChartTableData;
  /** Context lines written into the CSV above the header row. */
  exportContext?: string[];
  exportFilename?: string;
}

const csvCell = (v: string | number | null): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/**
 * Build a CSV that carries its own context. A bare table of numbers loses the
 * window, the filters and the sample size the moment it lands in a spreadsheet,
 * and then gets quoted in a meeting without them.
 */
export const buildCsv = (
  title: string,
  table: ChartTableData,
  contextLines: string[] = [],
): string => {
  const preamble = [`# ${title}`, ...contextLines.map(l => `# ${l}`)];
  return [
    ...preamble,
    table.columns.map(csvCell).join(","),
    ...table.rows.map(row => row.map(csvCell).join(",")),
  ].join("\n");
};

const downloadCsv = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const ChartDetailModal = ({
  open,
  onClose,
  title,
  caption,
  source,
  render,
  zoomable = false,
  zoomNote,
  table,
  exportContext = [],
  exportFilename,
}: ChartDetailModalProps) => {
  const [showTable, setShowTable] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  const filename =
    exportFilename ??
    `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}.csv`;

  const onExport = () => {
    if (!table) return;
    downloadCsv(filename, buildCsv(title, table, [...exportContext, ...(source ? [source] : [])]));
  };

  return (
    <ComposedModal open={open} onClose={onClose} size="lg">
      <ModalHeader title={title} buttonOnClick={onClose}>
        {caption && <p className="text-sm text-typography-500 mt-1">{caption}</p>}
      </ModalHeader>
      <ModalBody className="analytics-detail-scroll">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {table ? (
            <ContentSwitcher
              selectedIndex={showTable ? 1 : 0}
              onChange={({ index }) => setShowTable(index === 1)}
              size="sm"
            >
              <Switch name="chart" text="Chart" />
              <Switch name="table" text="Table" />
            </ContentSwitcher>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-4">
            {zoomable && !showTable && (
              <CarbonToggle
                id={`zoom-${filename}`}
                size="sm"
                labelText=""
                labelA="Full scale"
                labelB="Zoomed axis"
                toggled={zoomed}
                onToggle={setZoomed}
              />
            )}
            {table && (
              <Button kind="tertiary" size="sm" renderIcon={Download} onClick={onExport}>
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {zoomable && zoomed && !showTable && zoomNote && (
          <p className="text-xs text-typography-600 mb-3 border-l-2 border-[#8d8d8d] pl-2">
            {zoomNote}
          </p>
        )}

        {showTable && table ? (
          <TableContainer>
            <Table size="sm">
              <TableHead>
                <TableRow>
                  {table.columns.map(c => (
                    <TableHeader key={c}>{c}</TableHeader>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {table.rows.map((row, i) => (
                  // Row order is the series order; index is the only stable key
                  // available for an arbitrary pivoted table.
                  <TableRow key={i}>
                    {row.map((cell, j) => (
                      <TableCell key={table.columns[j] ?? j}>
                        {cell === null || cell === undefined ? "—" : cell}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          render({ height: CHART_HEIGHT_EXPANDED, zoomed })
        )}

        {source && <p className="mt-4 text-[11px] leading-tight text-typography-500">{source}</p>}
      </ModalBody>
    </ComposedModal>
  );
};
