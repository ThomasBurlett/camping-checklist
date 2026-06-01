import { describe, expect, it, vi } from "vitest";
import {
  buildCustomItemId,
  cloneSections,
  itemMatchesFilter,
  normalizeCustomItems,
} from "@/lib/checklist-items";
import type { ChecklistSectionData } from "@/types/checklist";

describe("checklist item helpers", () => {
  it("clones section tuple data into item objects without mutating the source", () => {
    const sections: ChecklistSectionData[] = [
      {
        id: "essentials",
        title: "Essentials",
        items: [
          ["tent", "Tent", "core"],
          ["pillow", "Pillow", "optional", "Nice for car camping.", "camping"],
        ],
      },
    ];

    const cloned = cloneSections(sections);

    expect(cloned).toEqual([
      {
        id: "essentials",
        title: "Essentials",
        items: [
          {
            id: "tent",
            kind: "core",
            label: "Tent",
            note: "",
            relatedChecklistSlug: undefined,
            source: "base",
          },
          {
            id: "pillow",
            kind: "optional",
            label: "Pillow",
            note: "Nice for car camping.",
            relatedChecklistSlug: "camping",
            source: "base",
          },
        ],
      },
    ]);
    expect(sections[0].items[0]).toEqual(["tent", "Tent", "core"]);
  });

  it("normalizes only valid custom items and trims labels", () => {
    const randomUUID = vi.fn(() => "uuid-1");
    vi.stubGlobal("crypto", { randomUUID });

    expect(
      normalizeCustomItems([
        { id: "extra-socks", kind: "optional", label: " Extra socks " },
        { id: "", kind: "custom", label: "Borrowed charger" },
        { id: "bad-label", kind: "core", label: "" },
        { id: "not-string", label: 123 },
        null,
      ]),
    ).toEqual([
      {
        id: "extra-socks",
        kind: "optional",
        label: "Extra socks",
        note: "",
        source: "custom",
      },
      {
        id: "custom-section-uuid-1",
        kind: "custom",
        label: "Borrowed charger",
        note: "",
        source: "custom",
      },
    ]);
  });

  it("builds section-scoped custom item IDs", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "abc-123" });

    expect(buildCustomItemId("kitchen")).toBe("custom-kitchen-abc-123");
  });

  it("matches all, unchecked, and kind filters", () => {
    const item = {
      id: "stove",
      kind: "core",
      label: "Stove",
      note: "",
      source: "base",
    } as const;
    const checkedIds = new Set(["stove"]);

    expect(itemMatchesFilter(item, "all", checkedIds)).toBe(true);
    expect(itemMatchesFilter(item, "unchecked", checkedIds)).toBe(false);
    expect(itemMatchesFilter(item, "core", checkedIds)).toBe(true);
    expect(itemMatchesFilter(item, "optional", checkedIds)).toBe(false);
  });
});
