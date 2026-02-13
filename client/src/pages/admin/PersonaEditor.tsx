import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowLeft, Trash2, Eye, Plus, X } from "lucide-react";

interface PricingPackage {
  id: string;
  label: string;
  minutes: number;
  priceUsd: number; // in cents
  popular?: boolean;
  savings?: string;
}

interface PricingConfig {
  freeMinutes: number;
  packages: PricingPackage[];
}

interface PersonaFormData {
  slug: string;
  displayName: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  baseSystemPrompt: string;
  personality: string;
  categories: string;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  customPricing: string;
}

const EMPTY_FORM: PersonaFormData = {
  slug: "",
  displayName: "",
  tagline: "",
  description: "",
  avatarUrl: "",
  baseSystemPrompt: "",
  personality: "",
  categories: "[]",
  isActive: true,
  isDefault: false,
  sortOrder: 0,
  customPricing: "",
};

const CATEGORY_OPTIONS = [
  "love",
  "money",
  "purpose",
  "career",
  "spiritual",
  "general",
];

export default function PersonaEditor() {
  const [, navigate] = useLocation();
  const [matchNew] = useRoute("/admin/personas/new");
  const [matchEdit, params] = useRoute("/admin/personas/:id");
  const isNew = !!matchNew;
  const personaId = params?.id;

  const [form, setForm] = useState<PersonaFormData>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    freeMinutes: 0,
    packages: [],
  });

  const parsePricing = (raw: string): PricingConfig => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        freeMinutes: parsed.freeMinutes ?? 0,
        packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      };
    } catch {
      return { freeMinutes: 0, packages: [] };
    }
  };

  const syncPricingToForm = (config: PricingConfig) => {
    setPricing(config);
    updateField("customPricing", JSON.stringify(config));
  };

  const addPackage = () => {
    const next: PricingConfig = {
      ...pricing,
      packages: [
        ...pricing.packages,
        {
          id: `pkg-${Date.now()}`,
          label: "",
          minutes: 15,
          priceUsd: 1500,
        },
      ],
    };
    syncPricingToForm(next);
  };

  const removePackage = (index: number) => {
    const next: PricingConfig = {
      ...pricing,
      packages: pricing.packages.filter((_, i) => i !== index),
    };
    syncPricingToForm(next);
  };

  const updatePackage = (
    index: number,
    field: keyof PricingPackage,
    value: string | number | boolean,
  ) => {
    const updated = [...pricing.packages];
    updated[index] = { ...updated[index], [field]: value };
    const next: PricingConfig = { ...pricing, packages: updated };
    syncPricingToForm(next);
  };

  const setFreeMinutes = (mins: number) => {
    const next: PricingConfig = { ...pricing, freeMinutes: mins };
    syncPricingToForm(next);
  };

  // Fetch existing persona
  useEffect(() => {
    if (isNew || !personaId) return;

    async function fetchPersona() {
      try {
        const res = await adminFetch(`/api/admin/personas/${personaId}`);
        if (res.ok) {
          const resData = await res.json();
          // Backend wraps in { persona: {...} }
          const data = resData.persona || resData;
          setForm({
            slug: data.slug || "",
            displayName: data.displayName || "",
            tagline: data.tagline || "",
            description: data.description || "",
            avatarUrl: data.avatarUrl || "",
            baseSystemPrompt: data.baseSystemPrompt || "",
            personality:
              typeof data.personality === "object"
                ? JSON.stringify(data.personality, null, 2)
                : data.personality || "",
            categories:
              typeof data.categories === "object"
                ? JSON.stringify(data.categories)
                : data.categories || "[]",
            isActive: data.isActive ?? true,
            isDefault: data.isDefault ?? false,
            sortOrder: data.sortOrder ?? 0,
            customPricing:
              typeof data.customPricing === "object"
                ? JSON.stringify(data.customPricing)
                : data.customPricing || "",
          });

          // Parse pricing config
          const pricingRaw =
            typeof data.customPricing === "object"
              ? JSON.stringify(data.customPricing)
              : data.customPricing || "";
          setPricing(parsePricing(pricingRaw));

          try {
            const cats =
              typeof data.categories === "string"
                ? JSON.parse(data.categories)
                : data.categories;
            setSelectedCategories(Array.isArray(cats) ? cats : []);
          } catch {
            setSelectedCategories([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch persona:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersona();
  }, [isNew, personaId]);

  const updateField = (field: keyof PersonaFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];
      updateField("categories", JSON.stringify(next));
      return next;
    });
  };

  // Auto-generate slug from displayName
  const generateSlug = () => {
    const slug = form.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    updateField("slug", slug);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...form,
        categories: JSON.stringify(selectedCategories),
      };

      const url = isNew
        ? "/api/admin/personas"
        : `/api/admin/personas/${personaId}/config`;
      const method = isNew ? "POST" : "PATCH";

      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        navigate("/admin/personas");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save");
      }
    } catch (err) {
      setError("Failed to save persona");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!personaId) return;
    if (!window.confirm("Are you sure you want to deactivate this persona?"))
      return;

    try {
      await adminFetch(`/api/admin/personas/${personaId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      navigate("/admin/personas");
    } catch (err) {
      setError("Failed to deactivate persona");
    }
  };

  const title = isNew ? "Create New Persona" : `Edit: ${form.displayName}`;

  return (
    <AdminLayout title={title}>
      <button
        onClick={() => navigate("/admin/personas")}
        className="text-gray-500 hover:text-white text-sm flex items-center gap-1 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Personas
      </button>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={(e) =>
                        updateField("displayName", e.target.value)
                      }
                      onBlur={() => {
                        if (!form.slug) generateSlug();
                      }}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                      placeholder="Evelyn Cross"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">
                      URL Slug *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => updateField("slug", e.target.value)}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none font-mono"
                        placeholder="evelyn-cross"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={form.tagline}
                    onChange={(e) => updateField("tagline", e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="Spiritual Guide & Energy Healer"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      updateField("description", e.target.value)
                    }
                    rows={3}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                    placeholder="Describe this persona's background and specialties..."
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Avatar URL
                  </label>
                  <input
                    type="text"
                    value={form.avatarUrl}
                    onChange={(e) => updateField("avatarUrl", e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="/evelyn-avatar.png"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs transition-colors ${
                          selectedCategories.includes(cat)
                            ? "bg-purple-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System prompt */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Base System Prompt *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={form.baseSystemPrompt}
                  onChange={(e) =>
                    updateField("baseSystemPrompt", e.target.value)
                  }
                  rows={12}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-none font-mono"
                  placeholder="You are a spiritual guide named Evelyn Cross..."
                />
                <p className="text-xs text-gray-600 mt-2">
                  This is the core system prompt used for all conversations with
                  this persona.
                </p>
              </CardContent>
            </Card>

            {/* Personality JSON */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Personality Configuration (JSON)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  value={form.personality}
                  onChange={(e) =>
                    updateField("personality", e.target.value)
                  }
                  rows={6}
                  className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-none font-mono"
                  placeholder='{"tone": "warm", "style": "mystical", "specialties": ["love", "energy"]}'
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status & controls */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Status & Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Active</label>
                  <button
                    onClick={() => updateField("isActive", !form.isActive)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.isActive ? "bg-green-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        form.isActive ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">
                    Default Persona
                  </label>
                  <button
                    onClick={() => updateField("isDefault", !form.isDefault)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.isDefault ? "bg-purple-600" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        form.isDefault ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      updateField("sortOrder", parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Per-Persona Pricing */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Pricing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Free minutes */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Free Minutes (per new user)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pricing.freeMinutes}
                    onChange={(e) =>
                      setFreeMinutes(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Minutes granted free before credits are needed.
                  </p>
                </div>

                {/* Credit packages */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400">
                      Credit Packages
                    </label>
                    <button
                      type="button"
                      onClick={addPackage}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add Package
                    </button>
                  </div>

                  {pricing.packages.length === 0 ? (
                    <p className="text-xs text-gray-600 text-center py-3 bg-gray-800/50 rounded-lg">
                      No packages configured. Global defaults will be used.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {pricing.packages.map((pkg, idx) => (
                        <div
                          key={pkg.id || idx}
                          className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              Package {idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => removePackage(idx)}
                              className="text-gray-600 hover:text-red-400 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 mb-0.5 block">
                                Label
                              </label>
                              <input
                                type="text"
                                value={pkg.label}
                                onChange={(e) =>
                                  updatePackage(idx, "label", e.target.value)
                                }
                                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                                placeholder="Quick Reading"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 mb-0.5 block">
                                Minutes
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={pkg.minutes}
                                onChange={(e) =>
                                  updatePackage(
                                    idx,
                                    "minutes",
                                    parseInt(e.target.value) || 1,
                                  )
                                }
                                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 mb-0.5 block">
                                Price (cents USD)
                              </label>
                              <input
                                type="number"
                                min={0}
                                value={pkg.priceUsd}
                                onChange={(e) =>
                                  updatePackage(
                                    idx,
                                    "priceUsd",
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                              />
                            </div>
                            <div className="flex items-end">
                              <div className="w-full bg-gray-800/40 rounded px-2 py-1.5 text-xs text-gray-400 border border-gray-700/30">
                                $
                                {(pkg.priceUsd / 100).toFixed(2)} total
                                {pkg.minutes > 0 && (
                                  <span className="text-purple-400 ml-1">
                                    ($
                                    {(
                                      pkg.priceUsd /
                                      100 /
                                      pkg.minutes
                                    ).toFixed(2)}
                                    /min)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={pkg.popular || false}
                                onChange={(e) =>
                                  updatePackage(
                                    idx,
                                    "popular",
                                    e.target.checked,
                                  )
                                }
                                className="rounded border-gray-600 bg-gray-800 text-purple-500 focus:ring-purple-500 w-3 h-3"
                              />
                              Popular
                            </label>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={pkg.savings || ""}
                                onChange={(e) =>
                                  updatePackage(idx, "savings", e.target.value)
                                }
                                className="w-full bg-gray-800 text-white rounded px-2 py-1 text-[10px] border border-gray-700 focus:border-purple-500 focus:outline-none"
                                placeholder="Savings label (e.g. Save 17%)"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-600">
                  Leave packages empty to use global defaults.
                </p>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="space-y-2">
              {error && (
                <p className="text-red-400 text-xs p-2 bg-red-900/20 rounded-lg">
                  {error}
                </p>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    {isNew ? "Create Persona" : "Save Changes"}
                  </>
                )}
              </Button>
              {!isNew && (
                <Button
                  onClick={handleDeactivate}
                  variant="outline"
                  className="w-full text-red-400 border-red-800 hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Deactivate Persona
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
