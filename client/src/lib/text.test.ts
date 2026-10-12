import { describe, expect, it } from "vitest";
import { cleanText, readText } from "./text";

describe("cleanText", () => {
  it("folds full-width characters and strips invisible and bidi controls", () => {
    expect(cleanText("\uFF21\uFF22\uFF23\uFF24\uFF25\uFF11\uFF12\uFF13\uFF14\uFF26")).toBe("ABCDE1234F");
    expect(cleanText("ABC\u200BDE1234\u202EF\uFEFF")).toBe("ABCDE1234F");
    expect(cleanText("  Asha\u00ADRao  ")).toBe("AshaRao");
    expect(cleanText("HDFC\u20600001234")).toBe("HDFC0001234");
    expect(cleanText("\u2066Asha\u2069")).toBe("Asha");
  });
});

describe("readText", () => {
  it("cleans strings and ignores files", () => {
    const data = new FormData();
    data.set("name", " Asha\u200D ");
    data.set("file", new Blob(["x"]), "f.txt");
    expect(readText(data, "name")).toBe("Asha");
    expect(readText(data, "file")).toBe("");
    expect(readText(data, "missing")).toBe("");
  });
});
