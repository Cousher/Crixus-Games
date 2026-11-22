import { describe, it, expect } from "vitest";
import { translateApiMessage } from "./apiMessageI18n";

describe("translateApiMessage", () => {
  it("translates backend English error strings to Spanish", () => {
    expect(translateApiMessage("Bonus not yet available", undefined, "es")).toBe(
      "¡El bono todavía no está disponible!"
    );
    expect(translateApiMessage("Bonus not yet available!", undefined, "es")).toBe(
      "¡El bono todavía no está disponible!"
    );
    expect(
      translateApiMessage({ response: { data: { message: "Insufficient balance" } } }, undefined, "es")
    ).toBe("Saldo insuficiente");
  });

  it("preserves English messages when language is English", () => {
    expect(translateApiMessage("Bonus not yet available", undefined, "en")).toBe(
      "Bonus not yet available"
    );
  });

  it("uses fallback when message is empty", () => {
    expect(translateApiMessage({}, "Error de conexión", "es")).toBe("Error de conexión");
  });
});
