import { describe, expect, it } from "vitest";
import { validateLoginForm, validateSignupForm } from "@/lib/auth";

describe("NEXORIA sign-up rules", () => {
  it("rejects usernames shorter than 3 characters", () => {
    const errors = validateSignupForm({ username: "ab", password: "12345678", confirmPassword: "12345678" });
    expect(errors.username?.key).toBe("usernameInvalid");
  });

  it("rejects usernames longer than 20 characters", () => {
    const errors = validateSignupForm({
      username: "a".repeat(21),
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(errors.username?.key).toBe("usernameInvalid");
  });

  it("rejects passwords under 8 characters", () => {
    const errors = validateSignupForm({ username: "player_1", password: "1234567", confirmPassword: "1234567" });
    expect(errors.password).toEqual({ key: "passwordMin", params: { min: 8 } });
  });

  it("rejects mismatched password confirmation", () => {
    const errors = validateSignupForm({ username: "player_1", password: "12345678", confirmPassword: "12345679" });
    expect(errors.confirmPassword?.key).toBe("passwordMismatch");
  });

  it("accepts a valid username and password", () => {
    expect(validateSignupForm({ username: "Player_1", password: "12345678", confirmPassword: "12345678" })).toEqual({});
  });

  it("requires username and password to sign in", () => {
    const errors = validateLoginForm({ username: " ", password: "" });
    expect(errors.username?.key).toBe("loginUsernameRequired");
    expect(errors.password?.key).toBe("loginPasswordRequired");
  });
});
