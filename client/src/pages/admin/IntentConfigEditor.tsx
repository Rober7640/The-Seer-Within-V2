import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";

interface ConversationBucket {
  name: string;
  order: number;
  typicalDuration: number;
  nextBucket?: string;
}

interface Intent {
  name: string;
  patterns: string[];
  bucket?: string;
  responseGuidance: string;
  priority?: number;
}

interface CharacterRules {
  forbiddenPhrases: string[];
  requiredElements: string[];
  maxWordsPerMessage: number;
  speakingStyle: string;
}

interface IntentConfig {
  id: string;
  personaId: string;
  specialty: string;
  conversationBuckets: ConversationBucket[];
  intents: Intent[];
  characterRules: CharacterRules;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PersonaSummary {
  id: string;
  displayName: string;
  slug: string;
}

export default function IntentConfigEditor() {
  const params = useParams<{ personaId?: string }>();
  const [configs, setConfigs] = useState<IntentConfig[]>([]);
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    params.personaId || ""
  );
  const [editingConfig, setEditingConfig] = useState<IntentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("buckets");

  useEffect(() => {
    fetchPersonas();
  }, []);

  useEffect(() => {
    if (selectedPersonaId) {
      fetchConfigs(selectedPersonaId);
    }
  }, [selectedPersonaId]);

