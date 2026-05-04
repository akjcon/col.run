import { describe, it, expect } from "vitest";
import { applyMemoryUpdate } from "@/lib/coach-memory";
import type { CoachMemoryEntry } from "@/lib/types";

function entry(
  id: string,
  content: string,
  createdAt = 1000,
  updatedAt = 1000
): CoachMemoryEntry {
  return { id, content, createdAt, updatedAt };
}

describe("applyMemoryUpdate", () => {
  // -------------------------------------------------------------------------
  // Additions
  // -------------------------------------------------------------------------
  describe("additions", () => {
    it("adds notes to an empty list", () => {
      const result = applyMemoryUpdate([], {
        additions: ["Note A", "Note B"],
      }, 5000);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Note A");
      expect(result[1].content).toBe("Note B");
      expect(result[0].createdAt).toBe(5000);
      expect(result[0].updatedAt).toBe(5000);
    });

    it("appends to existing notes", () => {
      const existing = [entry("m_1", "Old note")];
      const result = applyMemoryUpdate(existing, {
        additions: ["New note"],
      }, 5000);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Old note");
      expect(result[1].content).toBe("New note");
    });

    it("caps at 30 entries", () => {
      const existing = Array.from({ length: 28 }, (_, i) =>
        entry(`m_${i}`, `Note ${i}`)
      );
      const result = applyMemoryUpdate(existing, {
        additions: ["Note 28", "Note 29", "Note 30 (should be dropped)"],
      }, 5000);

      expect(result).toHaveLength(30);
      expect(result[29].content).toBe("Note 29");
    });

    it("generates unique IDs for each addition", () => {
      const result = applyMemoryUpdate([], {
        additions: ["A", "B", "C"],
      }, 5000);

      const ids = result.map((e) => e.id);
      expect(new Set(ids).size).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Updates
  // -------------------------------------------------------------------------
  describe("updates", () => {
    it("updates an existing note's content", () => {
      const existing = [
        entry("m_1", "Old content", 1000, 1000),
        entry("m_2", "Untouched"),
      ];
      const result = applyMemoryUpdate(existing, {
        updates: [{ id: "m_1", content: "New content" }],
      }, 5000);

      expect(result[0].content).toBe("New content");
      expect(result[0].updatedAt).toBe(5000);
      expect(result[0].createdAt).toBe(1000); // preserved
      expect(result[1].content).toBe("Untouched");
    });

    it("ignores updates for non-existent IDs", () => {
      const existing = [entry("m_1", "Note")];
      const result = applyMemoryUpdate(existing, {
        updates: [{ id: "m_999", content: "Ghost" }],
      }, 5000);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe("Note");
    });
  });

  // -------------------------------------------------------------------------
  // Removals
  // -------------------------------------------------------------------------
  describe("removals", () => {
    it("removes notes by ID", () => {
      const existing = [
        entry("m_1", "Keep"),
        entry("m_2", "Remove"),
        entry("m_3", "Keep too"),
      ];
      const result = applyMemoryUpdate(existing, {
        removals: ["m_2"],
      });

      expect(result).toHaveLength(2);
      expect(result.map((e) => e.id)).toEqual(["m_1", "m_3"]);
    });

    it("ignores removal of non-existent IDs", () => {
      const existing = [entry("m_1", "Note")];
      const result = applyMemoryUpdate(existing, {
        removals: ["m_999"],
      });

      expect(result).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Combined operations
  // -------------------------------------------------------------------------
  describe("combined operations", () => {
    it("processes removals before updates and additions", () => {
      const existing = [
        entry("m_1", "Will be removed"),
        entry("m_2", "Will be updated"),
      ];
      const result = applyMemoryUpdate(existing, {
        removals: ["m_1"],
        updates: [{ id: "m_2", content: "Updated" }],
        additions: ["Brand new"],
      }, 5000);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe("Updated");
      expect(result[1].content).toBe("Brand new");
    });

    it("removal frees space for additions under the cap", () => {
      const existing = Array.from({ length: 30 }, (_, i) =>
        entry(`m_${i}`, `Note ${i}`)
      );
      // At cap — remove 2, then add 1 should work
      const result = applyMemoryUpdate(existing, {
        removals: ["m_0", "m_1"],
        additions: ["New note after removal"],
      }, 5000);

      expect(result).toHaveLength(29);
      expect(result[result.length - 1].content).toBe("New note after removal");
    });
  });

  // -------------------------------------------------------------------------
  // Immutability
  // -------------------------------------------------------------------------
  it("does not mutate the input array", () => {
    const existing = [entry("m_1", "Original")];
    const frozen = [...existing];
    applyMemoryUpdate(existing, { additions: ["New"] }, 5000);

    expect(existing).toEqual(frozen);
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  it("handles empty update (no-op)", () => {
    const existing = [entry("m_1", "Note")];
    const result = applyMemoryUpdate(existing, {});

    expect(result).toEqual(existing);
  });

  it("handles all undefined fields", () => {
    const result = applyMemoryUpdate([], {
      additions: undefined,
      updates: undefined,
      removals: undefined,
    });

    expect(result).toEqual([]);
  });
});
