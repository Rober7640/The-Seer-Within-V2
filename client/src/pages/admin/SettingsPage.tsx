import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Save, Cpu } from "lucide-react";

interface ModelEntry {
  id: string;
  label: string;
  tier: "premium" | "basic";
}

interface ModelSettings {
  availableModels: ModelEntry[];
  defaultConversationModel: string;
  defaultBasicModel: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<ModelSettings>({
    availableModels: [],
    defaultConversationModel: "",
    defaultBasicModel: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // New model form
  const [newModelId, setNewModelId] = useState("");
  const [newModelLabel, setNewModelLabel] = useState("");
  const [newModelTier, setNewModelTier] = useState<"premium" | "basic">("premium");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await adminFetch("/api/admin/settings/models");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err: any) {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await adminFetch("/api/admin/settings/models", {
        method: "PUT",
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setSuccess("Model settings saved successfully.");
        setTimeout(() => setSuccess(""), 3000);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function addModel() {
    if (!newModelId.trim() || !newModelLabel.trim()) {
      setError("Model ID and label are required.");
      return;
    }
    if (settings.availableModels.some((m) => m.id === newModelId.trim())) {
      setError("This model ID is already in the list.");
      return;
    }
    setError("");
    setSettings({
      ...settings,
      availableModels: [
        ...settings.availableModels,
        { id: newModelId.trim(), label: newModelLabel.trim(), tier: newModelTier },
      ],
    });
    setNewModelId("");
    setNewModelLabel("");
    setNewModelTier("premium");
  }

  function removeModel(modelId: string) {
    const updated = settings.availableModels.filter((m) => m.id !== modelId);
    if (updated.length === 0) {
      setError("You must keep at least one model.");
      return;
    }
    const newSettings = { ...settings, availableModels: updated };
    // If we removed a default, reset it to the first available
    if (modelId === settings.defaultConversationModel) {
      newSettings.defaultConversationModel = updated[0].id;
    }
    if (modelId === settings.defaultBasicModel) {
      newSettings.defaultBasicModel = updated[0].id;
    }
    setSettings(newSettings);
  }

  if (loading) {
    return (
      <AdminLayout title="Settings">
        <div className="text-gray-400 text-center py-12">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Settings">
      <div className="max-w-3xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* Available Models */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Available AI Models
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current models list */}
            {settings.availableModels.length === 0 ? (
              <p className="text-gray-500 text-sm">No models configured. Add one below.</p>
            ) : (
              <div className="space-y-2">
                {settings.availableModels.map((model) => (
                  <div
                    key={model.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
                  >
                    <div>
                      <span className="text-white text-sm font-medium">{model.label}</span>
                      <span className="text-gray-500 text-xs ml-2">({model.id})</span>
                      <span
                        className={`ml-2 text-xs px-2 py-0.5 rounded ${
                          model.tier === "premium"
                            ? "bg-purple-900/50 text-purple-300"
                            : "bg-blue-900/50 text-blue-300"
                        }`}
                      >
                        {model.tier}
                      </span>
                    </div>
                    <button
                      onClick={() => removeModel(model.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      title="Remove model"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new model */}
            <div className="border-t border-gray-700 pt-4 space-y-3">
              <p className="text-xs text-gray-400 font-medium">Add New Model</p>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newModelId}
                  onChange={(e) => setNewModelId(e.target.value)}
                  placeholder="claude-model-id"
                  className="col-span-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={newModelLabel}
                  onChange={(e) => setNewModelLabel(e.target.value)}
                  placeholder="Display Label"
                  className="col-span-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newModelTier}
                    onChange={(e) => setNewModelTier(e.target.value as "premium" | "basic")}
                    className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none flex-1"
                  >
                    <option value="premium">Premium</option>
                    <option value="basic">Basic</option>
                  </select>
                  <Button
                    onClick={addModel}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Enter the full Anthropic model ID (e.g. claude-sonnet-4-5-20250929). When Anthropic releases a new model, add it here.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Global Defaults */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-sm">Global Defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Default Conversation Model
              </label>
              <select
                value={settings.defaultConversationModel}
                onChange={(e) =>
                  setSettings({ ...settings, defaultConversationModel: e.target.value })
                }
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              >
                {settings.availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Used for main chat responses when a persona has no override set.
              </p>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Default Basic Model
              </label>
              <select
                value={settings.defaultBasicModel}
                onChange={(e) =>
                  setSettings({ ...settings, defaultBasicModel: e.target.value })
                }
                className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
              >
                {settings.availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.id})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-600 mt-1">
                Used for greetings, summaries, and other basic tasks. Recommended: a cheaper model like Haiku.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
