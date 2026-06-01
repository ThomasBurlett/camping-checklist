import { describe, expect, it, vi } from "vitest";
import {
  createPersistedChecklistState,
  getEmptyChecklistState,
  normalizePersistedChecklistState,
} from "@/lib/checklist-state";
import type { ChecklistItem, PersistedChecklistState } from "@/types/checklist";

describe("persisted checklist state", () => {
  it("returns a stable empty state for missing or invalid saved data", () => {
    expect(getEmptyChecklistState()).toEqual({
      checkedIds: [],
      collapsedSections: [],
      customItems: {},
    });
    expect(normalizePersistedChecklistState(null, ["gear"])).toEqual(getEmptyChecklistState());
    expect(normalizePersistedChecklistState("invalid" as unknown as PersistedChecklistState, ["gear"]))
      .toEqual(getEmptyChecklistState());
  });

  it("keeps arrays and only normalizes custom items for known sections", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-1" });

    const state = normalizePersistedChecklistState(
      {
        checkedIds: ["tent"],
        collapsedSections: ["kitchen"],
        customItems: {
          gear: [
            { id: "camp-shoes", kind: "optional", label: " Camp shoes " },
            { id: "empty", kind: "core", label: " " },
          ],
          ignored: [{ id: "outside", kind: "core", label: "Outside" }],
        },
      },
      ["gear", "kitchen"],
    );

    expect(state).toEqual({
      checkedIds: ["tent"],
      collapsedSections: ["kitchen"],
      customItems: {
        gear: [
          {
            id: "camp-shoes",
            kind: "optional",
            label: "Camp shoes",
            note: "",
            source: "custom",
          },
        ],
      },
    });
  });

  it("creates serializable state from live sets and custom items", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "uuid-2" });

    const customItems: Record<string, ChecklistItem[]> = {
      kitchen: [
        {
          id: "",
          kind: "core",
          label: "Coffee",
          note: "Generated IDs should be serializable.",
          source: "custom",
        },
      ],
    };

    expect(
      createPersistedChecklistState(
        new Set(["tent", "stove"]),
        new Set(["clothing"]),
        customItems,
      ),
    ).toEqual({
      checkedIds: ["tent", "stove"],
      collapsedSections: ["clothing"],
      customItems: {
        kitchen: [
          {
            id: "custom-kitchen-uuid-2",
            kind: "core",
            label: "Coffee",
          },
        ],
      },
    });
  });
});
