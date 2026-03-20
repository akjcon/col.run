"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChecklistItem {
  id: string;
  category: string;
  severity: string;
  description: string;
  rationale: string;
}

const CATEGORIES = [
  "narrative_coherence",
  "phase_appropriateness",
  "taper_quality",
  "workout_variety",
  "race_specificity",
  "effort_distribution",
];

const SEVERITIES = ["critical", "major", "minor"];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  major: "bg-orange-100 text-orange-800",
  minor: "bg-yellow-100 text-yellow-800",
};

const CATEGORY_LABELS: Record<string, string> = {
  narrative_coherence: "Narrative",
  phase_appropriateness: "Phase",
  taper_quality: "Taper",
  workout_variety: "Variety",
  race_specificity: "Race Specificity",
  effort_distribution: "Effort",
};

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function fetchChecklist() {
      try {
        const res = await fetch("/api/review/checklist");
        if (!res.ok) throw new Error("Failed to fetch checklist");
        const data = await res.json();
        setItems(data.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchChecklist();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/review/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error("Failed to save checklist");
      setSuccess(true);
      setDirty(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const newItem: ChecklistItem = {
      id: `NEW_CHECK_${Date.now()}`,
      category: "phase_appropriateness",
      severity: "major",
      description: "",
      rationale: "",
    };
    setItems([...items, newItem]);
    setExpandedItem(newItem.id);
    setDirty(true);
  };

  const handleRemove = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setDirty(true);
  };

  const handleUpdate = (id: string, field: keyof ChecklistItem, value: string) => {
    setItems(
      items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    setDirty(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 p-4 sm:p-8">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-neutral-200 rounded w-48" />
            <div className="space-y-3 mt-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-neutral-200 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4 sm:p-8 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <Link
          href="/review"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plans
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-light text-neutral-900">
              Reviewer Checklist
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {items.length} items — the AI reviewer checks plans against these
            </p>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <p className="text-green-700 text-sm">Checklist saved.</p>
          </div>
        )}

        {/* Checklist Items */}
        <div className="space-y-3">
          {items.map((item) => {
            const isExpanded = expandedItem === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-xl transition-all ${
                  isExpanded
                    ? "border-neutral-400 shadow-sm"
                    : "border-neutral-200"
                }`}
              >
                {/* Collapsed view */}
                <button
                  onClick={() =>
                    setExpandedItem(isExpanded ? null : item.id)
                  }
                  className="w-full text-left p-4 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-neutral-400">
                        {item.id}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          SEVERITY_COLORS[item.severity] || "bg-neutral-100"
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-800 line-clamp-2">
                      {item.description || "(no description)"}
                    </p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-neutral-400 shrink-0 mt-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-400 shrink-0 mt-1" />
                  )}
                </button>

                {/* Expanded editor */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-neutral-100 pt-4">
                    {/* ID */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">
                        ID
                      </label>
                      <input
                        type="text"
                        value={item.id}
                        onChange={(e) =>
                          handleUpdate(item.id, "id", e.target.value.toUpperCase().replace(/\s+/g, "_"))
                        }
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                      />
                    </div>

                    {/* Severity + Category row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Severity
                        </label>
                        <select
                          value={item.severity}
                          onChange={(e) =>
                            handleUpdate(item.id, "severity", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                        >
                          {SEVERITIES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-500 mb-1">
                          Category
                        </label>
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleUpdate(item.id, "category", e.target.value)
                          }
                          className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent bg-white"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {CATEGORY_LABELS[c] || c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">
                        Description (what to check)
                      </label>
                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          handleUpdate(item.id, "description", e.target.value)
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                      />
                    </div>

                    {/* Rationale */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-500 mb-1">
                        Rationale (why it matters)
                      </label>
                      <textarea
                        value={item.rationale}
                        onChange={(e) =>
                          handleUpdate(item.id, "rationale", e.target.value)
                        }
                        rows={2}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                      />
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="flex items-center gap-2 text-sm text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove item
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add button */}
        <button
          onClick={handleAdd}
          className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-300 rounded-xl text-sm text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add checklist item
        </button>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-neutral-600">Unsaved changes</p>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white rounded-lg text-sm font-medium hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
