import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Save,
  History,
  Copy,
  Trash2,
  FlaskConical,
  FileText,
} from "lucide-react";

interface Persona {
  id: string;
  displayName: string;
  slug: string;
}

interface PromptData {
  id: string;
  personaId: string;
  promptType: string;
  promptContent: string;
  version: number;
  isActive: boolean;
  variantLabel: string | null;
  trafficPercent: number;
  createdAt: string;
  updatedAt: string;
}

const PROMPT_TYPES = [
  { value: "system", label: "System Prompt" },
  { value: "greeting", label: "Greeting" },
  { value: "summary", label: "Session Summary" },
  { value: "context_injection", label: "Context Injection" },
];

export default function PromptsEditor() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [prompts, setPrompts] = useState<PromptData[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<PromptData | null>(null);
  const [editContent, setEditContent] = useState("");
  const [versions, setVersions] = useState<PromptData[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // New prompt form
  const [showNewPrompt, setShowNewPrompt] = useState(false);
  const [newPromptType, setNewPromptType] = useState("system");
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newTrafficPercent, setNewTrafficPercent] = useState(100);

  // Fetch personas
  useEffect(() => {
    async function fetchPersonas() {
      try {
        const res = await adminFetch("/api/admin/personas");
        if (res.ok) {
          const data = await res.json();
          const list = data.personas || [];
          setPersonas(list);
          if (list.length > 0 && !selectedPersonaId) {
            setSelectedPersonaId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch personas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersonas();
  }, []);

  // Fetch prompts for selected persona
  useEffect(() => {
    if (!selectedPersonaId) return;

    async function fetchPrompts() {
      try {
        const res = await adminFetch(
          `/api/admin/personas/${selectedPersonaId}/prompts`,
        );
        if (res.ok) {
          const data = await res.json();
          const list = data.prompts || [];
          setPrompts(list);
          // Auto-select first prompt
          if (list.length > 0 && !selectedPrompt) {
            setSelectedPrompt(list[0]);
            setEditContent(list[0].promptContent);
          }
        }
      } catch (err) {
        console.error("Failed to fetch prompts:", err);
      }
    }
    fetchPrompts();
  }, [selectedPersonaId]);

  // Fetch version history (all versions including inactive)
  const fetchVersions = async () => {
    if (!selectedPersonaId) return;
    try {
      const res = await adminFetch(
        `/api/admin/personas/${selectedPersonaId}/prompts?all=true`,
      );
      if (res.ok) {
        const data = await res.json();
        const allPrompts = data.prompts || [];
        // Filter to same promptType as selected, sort by version desc
        const typeVersions = selectedPrompt
          ? allPrompts
              .filter((p: PromptData) => p.promptType === selectedPrompt.promptType)
              .sort((a: PromptData, b: PromptData) => b.version - a.version)
          : allPrompts;
        setVersions(typeVersions);
        setShowVersions(true);
      }
    } catch (err) {
      console.error("Failed to fetch versions:", err);
    }
  };

  const selectPrompt = (prompt: PromptData) => {
    setSelectedPrompt(prompt);
    setEditContent(prompt.promptContent);
    setShowVersions(false);
  };

  const handleSave = async () => {
    if (!selectedPrompt) return;
    setSaving(true);

    try {
      const res = await adminFetch(`/api/admin/prompts/${selectedPrompt.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          promptContent: editContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated = data.prompt;
        if (data.isNewVersion) {
          // New version created - add it and select it
          setPrompts((prev) => [...prev, updated]);
        } else {
          setPrompts((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p)),
          );
        }
        setSelectedPrompt(updated);
        setEditContent(updated.promptContent);
      }
    } catch (err) {
      console.error("Failed to save prompt:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePrompt = async () => {
    if (!selectedPersonaId) return;
    setSaving(true);

    try {
      const res = await adminFetch(
        `/api/admin/personas/${selectedPersonaId}/prompts`,
        {
          method: "POST",
          body: JSON.stringify({
            promptType: newPromptType,
            promptContent: editContent || "Enter prompt content here...",
            variantLabel: newVariantLabel || undefined,
            trafficPercent: newTrafficPercent,
          }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const created = data.prompt;
        setPrompts((prev) => [...prev, created]);
        selectPrompt(created);
        setShowNewPrompt(false);
        setNewVariantLabel("");
        setNewTrafficPercent(100);
      }
    } catch (err) {
      console.error("Failed to create prompt:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (prompt: PromptData) => {
    try {
      if (!prompt.isActive) {
        // Activate via dedicated endpoint
        const res = await adminFetch(
          `/api/admin/prompts/${prompt.id}/activate`,
          { method: "POST" },
        );
        if (res.ok) {
          const data = await res.json();
          const updated = data.prompt;
          // Activating one prompt may deactivate others of same type
          setPrompts((prev) =>
            prev.map((p) =>
              p.id === updated.id
                ? updated
                : p.promptType === updated.promptType
                  ? { ...p, isActive: false }
                  : p,
            ),
          );
          if (selectedPrompt?.id === updated.id) {
            setSelectedPrompt(updated);
          }
        }
      } else {
        // No dedicated deactivate endpoint - update via PATCH with empty content change
        // Just update local state as a visual toggle
        setPrompts((prev) =>
          prev.map((p) =>
            p.id === prompt.id ? { ...p, isActive: false } : p,
          ),
        );
        if (selectedPrompt?.id === prompt.id) {
          setSelectedPrompt({ ...prompt, isActive: false });
        }
      }
    } catch (err) {
      console.error("Failed to toggle prompt:", err);
    }
  };

  const handleDuplicate = (prompt: PromptData) => {
    setNewPromptType(prompt.promptType);
    setEditContent(prompt.promptContent);
    setNewVariantLabel(`${prompt.variantLabel || "A"}-copy`);
    setShowNewPrompt(true);
  };

  // No delete endpoint available - deactivate instead
  const handleDeactivate = async (promptId: string) => {
    if (!window.confirm("Deactivate this prompt variant?")) return;
    const prompt = prompts.find((p) => p.id === promptId);
    if (prompt) {
      setPrompts((prev) =>
        prev.map((p) => (p.id === promptId ? { ...p, isActive: false } : p)),
      );
      if (selectedPrompt?.id === promptId) {
        setSelectedPrompt({ ...prompt, isActive: false });
      }
    }
  };

  const restoreVersion = (version: PromptData) => {
    setEditContent(version.promptContent);
    setShowVersions(false);
  };

  // Group prompts by type
  const promptsByType = prompts.reduce(
    (acc, p) => {
      const type = p.promptType;
      if (!acc[type]) acc[type] = [];
      acc[type].push(p);
      return acc;
    },
    {} as Record<string, PromptData[]>,
  );

  const hasChanges =
    selectedPrompt && editContent !== selectedPrompt.promptContent;

  return (
    <AdminLayout title="Prompts Editor">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-64">
          <Select
            value={selectedPersonaId}
            onValueChange={setSelectedPersonaId}
          >
            <SelectTrigger className="bg-gray-800 text-white border-gray-700">
              <SelectValue placeholder="Select Persona" />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto bg-gray-800 border-gray-700">
              {personas.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          size="sm"
          onClick={() => setShowNewPrompt(true)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Prompt
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Prompt list sidebar */}
          <div className="space-y-4">
            {Object.entries(promptsByType).map(([type, typePrompts]) => (
              <div key={type}>
                <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  {PROMPT_TYPES.find((t) => t.value === type)?.label || type}
                </h3>
                <div className="space-y-1">
                  {typePrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      onClick={() => selectPrompt(prompt)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                        selectedPrompt?.id === prompt.id
                          ? "bg-purple-600/20 text-purple-300"
                          : "text-gray-400 hover:bg-gray-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          v{prompt.version}
                          {prompt.variantLabel
                            ? ` (${prompt.variantLabel})`
                            : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {prompt.trafficPercent < 100 && (
                          <Badge
                            variant="outline"
                            className="text-[9px] text-amber-400 border-amber-800"
                          >
                            <FlaskConical className="w-2.5 h-2.5 mr-0.5" />
                            {prompt.trafficPercent}%
                          </Badge>
                        )}
                        <div
                          className={`w-2 h-2 rounded-full ${
                            prompt.isActive ? "bg-green-500" : "bg-gray-600"
                          }`}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {prompts.length === 0 && (
              <p className="text-gray-600 text-xs text-center py-4">
                No prompts yet. Create one to get started.
              </p>
            )}
          </div>

          {/* Editor area */}
          <div className="lg:col-span-3">
            {selectedPrompt ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-white text-sm">
                        {PROMPT_TYPES.find(
                          (t) => t.value === selectedPrompt.promptType,
                        )?.label || selectedPrompt.promptType}
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="text-xs text-gray-400 border-gray-700"
                      >
                        v{selectedPrompt.version}
                      </Badge>
                      {selectedPrompt.variantLabel && (
                        <Badge
                          variant="outline"
                          className="text-xs text-purple-400 border-purple-800"
                        >
                          {selectedPrompt.variantLabel}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          selectedPrompt.isActive
                            ? "text-green-400 border-green-800"
                            : "text-gray-500 border-gray-700"
                        }`}
                      >
                        {selectedPrompt.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-gray-400 border-gray-700"
                        onClick={() => fetchVersions()}
                      >
                        <History className="w-3 h-3 mr-1" />
                        History
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-gray-400 border-gray-700"
                        onClick={() => handleDuplicate(selectedPrompt)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Clone
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-gray-400 border-gray-700"
                        onClick={() =>
                          handleToggleActive(selectedPrompt)
                        }
                      >
                        {selectedPrompt.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-red-400 border-red-800"
                        onClick={() => handleDeactivate(selectedPrompt.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* A/B test config */}
                  <div className="flex items-center gap-4 mb-4 p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="w-4 h-4 text-gray-500" />
                      <span className="text-xs text-gray-400">
                        Traffic Split:
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedPrompt.trafficPercent}
                      className="w-16 bg-gray-800 text-white rounded px-2 py-1 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                      readOnly
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>

                  {/* Editor */}
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={20}
                    className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-none font-mono leading-relaxed"
                    placeholder="Enter prompt content..."
                  />

                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-gray-600">
                      {editContent.length} characters
                    </span>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-1" />
                          Save (Creates New Version)
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-600 text-sm">
                Select a prompt to edit or create a new one.
              </div>
            )}

            {/* Version history panel */}
            {showVersions && versions.length > 0 && (
              <Card className="bg-gray-900 border-gray-800 mt-4">
                <CardHeader>
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Version History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {versions.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                      >
                        <div>
                          <span className="text-sm text-white">
                            Version {v.version}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(v.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs text-gray-400 border-gray-700"
                          onClick={() => restoreVersion(v)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* New prompt modal - simple inline form */}
      {showNewPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="bg-gray-900 border-gray-800 w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-white text-sm">
                Create New Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Prompt Type
                </label>
                <Select
                  value={newPromptType}
                  onValueChange={setNewPromptType}
                >
                  <SelectTrigger className="bg-gray-800 text-white border-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    {PROMPT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Variant Label (for A/B testing)
                </label>
                <input
                  type="text"
                  value={newVariantLabel}
                  onChange={(e) => setNewVariantLabel(e.target.value)}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                  placeholder="A, B, control, etc."
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Traffic Percentage
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newTrafficPercent}
                  onChange={(e) =>
                    setNewTrafficPercent(parseInt(e.target.value) || 0)
                  }
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowNewPrompt(false)}
                  variant="outline"
                  className="flex-1 text-gray-400 border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePrompt}
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
