import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ArrowLeft, Trophy, Play, Pause, Pencil } from "lucide-react";

// --- Types ---

interface Variant {
  id: string;
  label: string;
  value: string;
}

interface ABTest {
  id: string;
  name: string;
  page: string;
  element: string;
  status: "draft" | "running" | "paused" | "completed";
  trafficSplit: string;
  variants: Variant[];
  winnerVariantId: string | null;
  createdAt: string;
}

interface VariantResult {
  variantId: string;
  label: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
}

interface ABTestResults {
  test: ABTest;
  results: VariantResult[];
}

// --- Constants ---

const PAGE_OPTIONS = [
  { value: "soulmate_landing", label: "Soulmate Landing" },
  { value: "soulmate_reading", label: "Soulmate Reading" },
  { value: "soulmate_gift", label: "Soulmate Gift" },
  { value: "soulmate_gift2", label: "Soulmate Gift 2" },
];

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-600",
  running: "bg-green-600",
  paused: "bg-yellow-600",
  completed: "bg-blue-600",
};

// --- Component ---

type View = "list" | "results" | "form";

export default function ABTestingDashboard() {
  const [view, setView] = useState<View>("list");
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Results view state
  const [selectedResults, setSelectedResults] = useState<ABTestResults | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // Form state
  const [editingTest, setEditingTest] = useState<ABTest | null>(null);
  const [formName, setFormName] = useState("");
  const [formPage, setFormPage] = useState(PAGE_OPTIONS[0].value);
  const [formElement, setFormElement] = useState("");
  const [formTrafficSplit, setFormTrafficSplit] = useState("50/50");
  const [formVariants, setFormVariants] = useState<Variant[]>([
    { id: "a", label: "Control", value: "" },
    { id: "b", label: "Variant B", value: "" },
  ]);
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/api/admin/ab-tests");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTests(Array.isArray(data) ? data : data.tests || []);
    } catch (e: any) {
      setError(e.message || "Failed to load tests");
    } finally {
      setLoading(false);
    }
  }

  async function loadResults(testId: string) {
    setResultsLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/ab-tests/${testId}/results`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSelectedResults(data);
      setView("results");
    } catch (e: any) {
      setError(e.message || "Failed to load results");
    } finally {
      setResultsLoading(false);
    }
  }

  async function toggleStatus(test: ABTest) {
    const newStatus = test.status === "running" ? "paused" : "running";
    try {
      const res = await adminFetch(`/api/admin/ab-tests/${test.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadTests();
      setSuccess(`Test "${test.name}" is now ${newStatus}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update test status");
    }
  }

  async function deleteTest(test: ABTest) {
    if (!confirm(`Delete test "${test.name}"? This cannot be undone.`)) return;
    try {
      const res = await adminFetch(`/api/admin/ab-tests/${test.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await loadTests();
      setSuccess(`Test "${test.name}" deleted.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to delete test");
    }
  }

  async function declareWinner(variantId: string) {
    if (!selectedResults) return;
    try {
      const res = await adminFetch(`/api/admin/ab-tests/${selectedResults.test.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed", winnerVariantId: variantId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSuccess("Winner declared! Test is now completed.");
      setTimeout(() => setSuccess(""), 3000);
      // Reload results
      await loadResults(selectedResults.test.id);
      await loadTests();
    } catch (e: any) {
      setError(e.message || "Failed to declare winner");
    }
  }

  // --- Form helpers ---

  function openCreateForm() {
    setEditingTest(null);
    setFormName("");
    setFormPage(PAGE_OPTIONS[0].value);
    setFormElement("");
    setFormTrafficSplit("50/50");
    setFormVariants([
      { id: "a", label: "Control", value: "" },
      { id: "b", label: "Variant B", value: "" },
    ]);
    setView("form");
  }

  function openEditForm(test: ABTest) {
    setEditingTest(test);
    setFormName(test.name);
    setFormPage(test.page);
    setFormElement(test.element);
    setFormTrafficSplit(test.trafficSplit || "50/50");
    setFormVariants(
      test.variants.length > 0
        ? test.variants
        : [
            { id: "a", label: "Control", value: "" },
            { id: "b", label: "Variant B", value: "" },
          ]
    );
    setView("form");
  }

  function addVariant() {
    const nextId = String.fromCharCode(97 + formVariants.length); // a, b, c, d...
    setFormVariants([
      ...formVariants,
      { id: nextId, label: `Variant ${nextId.toUpperCase()}`, value: "" },
    ]);
  }

  function removeVariant(index: number) {
    if (formVariants.length <= 2) {
      setError("You need at least 2 variants.");
      return;
    }
    setFormVariants(formVariants.filter((_, i) => i !== index));
  }

  function updateVariant(index: number, field: keyof Variant, val: string) {
    const updated = [...formVariants];
    updated[index] = { ...updated[index], [field]: val };
    setFormVariants(updated);
  }

  async function saveForm() {
    setError("");
    if (!formName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!formElement.trim()) {
      setError("Element is required.");
      return;
    }
    if (formVariants.some((v) => !v.value.trim())) {
      setError("All variants must have a value.");
      return;
    }

    setFormSaving(true);
    const payload = {
      name: formName.trim(),
      page: formPage,
      element: formElement.trim(),
      trafficSplit: formTrafficSplit.trim() || "50/50",
      variants: formVariants,
    };

    try {
      let res: Response;
      if (editingTest) {
        res = await adminFetch(`/api/admin/ab-tests/${editingTest.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        res = await adminFetch("/api/admin/ab-tests", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any).error || `HTTP ${res.status}`);
      }

      setSuccess(editingTest ? "Test updated." : "Test created.");
      setTimeout(() => setSuccess(""), 3000);
      await loadTests();
      setView("list");
    } catch (e: any) {
      setError(e.message || "Failed to save test");
    } finally {
      setFormSaving(false);
    }
  }

  // --- Render: List View ---

  function renderList() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div />
          <Button onClick={openCreateForm} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>

        {loading && <div className="text-gray-400 text-center py-12">Loading tests...</div>}

        {!loading && tests.length === 0 && (
          <div className="text-gray-500 text-center py-12">
            No A/B tests yet. Create one to get started.
          </div>
        )}

        {!loading && tests.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-left text-gray-400">
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Page</th>
                    <th className="py-3 px-4">Element</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test) => (
                    <tr
                      key={test.id}
                      className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => loadResults(test.id)}
                    >
                      <td className="py-3 px-4 text-white font-medium">{test.name}</td>
                      <td className="py-3 px-4 text-gray-300">{test.page}</td>
                      <td className="py-3 px-4 text-gray-300">{test.element}</td>
                      <td className="py-3 px-4">
                        <Badge className={`${STATUS_COLORS[test.status]} text-white text-xs`}>
                          {test.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-400 text-xs">
                        {new Date(test.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          {test.status !== "completed" && (
                            <button
                              onClick={() => toggleStatus(test)}
                              className="text-gray-400 hover:text-white transition-colors"
                              title={test.status === "running" ? "Pause" : "Run"}
                            >
                              {test.status === "running" ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => openEditForm(test)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTest(test)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // --- Render: Results View ---

  function renderResults() {
    if (resultsLoading) {
      return <div className="text-gray-400 text-center py-12">Loading results...</div>;
    }

    if (!selectedResults) {
      return <div className="text-gray-400 text-center py-12">No results to display.</div>;
    }

    const { test, results } = selectedResults;
    const maxRate = Math.max(...results.map((r) => r.conversionRate));
    const hasEnoughData = results.every((r) => r.impressions >= 30);

    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>

        {/* Test info */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">{test.name}</CardTitle>
              <Badge className={`${STATUS_COLORS[test.status]} text-white`}>{test.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Page:</span>{" "}
                <span className="text-white">{test.page}</span>
              </div>
              <div>
                <span className="text-gray-400">Element:</span>{" "}
                <span className="text-white">{test.element}</span>
              </div>
              <div>
                <span className="text-gray-400">Traffic Split:</span>{" "}
                <span className="text-white">{test.trafficSplit}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Variant results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result) => {
            const isWinner =
              hasEnoughData && result.conversionRate === maxRate && maxRate > 0;
            const isDeclaredWinner = test.winnerVariantId === result.variantId;

            return (
              <Card
                key={result.variantId}
                className={`bg-gray-900 border-gray-800 ${
                  isDeclaredWinner ? "border-green-600 ring-1 ring-green-600" : ""
                } ${isWinner && !isDeclaredWinner ? "border-yellow-600" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-sm">
                      {result.label}
                      {isDeclaredWinner && (
                        <Trophy className="w-4 h-4 text-green-400 inline ml-2" />
                      )}
                      {isWinner && !isDeclaredWinner && (
                        <span className="text-yellow-400 text-xs ml-2">(leading)</span>
                      )}
                    </CardTitle>
                    <span className="text-xs text-gray-500">ID: {result.variantId}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Impressions</span>
                      <span className="text-white font-medium">{result.impressions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Conversions</span>
                      <span className="text-white font-medium">{result.conversions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Conversion Rate</span>
                      <span className="text-white font-bold text-lg">
                        {result.conversionRate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Declare winner */}
        {test.status !== "completed" && hasEnoughData && (
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-400 mb-4">
                All variants have 30+ impressions. You can declare a winner to end the test.
              </p>
              <div className="flex flex-wrap gap-2">
                {results.map((result) => (
                  <Button
                    key={result.variantId}
                    onClick={() => declareWinner(result.variantId)}
                    className="bg-green-700 hover:bg-green-600"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Declare "{result.label}" Winner
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {test.status !== "completed" && !hasEnoughData && (
          <div className="text-xs text-gray-500 text-center">
            Need at least 30 impressions per variant before declaring a winner.
            {results.map((r) => ` ${r.label}: ${r.impressions}/30`).join(",")}
          </div>
        )}
      </div>
    );
  }

  // --- Render: Form View ---

  function renderForm() {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => setView("list")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </button>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              {editingTest ? "Edit Test" : "Create New Test"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Test Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Headline variation test"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Page */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Page</label>
              <select
                value={formPage}
                onChange={(e) => setFormPage(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              >
                {PAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Element */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Element</label>
              <input
                type="text"
                value={formElement}
                onChange={(e) => setFormElement(e.target.value)}
                placeholder="e.g. headline, cta_button, subheadline"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
              <p className="text-xs text-gray-600 mt-1">
                The element identifier used by the useABTest hook in your component code.
              </p>
            </div>

            {/* Traffic Split */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Traffic Split</label>
              <input
                type="text"
                value={formTrafficSplit}
                onChange={(e) => setFormTrafficSplit(e.target.value)}
                placeholder="50/50"
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              />
              <p className="text-xs text-gray-600 mt-1">
                e.g. "50/50" for 2 variants, "33/33/34" for 3 variants
              </p>
            </div>

            {/* Variants */}
            <div className="border-t border-gray-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs text-gray-400 font-medium">Variants</label>
                <Button
                  onClick={addVariant}
                  size="sm"
                  className="bg-gray-700 hover:bg-gray-600 text-xs"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Variant
                </Button>
              </div>

              <div className="space-y-3">
                {formVariants.map((variant, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono bg-gray-700 px-2 py-0.5 rounded">
                          {variant.id}
                        </span>
                        <input
                          type="text"
                          value={variant.label}
                          onChange={(e) => updateVariant(index, "label", e.target.value)}
                          placeholder="Label"
                          className="bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => removeVariant(index)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        title="Remove variant"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={variant.value}
                      onChange={(e) => updateVariant(index, "value", e.target.value)}
                      placeholder="Variant value (the text/content shown to visitors)"
                      rows={2}
                      className="w-full bg-gray-700 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-purple-500 focus:outline-none resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700">
              <Button
                onClick={() => setView("list")}
                variant="outline"
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                onClick={saveForm}
                disabled={formSaving}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {formSaving ? "Saving..." : editingTest ? "Update Test" : "Create Test"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Main Render ---

  return (
    <AdminLayout title="A/B Testing">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm mb-4">
          {success}
        </div>
      )}

      {view === "list" && renderList()}
      {view === "results" && renderResults()}
      {view === "form" && renderForm()}
    </AdminLayout>
  );
}