  async function fetchPersonas() {
    try {
      const res = await adminFetch("/api/admin/personas");
      if (res.ok) {
        const data = await res.json();
        setPersonas(data.personas || []);
        if (!selectedPersonaId && data.personas?.length > 0) {
          setSelectedPersonaId(data.personas[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch personas:", err);
    }
  }

  async function fetchConfigs(personaId: string) {
    setLoading(true);
    try {
      const res = await adminFetch(
        `/api/admin/intent-configs?personaId=${personaId}`
      );
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        if (data.configs?.length > 0) {
          setEditingConfig(data.configs[0]);
        } else {
          setEditingConfig(null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch configs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!editingConfig) return;
    setSaving(true);
    try {
      const isNew = !editingConfig.id;
      const url = isNew
        ? "/api/admin/intent-configs"
        : `/api/admin/intent-configs/${editingConfig.id}`;
      const method = isNew ? "POST" : "PUT";

      const body = {
        personaId: selectedPersonaId,
        specialty: editingConfig.specialty,
        conversationBuckets: editingConfig.conversationBuckets,
        intents: editingConfig.intents,
        characterRules: editingConfig.characterRules,
        isActive: editingConfig.isActive,
      };

      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(body),
      });

      if (res.ok) {
        fetchConfigs(selectedPersonaId);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleCreateNew() {
    setEditingConfig({
      id: "",
      personaId: selectedPersonaId,
      specialty: "",
      conversationBuckets: [
        { name: "opening", order: 1, typicalDuration: 2, nextBucket: "question" },
        { name: "question", order: 2, typicalDuration: 2, nextBucket: "reading" },
        { name: "reading", order: 3, typicalDuration: 3, nextBucket: "offer" },
        { name: "offer", order: 4, typicalDuration: 2 },
      ],
      intents: [],
      characterRules: {
        forbiddenPhrases: ["As an AI", "I'm programmed"],
        requiredElements: ["warm", "insightful"],
        maxWordsPerMessage: 150,
        speakingStyle: "",
      },
      version: 1,
      isActive: true,
      createdAt: "",
      updatedAt: "",
    });
  }

  // Bucket helpers
  function updateBucket(index: number, field: string, value: any) {
    if (!editingConfig) return;
    const buckets = [...editingConfig.conversationBuckets];
    (buckets[index] as any)[field] = value;
    setEditingConfig({ ...editingConfig, conversationBuckets: buckets });
  }

  function addBucket() {
    if (!editingConfig) return;
    const buckets = [...editingConfig.conversationBuckets];
    buckets.push({
      name: "",
      order: buckets.length + 1,
      typicalDuration: 2,
    });
    setEditingConfig({ ...editingConfig, conversationBuckets: buckets });
  }

  function removeBucket(index: number) {
    if (!editingConfig) return;
    const buckets = editingConfig.conversationBuckets.filter(
      (_, i) => i !== index
    );
    setEditingConfig({ ...editingConfig, conversationBuckets: buckets });
  }

  // Intent helpers
  function updateIntent(index: number, field: string, value: any) {
    if (!editingConfig) return;
    const intents = [...editingConfig.intents];
    (intents[index] as any)[field] = value;
    setEditingConfig({ ...editingConfig, intents });
  }

  function addIntent() {
    if (!editingConfig) return;
    const intents = [...editingConfig.intents];
    intents.push({
      name: "",
      patterns: [],
      responseGuidance: "",
      priority: 1,
    });
    setEditingConfig({ ...editingConfig, intents });
  }

  function removeIntent(index: number) {
    if (!editingConfig) return;
    const intents = editingConfig.intents.filter((_, i) => i !== index);
    setEditingConfig({ ...editingConfig, intents });
  }

  // Character rules helpers
  function updateRules(field: string, value: any) {
    if (!editingConfig) return;
    setEditingConfig({
      ...editingConfig,
      characterRules: { ...editingConfig.characterRules, [field]: value },
    });
  }

  return (
    <AdminLayout title="Intent Configs">
      {/* Persona selector */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={selectedPersonaId}
          onChange={(e) => setSelectedPersonaId(e.target.value)}
          className="bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName}
            </option>
          ))}
        </select>

        <div className="flex-1" />

        {configs.length > 0 && (
          <div className="flex gap-1">
            {configs.map((c) => (
              <button
                key={c.id}
                onClick={() => setEditingConfig(c)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  editingConfig?.id === c.id
                    ? "bg-purple-600/20 text-purple-300"
                    : "text-gray-500 hover:text-white"
                }`}
              >
                v{c.version}
                {c.isActive && " (active)"}
              </button>
            ))}
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="text-purple-400 border-purple-800"
          onClick={handleCreateNew}
        >
          <Plus className="w-3 h-3 mr-1" />
          New Config
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !editingConfig ? (
        <div className="text-center py-12 text-gray-600 text-sm">
          No intent config for this persona.{" "}
          <button
            onClick={handleCreateNew}
            className="text-purple-400 hover:underline"
          >
            Create one
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Specialty & Active */}
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">
                    Specialty
                  </label>
                  <input
                    type="text"
                    value={editingConfig.specialty}
                    onChange={(e) =>
                      setEditingConfig({
                        ...editingConfig,
                        specialty: e.target.value,
                      })
                    }
                    placeholder="tarot, astrology, mediumship..."
                    className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-4">
                  <label className="text-xs text-gray-500">Active</label>
                  <button
                    onClick={() =>
                      setEditingConfig({
                        ...editingConfig,
                        isActive: !editingConfig.isActive,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors ${
                      editingConfig.isActive ? "bg-green-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform mx-0.5 ${
                        editingConfig.isActive ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Buckets */}
          <CollapsibleSection
            title="Conversation Buckets"
            count={editingConfig.conversationBuckets.length}
            expanded={expandedSection === "buckets"}
            onToggle={() =>
              setExpandedSection(
                expandedSection === "buckets" ? "" : "buckets"
              )
            }
          >
            <div className="space-y-2">
              {editingConfig.conversationBuckets.map((bucket, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-2"
                >
                  <input
                    type="text"
                    value={bucket.name}
                    onChange={(e) => updateBucket(i, "name", e.target.value)}
                    placeholder="Bucket name"
                    className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={bucket.order}
                    onChange={(e) =>
                      updateBucket(i, "order", parseInt(e.target.value) || 1)
                    }
                    className="w-16 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 text-center"
                    title="Order"
                  />
                  <input
                    type="number"
                    value={bucket.typicalDuration}
                    onChange={(e) =>
                      updateBucket(
                        i,
                        "typicalDuration",
                        parseInt(e.target.value) || 1
                      )
                    }
                    className="w-16 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 text-center"
                    title="Duration (turns)"
                  />
                  <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                  <input
                    type="text"
                    value={bucket.nextBucket || ""}
                    onChange={(e) =>
                      updateBucket(i, "nextBucket", e.target.value || undefined)
                    }
                    placeholder="Next"
                    className="w-24 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    onClick={() => removeBucket(i)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                onClick={addBucket}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Bucket
              </Button>
            </div>
          </CollapsibleSection>

          {/* Intents */}
          <CollapsibleSection
            title="Intents"
            count={editingConfig.intents.length}
            expanded={expandedSection === "intents"}
            onToggle={() =>
              setExpandedSection(
                expandedSection === "intents" ? "" : "intents"
              )
            }
          >
            <div className="space-y-3">
              {editingConfig.intents.map((intent, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={intent.name}
                      onChange={(e) => updateIntent(i, "name", e.target.value)}
                      placeholder="Intent name"
                      className="flex-1 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-purple-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={intent.bucket || ""}
                      onChange={(e) =>
                        updateIntent(i, "bucket", e.target.value || undefined)
                      }
                      placeholder="Bucket"
                      className="w-28 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
                    />
                    <input
                      type="number"
                      value={intent.priority || 1}
                      onChange={(e) =>
                        updateIntent(
                          i,
                          "priority",
                          parseInt(e.target.value) || 1
                        )
                      }
                      className="w-16 bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 text-center"
                      title="Priority"
                    />
                    <button
                      onClick={() => removeIntent(i)}
                      className="text-gray-600 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={
                      Array.isArray(intent.patterns)
                        ? intent.patterns.join(", ")
                        : ""
                    }
                    onChange={(e) =>
                      updateIntent(
                        i,
                        "patterns",
                        e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    placeholder="Patterns (comma separated)"
                    className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                  <textarea
                    value={intent.responseGuidance}
                    onChange={(e) =>
                      updateIntent(i, "responseGuidance", e.target.value)
                    }
                    placeholder="Response guidance for Claude..."
                    rows={2}
                    className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                onClick={addIntent}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Intent
              </Button>
            </div>
          </CollapsibleSection>

          {/* Character Rules */}
          <CollapsibleSection
            title="Character Rules"
            expanded={expandedSection === "rules"}
            onToggle={() =>
              setExpandedSection(expandedSection === "rules" ? "" : "rules")
            }
          >
            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">
                  Forbidden Phrases (comma separated)
                </label>
                <input
                  type="text"
                  value={
                    editingConfig.characterRules.forbiddenPhrases?.join(", ") ||
                    ""
                  }
                  onChange={(e) =>
                    updateRules(
                      "forbiddenPhrases",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">
                  Required Elements (comma separated)
                </label>
                <input
                  type="text"
                  value={
                    editingConfig.characterRules.requiredElements?.join(", ") ||
                    ""
                  }
                  onChange={(e) =>
                    updateRules(
                      "requiredElements",
                      e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase block mb-1">
                    Max Words Per Message
                  </label>
                  <input
                    type="number"
                    value={editingConfig.characterRules.maxWordsPerMessage || 150}
                    onChange={(e) =>
                      updateRules(
                        "maxWordsPerMessage",
                        parseInt(e.target.value) || 150
                      )
                    }
                    className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase block mb-1">
                  Speaking Style
                </label>
                <textarea
                  value={editingConfig.characterRules.speakingStyle || ""}
                  onChange={(e) => updateRules("speakingStyle", e.target.value)}
                  placeholder="Natural language description of speaking style..."
                  rows={2}
                  className="w-full bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Config"}
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function CollapsibleSection({
  title,
  count,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-gray-900 border-gray-800">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <CardTitle className="text-white text-sm">{title}</CardTitle>
          {count !== undefined && (
            <Badge
              variant="outline"
              className="text-[10px] text-gray-400 border-gray-700"
            >
              {count}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {expanded && (
        <CardContent className="px-4 pb-4 pt-0">{children}</CardContent>
      )}
    </Card>
  );
}
