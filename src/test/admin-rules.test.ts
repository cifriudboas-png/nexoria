import { describe, expect, it } from "vitest";
import { adminErrorKey, parseNexosAmount } from "@/lib/admin";

describe("NEXORIA admin panel rules", () => {
  it("accepts a whole positive amount of Nexos", () => {
    expect(parseNexosAmount(" 250 ")).toEqual({ amount: 250 });
  });

  it("rejects zero, negative, decimal and empty amounts", () => {
    for (const value of ["0", "-5", "2.5", "", "abc"]) {
      expect(parseNexosAmount(value)).toEqual({ error: "adminAmountInvalid" });
    }
  });

  it("explains when a player does not have enough Nexos to take", () => {
    expect(adminErrorKey("insufficient_nexos")).toBe("adminErrorInsufficient");
  });

  it("explains that an admin account cannot be banned", () => {
    expect(adminErrorKey("cannot_ban_admin")).toBe("adminErrorBanAdmin");
  });

  it("explains that only the NEXORIA account can use the panel", () => {
    expect(adminErrorKey("forbidden")).toBe("adminErrorForbidden");
  });
});
