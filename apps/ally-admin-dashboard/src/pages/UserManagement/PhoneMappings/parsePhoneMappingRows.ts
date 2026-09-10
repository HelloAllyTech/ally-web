import { BulkWaPhoneMappingRow } from "@types";

export interface ParsedRow extends BulkWaPhoneMappingRow {
  /** 1-based position in what the admin pasted, so a reported problem points at a real line. */
  line: number;
}

export interface ParseProblem {
  line: number;
  text: string;
  reason: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  problems: ParseProblem[];
}

/** Header words we recognise and skip, so pasting a spreadsheet's first row is not an error. */
const HEADER_WORDS = ["phone", "number", "mobile", "phone number", "msisdn"];

const stripQuotes = (value: string) => value.trim().replace(/^"|"$/g, "").trim();

/**
 * Turn a pasted block or CSV into rows, resolving organisation NAMES to ids.
 *
 * The format is `phone[, organisation[, label]]`, one per line — and the organisation column is
 * optional because the ordinary case is a whole roster belonging to one customer, which the
 * panel's selector covers. A file that spans several names them per row.
 *
 * NAMES, not ids: the spreadsheet a customer sends says "Acme Health", and asking an admin to
 * paste uuids into it would mean nobody ever uses the multi-organisation path. An unrecognised
 * name is reported against its line BEFORE anything is sent, because a server-side rejection can
 * only say "that organisation does not exist" without saying which of 200 lines said it.
 *
 * Parsing is deliberately forgiving about separators (comma, semicolon, tab) and about a header
 * row, because the input is a human's copy-paste. It is deliberately strict about anything it
 * cannot interpret: a silently dropped line is a worker who stays locked out.
 */
export function parsePhoneMappingRows(
  text: string,
  tenantIdsByName: Map<string, string>,
): ParseResult {
  const rows: ParsedRow[] = [];
  const problems: ParseProblem[] = [];

  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    const trimmed = rawLine.trim();
    if (!trimmed) return;

    const cells = trimmed.split(/[,;\t]/).map(stripQuotes);
    const [phone, organisation, label] = cells;

    // A header row only counts as one on the FIRST line. Further down it is data that happens to
    // look like a header, and dropping it silently would lose a mapping.
    if (line === 1 && HEADER_WORDS.includes(phone.toLowerCase())) return;

    if (!phone) {
      problems.push({ line, text: trimmed, reason: "No number on this line" });
      return;
    }
    if (!/\d/.test(phone)) {
      problems.push({
        line,
        text: trimmed,
        reason: "That does not look like a phone number",
      });
      return;
    }

    let tenantId: string | undefined;
    if (organisation) {
      tenantId = tenantIdsByName.get(organisation.toLowerCase());
      if (!tenantId) {
        problems.push({
          line,
          text: trimmed,
          reason: `No organisation called "${organisation}"`,
        });
        return;
      }
    }

    rows.push({
      line,
      phone,
      ...(tenantId ? { tenantId } : {}),
      ...(label ? { label } : {}),
    });
  });

  return { rows, problems };
}
