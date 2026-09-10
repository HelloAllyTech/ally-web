import { describe, expect, it } from "vitest";

import { parsePhoneMappingRows } from "../parsePhoneMappingRows";

/**
 * The paste parser.
 *
 * Its input is a human's copy-paste from a spreadsheet, and its output decides who the bot will
 * talk to — so the rule under test throughout is: be forgiving about FORMAT, and never silently
 * drop a line. A dropped line is a worker who stays locked out with nothing explaining why.
 */
const TENANTS = new Map([
  ["acme health", "tenant-a"],
  ["beacon care", "tenant-b"],
]);

describe("parsePhoneMappingRows", () => {
  it("reads a bare list of numbers", () => {
    const { rows, problems } = parsePhoneMappingRows("919876543210\n919876500000", TENANTS);

    expect(problems).toEqual([]);
    expect(rows.map(row => row.phone)).toEqual(["919876543210", "919876500000"]);
    // No organisation of their own: the panel's selector covers them.
    expect(rows.every(row => !row.tenantId)).toBe(true);
  });

  it("resolves an organisation NAME to its id", () => {
    // Names, because the spreadsheet a customer sends says "Acme Health"; asking an admin to
    // paste uuids would mean nobody uses the multi-organisation path.
    const { rows } = parsePhoneMappingRows("919876543210, Acme Health, Priya", TENANTS);

    expect(rows[0]).toMatchObject({
      phone: "919876543210",
      tenantId: "tenant-a",
      label: "Priya",
    });
  });

  it("matches an organisation name regardless of case and padding", () => {
    const { rows } = parsePhoneMappingRows('919876543210 , "  BEACON care "', TENANTS);

    expect(rows[0].tenantId).toBe("tenant-b");
  });

  it("accepts semicolons and tabs as well as commas", () => {
    const { rows } = parsePhoneMappingRows(
      "919876543210;Acme Health\n919876500000\tBeacon Care",
      TENANTS,
    );

    expect(rows.map(row => row.tenantId)).toEqual(["tenant-a", "tenant-b"]);
  });

  it("reports an organisation it does not recognise, against its line", () => {
    // Reported HERE rather than server-side: only the browser knows which of 200 lines said
    // "Acme Helth", and a server rejection can only say the organisation does not exist.
    const { rows, problems } = parsePhoneMappingRows(
      "919876543210, Acme Health\n919876500000, Acme Helth",
      TENANTS,
    );

    expect(rows).toHaveLength(1);
    expect(problems).toEqual([
      {
        line: 2,
        text: "919876500000, Acme Helth",
        reason: 'No organisation called "Acme Helth"',
      },
    ]);
  });

  it("reports a line with no number instead of skipping it", () => {
    const { rows, problems } = parsePhoneMappingRows(", Acme Health, Priya", TENANTS);

    expect(rows).toEqual([]);
    expect(problems[0].reason).toBe("No number on this line");
  });

  it("reports a line whose first cell holds no digits", () => {
    const { problems } = parsePhoneMappingRows("919876543210\nnot a number, Acme Health", TENANTS);

    expect(problems[0]).toMatchObject({
      line: 2,
      reason: "That does not look like a phone number",
    });
  });

  it("skips a header row, but only on the first line", () => {
    // Further down, a line that looks like a header is data — and dropping it would lose a
    // mapping without saying so.
    const first = parsePhoneMappingRows("Phone, Organisation\n919876543210", TENANTS);
    expect(first.rows).toHaveLength(1);
    expect(first.problems).toEqual([]);

    const later = parsePhoneMappingRows("919876543210\nphone, Organisation", TENANTS);
    expect(later.rows).toHaveLength(1);
    expect(later.problems).toHaveLength(1);
  });

  it("ignores blank lines without reporting them", () => {
    const { rows, problems } = parsePhoneMappingRows(
      "919876543210\n\n   \n919876500000\n",
      TENANTS,
    );

    expect(rows).toHaveLength(2);
    expect(problems).toEqual([]);
  });

  it("numbers lines from 1, counting blanks, so a reported line matches what was pasted", () => {
    const { problems } = parsePhoneMappingRows("919876543210\n\nnope", TENANTS);

    expect(problems[0].line).toBe(3);
  });

  it("keeps the number exactly as typed, leaving normalisation to the server", () => {
    // One definition of "the same number" lives in ally-be's util/phone.ts. Normalising here too
    // would be a second implementation, and the two drifting is how a mapping ends up visible in
    // the table while the bot still refuses the worker.
    const { rows } = parsePhoneMappingRows("+91 98765 43210", TENANTS);

    expect(rows[0].phone).toBe("+91 98765 43210");
  });
});
