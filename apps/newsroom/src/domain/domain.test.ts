import { describe, expect, it } from "vitest";
import { diffSize, wordDiff } from "./diff";
import { homePlace, targetLabel } from "./places";
import { docText, isEmptyDoc, readingMinutes, wordCount } from "@/features/editor/tools";

describe("word diff", () => {
  it("marks added and removed words, Hindi included", () => {
    const pieces = wordDiff("रांची में भारी बारिश", "रांची में तेज़ बारिश");
    expect(pieces.filter((p) => p.kind === "removed").map((p) => p.text.trim())).toEqual(["भारी"]);
    expect(pieces.filter((p) => p.kind === "added").map((p) => p.text.trim())).toEqual(["तेज़"]);
    expect(diffSize(pieces)).toEqual({ added: 1, removed: 1 });
  });

  it("returns nothing to show for identical text", () => {
    expect(wordDiff("same", "same")).toEqual([{ text: "same", kind: "same" }]);
    expect(wordDiff("", "")).toEqual([]);
  });
});

describe("places", () => {
  it("names who a story is for", () => {
    expect(targetLabel({ scope: "local", state: "JH", district: "ranchi" })).toBe("Ranchi");
    expect(targetLabel({ scope: "local", state: "JH", district: "ranchi" }, "hi")).toBe("रांची");
    expect(targetLabel({ scope: "state", state: "JH", district: "" })).toBe("Jharkhand");
    expect(targetLabel({ scope: "india", state: "", district: "" })).toBe("All India");
  });

  it("falls back to the newsroom's home market", () => {
    expect(homePlace({})).toEqual({ state: "JH", district: "ranchi" });
    expect(homePlace({ homeState: "BR", homeDistrict: "" })).toEqual({ state: "BR", district: "" });
  });
});

describe("story text", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Roads" }] },
      { type: "paragraph", content: [{ type: "text", text: "Main Road " }, { type: "text", text: "flooded", marks: [{ type: "bold" }] }] },
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "one" }] }] }] },
    ],
  };

  it("reads plain text and counts words", () => {
    expect(docText(doc)).toBe("Roads\n\nMain Road flooded\n\none");
    expect(wordCount(docText(doc))).toBe(5);
  });

  it("treats a photo-only story as not empty", () => {
    expect(isEmptyDoc({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(isEmptyDoc({ type: "doc", content: [{ type: "image", attrs: { src: "/media/a.jpg" } }] })).toBe(false);
  });

  it("estimates reading time per language", () => {
    expect(readingMinutes(440, "en")).toBe(2);
    expect(readingMinutes(360, "hi")).toBe(2);
    expect(readingMinutes(10, "en")).toBe(1);
  });
});
