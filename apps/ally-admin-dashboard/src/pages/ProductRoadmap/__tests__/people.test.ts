import { describe, expect, it } from "vitest";

import { personName } from "../utils/people";

describe("personName", () => {
  it("uses the account name when there is one", () => {
    expect(personName({ name: "Ankita Lalwani", email: "ankita.lalwani@helloally.ai" })).toBe(
      "Ankita Lalwani",
    );
  });

  it("builds a name from a first.last email when the name is blank", () => {
    expect(personName({ name: "", email: "sandeep.malhotra@helloally.ai" })).toBe(
      "Sandeep Malhotra",
    );
    expect(personName({ name: "  ", email: "gopi.s@helloally.ai" })).toBe("Gopi S");
  });

  it("says Unknown user only when there is neither a name nor an email", () => {
    expect(personName({ name: "", email: "" })).toBe("Unknown user");
    expect(personName(null)).toBe("Unknown user");
  });
});
