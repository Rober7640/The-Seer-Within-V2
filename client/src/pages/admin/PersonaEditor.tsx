import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, ArrowLeft, Trash2, Eye, Plus, X, Upload, ImageIcon, Star } from "lucide-react";
import { CENTS_PER_MINUTE_DEFAULT } from "@shared/types";

interface Review {
  id: string;
  reviewerName: string;
  reviewText: string | null;
  starRating: number;
  createdAt: string;
}

interface SessionFeedbackItem {
  id: string;
  sessionId: string;
  userId: string;
  starRating: number;
  feedbackText: string | null;
  displayName: string | null;
  approved: boolean;
  createdAt: string;
  userEmail: string | null;
  userFirstName: string | null;
}

interface PricingPackage {
  id: string;
  label: string;
  minutes: number;
  priceUsd: number; // in cents
  popular?: boolean;
  savings?: string;
}

interface PricingConfig {
  freeCoins: number;
  packages: PricingPackage[];
}

interface AvailabilityWindow {
  days: number[];
  startTime: string;
  endTime: string;
}

interface AvailabilitySchedule {
  timezone: string;
  windows: AvailabilityWindow[];
}

interface CyclicBreakSchedule {
  enabled: boolean;
  availableMinutes: number;
  breakMinutes: number;
}

const DAY_LABELS = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'];

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
  coinsPerMinute: number;
  yearsExperience: number | null;
  readingsCount: number | null;
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
  coinsPerMinute: CENTS_PER_MINUTE_DEFAULT,
  yearsExperience: null,
  readingsCount: null,
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [pricing, setPricing] = useState<PricingConfig>({
    freeCoins: 0,
    packages: [],
  });
  const [onlineOverride, setOnlineOverride] = useState<null | 'online' | 'offline'>(null);
  const [availabilitySchedule, setAvailabilitySchedule] = useState<AvailabilitySchedule>({
    timezone: 'America/New_York',
    windows: [],
  });
  const [cyclicBreak, setCyclicBreak] = useState<CyclicBreakSchedule>({
    enabled: false,
    availableMinutes: 30,
    breakMinutes: 7,
  });
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ reviewerName: '', reviewText: '', starRating: 5 });
  const [addingReview, setAddingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [sessionFeedbackItems, setSessionFeedbackItems] = useState<SessionFeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Per-persona AI model overrides
  const [aiModel, setAiModel] = useState<string>("");  // "" = use default
  const [basicModel, setBasicModel] = useState<string>("");  // "" = use default
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; label: string; tier: string }>>([]);
  const [modelDefaults, setModelDefaults] = useState({ conversationModel: "", basicModel: "" });

  // Extract suggestedQuestions from personality JSON
  const extractSuggestedQuestions = (personalityJson: string): string[] => {
    try {
      const parsed = personalityJson ? JSON.parse(personalityJson) : {};
      const qs = parsed?.suggestedQuestions;
      return Array.isArray(qs) ? qs : [];
    } catch {
      return [];
    }
  };

  // Merge suggestedQuestions into personality JSON
  const mergeQuestionsIntoPersonality = (personalityJson: string, questions: string[]): string => {
    try {
      const base = personalityJson ? JSON.parse(personalityJson) : {};
      const merged = { ...base, suggestedQuestions: questions.filter(q => q.trim()) };
      return JSON.stringify(merged, null, 2);
    } catch {
      return personalityJson;
    }
  };

  const parsePricing = (raw: string): PricingConfig => {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        // Old DB format: array of PricingTier — migrate to new shape
        return {
          freeCoins: 0,
          packages: parsed.map((pkg: any, i: number) => ({
            id: pkg.id || `pkg-${i}`,
            label: pkg.label || "",
            minutes: pkg.minutes || 15,
            priceUsd: pkg.priceUsd || 0,
            popular: pkg.popular,
            savings: pkg.savings,
          })),
        };
      }
      return {
        freeCoins: parsed.freeCoins ?? 0,
        packages: Array.isArray(parsed.packages) ? parsed.packages : [],
      };
    } catch {
      return { freeCoins: 0, packages: [] };
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

  const setFreeCoins = (coins: number) => {
    const next: PricingConfig = { ...pricing, freeCoins: coins };
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
          // Normalize customPricing to the current { freeCoins, packages } shape
          // regardless of whether the DB stored it as an array (old format) or object.
          const pricingRaw =
            typeof data.customPricing === "object"
              ? JSON.stringify(data.customPricing)
              : data.customPricing || "";
          const normalizedPricing = parsePricing(pricingRaw);
          setPricing(normalizedPricing);

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
            // Always store the normalised object shape so save() sends a valid object
            customPricing: pricingRaw ? JSON.stringify(normalizedPricing) : "",
            coinsPerMinute: data.coinsPerMinute ?? CENTS_PER_MINUTE_DEFAULT,
            yearsExperience: data.yearsExperience ?? null,
            readingsCount: data.readingsCount ?? null,
          });

          // Extract suggestedQuestions from personality
          const personalityRaw =
            typeof data.personality === "object"
              ? JSON.stringify(data.personality, null, 2)
              : data.personality || "";
          setSuggestedQuestions(extractSuggestedQuestions(personalityRaw));

          try {
            const cats =
              typeof data.categories === "string"
                ? JSON.parse(data.categories)
                : data.categories;
            setSelectedCategories(Array.isArray(cats) ? cats : []);
          } catch {
            setSelectedCategories([]);
          }

          // Availability scheduling
          setOnlineOverride(data.onlineOverride ?? null);
          if (data.availabilitySchedule) {
            try {
              const sched =
                typeof data.availabilitySchedule === "object"
                  ? data.availabilitySchedule
                  : JSON.parse(data.availabilitySchedule);
              setAvailabilitySchedule(sched);
            } catch {
              // leave default
            }
          }

          // Cyclic break schedule
          if (data.cyclicBreakSchedule) {
            try {
              const cb =
                typeof data.cyclicBreakSchedule === "object"
                  ? data.cyclicBreakSchedule
                  : JSON.parse(data.cyclicBreakSchedule);
              setCyclicBreak(cb);
            } catch {
              // leave default
            }
          }

          // Overall rating
          setOverallRating(data.overallRating ?? null);

          // Per-persona model overrides
          setAiModel(data.aiModel || "");
          setBasicModel(data.basicModel || "");
        }

        // Fetch reviews separately
        try {
          const reviewsRes = await adminFetch(`/api/admin/personas/${personaId}/reviews`);
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json();
            setReviews(reviewsData.reviews || []);
          }
        } catch {
          // non-fatal — reviews just won't show
        }

        // Fetch session feedback queue
        try {
          setFeedbackLoading(true);
          const feedbackRes = await adminFetch(`/api/admin/personas/${personaId}/session-feedback`);
          if (feedbackRes.ok) {
            const feedbackData = await feedbackRes.json();
            setSessionFeedbackItems(feedbackData.feedback || []);
          }
        } catch {
          // non-fatal
        } finally {
          setFeedbackLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch persona:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPersona();
  }, [isNew, personaId]);

  // Fetch available AI models for dropdowns
  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await adminFetch("/api/admin/settings/models");
        if (res.ok) {
          const data = await res.json();
          setAvailableModels(data.availableModels || []);
          setModelDefaults({
            conversationModel: data.defaultConversationModel || "",
            basicModel: data.defaultBasicModel || "",
          });
        }
      } catch {
        // non-fatal — dropdowns will just be empty
      }
    }
    fetchModels();
  }, []);

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

  const addCustomCategory = () => {
    const cat = customCategoryInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cat || selectedCategories.includes(cat)) {
      setCustomCategoryInput("");
      return;
    }
    setSelectedCategories((prev) => {
      const next = [...prev, cat];
      updateField("categories", JSON.stringify(next));
      return next;
    });
    setCustomCategoryInput("");
  };

  const removeCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = prev.filter((c) => c !== cat);
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
      const personalityWithQuestions = mergeQuestionsIntoPersonality(
        form.personality,
        suggestedQuestions,
      );

      // Build payload with properly typed fields.
      // The API schema expects objects/arrays — not JSON strings.
      const payload: Record<string, unknown> = {
        displayName: form.displayName,
        tagline: form.tagline || undefined,
        description: form.description || undefined,
        baseSystemPrompt: form.baseSystemPrompt,
        isDefault: form.isDefault,
        sortOrder: form.sortOrder,
        categories: selectedCategories, // array, not JSON string
      };

      // slug is required when creating a new persona
      if (isNew) {
        payload.slug = form.slug;
      }

      // avatarUrl must be a valid URL or omitted — never send an empty string
      if (form.avatarUrl.trim()) {
        payload.avatarUrl = form.avatarUrl.trim();
      }

      // personality must be an object, not a JSON string
      if (personalityWithQuestions) {
        try {
          payload.personality = JSON.parse(personalityWithQuestions);
        } catch {
          setError("Personality JSON is invalid — please check the format.");
          setSaving(false);
          return;
        }
      }

      // customPricing must be an object, not a JSON string
      if (form.customPricing) {
        try {
          payload.customPricing = JSON.parse(form.customPricing);
        } catch {
          setError("Custom pricing JSON is invalid — please check the format.");
          setSaving(false);
          return;
        }
      }

      // Availability
      payload.onlineOverride = onlineOverride;
      payload.availabilitySchedule = availabilitySchedule.windows.length > 0
        ? availabilitySchedule
        : null;
      payload.cyclicBreakSchedule = cyclicBreak.enabled ? cyclicBreak : null;

      // Overall rating
      payload.overallRating = overallRating;

      // Per-minute rate
      payload.coinsPerMinute = form.coinsPerMinute;

      // Social proof stats
      payload.yearsExperience = form.yearsExperience;
      payload.readingsCount = form.readingsCount;

      // Per-persona AI model overrides (empty string = null = use default)
      payload.aiModel = aiModel || null;
      payload.basicModel = basicModel || null;

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
        const details = data.details?.map((d: any) => `${d.path || 'field'}: ${d.message}`).join('; ');
        setError(details ? `${data.error} — ${details}` : data.error || "Failed to save");
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

  const handleAddReview = async () => {
    if (!personaId || !newReview.reviewerName.trim()) return;
    setAddingReview(true);
    setReviewError(null);
    try {
      const res = await adminFetch(`/api/admin/personas/${personaId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          reviewerName: newReview.reviewerName.trim(),
          reviewText: newReview.reviewText.trim() || undefined,
          starRating: newReview.starRating,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => [...prev, data.review]);
        setNewReview({ reviewerName: '', reviewText: '', starRating: 5 });
      } else {
        const data = await res.json();
        setReviewError(data.error || "Failed to add review");
      }
    } catch {
      setReviewError("Failed to add review");
    } finally {
      setAddingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!personaId) return;
    if (!window.confirm("Delete this review?")) return;
    try {
      const res = await adminFetch(`/api/admin/personas/${personaId}/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      }
    } catch {
      // non-fatal
    }
  };

  const handleApproveFeedback = async (feedbackId: string) => {
    if (!personaId) return;
    try {
      const res = await adminFetch(`/api/admin/personas/${personaId}/session-feedback/${feedbackId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        setSessionFeedbackItems((prev) =>
          prev.map((f) => f.id === feedbackId ? { ...f, approved: true } : f)
        );
      }
    } catch {
      // non-fatal
    }
  };

  const handleDeleteFeedback = async (feedbackId: string) => {
    if (!personaId) return;
    if (!window.confirm("Permanently delete this feedback?")) return;
    try {
      const res = await adminFetch(`/api/admin/personas/${personaId}/session-feedback/${feedbackId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSessionFeedbackItems((prev) => prev.filter((f) => f.id !== feedbackId));
      }
    } catch {
      // non-fatal
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await adminFetch("/api/admin/personas/upload-avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setUploadError(data.error || "Upload failed");
        return;
      }
      const data = await res.json();
      updateField("avatarUrl", data.url);
    } catch {
      setUploadError("Upload failed — check your connection");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
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

                {/* ── Avatar Photo ──────────────────────────────────────── */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Avatar Photo
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Recommended: <span className="text-gray-300 font-medium">400 × 400 px</span>, square (1:1).
                    Formats: JPEG, PNG, WebP. Max size: 2 MB.
                  </p>

                  <div className="flex items-center gap-3">
                    {/* Preview */}
                    <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {form.avatarUrl ? (
                        <img
                          src={form.avatarUrl}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    {/* Upload button */}
                    <div className="flex flex-col gap-1.5 flex-1">
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={uploadingAvatar}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                      >
                        <Upload className="w-3 h-3" />
                        {uploadingAvatar ? "Uploading…" : "Upload photo"}
                      </button>
                      {uploadError && (
                        <p className="text-xs text-red-400">{uploadError}</p>
                      )}
                    </div>
                  </div>

                  {/* Manual URL override */}
                  <div className="mt-2">
                    <label className="text-xs text-gray-500 mb-1 block">
                      Or paste URL directly
                    </label>
                    <input
                      type="text"
                      value={form.avatarUrl}
                      onChange={(e) => updateField("avatarUrl", e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                      placeholder="/uploads/avatars/avatar-123.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Categories
                  </label>
                  {/* Quick-add preset buttons */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <button
                        key={cat}
                        type="button"
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
                  {/* Custom categories (non-preset) shown as removable chips */}
                  {selectedCategories.filter((c) => !CATEGORY_OPTIONS.includes(c)).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {selectedCategories
                        .filter((c) => !CATEGORY_OPTIONS.includes(c))
                        .map((cat) => (
                          <span
                            key={cat}
                            className="flex items-center gap-1 px-3 py-1 rounded-full text-xs bg-indigo-700 text-white"
                          >
                            {cat}
                            <button
                              type="button"
                              onClick={() => removeCategory(cat)}
                              className="hover:text-red-300 transition-colors ml-0.5"
                              aria-label={`Remove ${cat}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                  {/* Free-text custom category input */}
                  <div className="flex gap-2 mt-1">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addCustomCategory(); }
                      }}
                      className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                      placeholder="Add custom category (e.g. astrology)"
                    />
                    <button
                      type="button"
                      onClick={addCustomCategory}
                      className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
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

            {/* Suggested Questions */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">
                    Suggested Questions (Chat Bubbles)
                  </CardTitle>
                  <button
                    type="button"
                    onClick={() => setSuggestedQuestions((prev) => [...prev, ""])}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Add Question
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  Shown as tappable bubbles after the greeting. Tapping auto-sends the question.
                </p>
                {suggestedQuestions.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4 bg-gray-800/50 rounded-lg">
                    No questions yet. Click "Add Question" to add one.
                  </p>
                ) : (
                  suggestedQuestions.map((q, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const updated = [...suggestedQuestions];
                          updated[i] = e.target.value;
                          setSuggestedQuestions(updated);
                        }}
                        className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="e.g. Will I find love this year?"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setSuggestedQuestions((prev) =>
                            prev.filter((_, idx) => idx !== i)
                          )
                        }
                        className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                        aria-label="Remove question"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Feedback Queue — real user feedback pending/approved moderation */}
          {!isNew && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-teal-400" />
                    Feedback Queue
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {sessionFeedbackItems.filter((f) => !f.approved).length > 0 && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
                        {sessionFeedbackItems.filter((f) => !f.approved).length} pending
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {sessionFeedbackItems.filter((f) => f.approved).length} approved
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-gray-500">
                  Real feedback submitted by users after sessions. Approve to display publicly as "User Reviews".
                </p>
                {feedbackLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : sessionFeedbackItems.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4 bg-gray-800/50 rounded-lg">
                    No user feedback yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {sessionFeedbackItems.map((f) => (
                      <div
                        key={f.id}
                        className={`rounded-lg p-3 border ${f.approved ? 'bg-teal-900/10 border-teal-700/30' : 'bg-gray-800/50 border-gray-700/50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <div className="flex gap-0.5 shrink-0">
                                {[1,2,3,4,5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${s <= f.starRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                                  />
                                ))}
                              </div>
                              <span className="text-xs text-gray-400">
                                {f.userFirstName || f.userEmail || 'Unknown user'}
                                {f.displayName && (
                                  <span className="text-teal-400 ml-1">(shows as: {f.displayName})</span>
                                )}
                                {!f.displayName && (
                                  <span className="text-gray-600 ml-1">(shows as: Verified User)</span>
                                )}
                              </span>
                              <span className="text-[10px] text-gray-600">
                                {new Date(f.createdAt).toLocaleDateString()}
                              </span>
                              {f.approved && (
                                <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-500/20 px-1.5 py-0.5 rounded-full">
                                  Live
                                </span>
                              )}
                            </div>
                            {f.feedbackText && (
                              <p className="text-xs text-gray-400 leading-relaxed">&ldquo;{f.feedbackText}&rdquo;</p>
                            )}
                            {!f.feedbackText && (
                              <p className="text-xs text-gray-600 italic">No written feedback</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!f.approved && (
                              <button
                                type="button"
                                onClick={() => handleApproveFeedback(f.id)}
                                className="text-xs bg-teal-600 hover:bg-teal-500 text-white rounded px-2 py-1 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteFeedback(f.id)}
                              className="text-gray-600 hover:text-red-400 transition-colors mt-0.5"
                              aria-label="Delete feedback"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reviews — only shown for existing personas */}
          {!isNew && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    Reviews & Testimonials
                  </CardTitle>
                  <span className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing reviews */}
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4 bg-gray-800/50 rounded-lg">
                    No reviews yet. Add the first one below.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div key={r.id} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-white truncate">{r.reviewerName}</span>
                              <div className="flex gap-0.5 shrink-0">
                                {[1,2,3,4,5].map((s) => (
                                  <Star
                                    key={s}
                                    className={`w-3 h-3 ${s <= r.starRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                                  />
                                ))}
                              </div>
                            </div>
                            {r.reviewText && (
                              <p className="text-xs text-gray-400 leading-relaxed">{r.reviewText}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(r.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                            aria-label="Delete review"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new review form */}
                <div className="border-t border-gray-800 pt-4 space-y-3">
                  <p className="text-xs text-gray-500 font-medium">Add Review</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Reviewer Name *</label>
                      <input
                        type="text"
                        value={newReview.reviewerName}
                        onChange={(e) => setNewReview((p) => ({ ...p, reviewerName: e.target.value }))}
                        className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="e.g. Sarah M."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Star Rating *</label>
                      <div className="flex gap-1 items-center h-9">
                        {[1,2,3,4,5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setNewReview((p) => ({ ...p, starRating: s }))}
                            className="transition-colors"
                          >
                            <Star
                              className={`w-5 h-5 ${s <= newReview.starRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 mb-1 block">Review Text <span className="text-gray-600">(optional)</span></label>
                    <textarea
                      value={newReview.reviewText}
                      onChange={(e) => setNewReview((p) => ({ ...p, reviewText: e.target.value }))}
                      rows={2}
                      className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none resize-none"
                      placeholder="She was incredibly accurate and insightful…"
                    />
                  </div>
                  {reviewError && (
                    <p className="text-red-400 text-xs">{reviewError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAddReview}
                    disabled={addingReview || !newReview.reviewerName.trim()}
                    className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors"
                  >
                    {addingReview ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Add Review
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
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
                <div>
                  <label className="text-xs text-gray-400 mb-1 block flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400" />
                    Overall Rating (0–5)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={overallRating ?? ''}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setOverallRating(isNaN(v) ? null : Math.min(5, Math.max(0, v)));
                    }}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. 4.8"
                  />
                  <p className="text-xs text-gray-600 mt-1">Displayed on the persona browse page.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Years Experience
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.yearsExperience ?? ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      updateField("yearsExperience", isNaN(v) ? null : Math.max(0, v));
                    }}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. 12"
                  />
                  <p className="text-xs text-gray-600 mt-1">Shown on persona cards.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Readings Count
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.readingsCount ?? ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      updateField("readingsCount", isNaN(v) ? null : Math.max(0, v));
                    }}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="e.g. 3200"
                  />
                  <p className="text-xs text-gray-600 mt-1">Shown on persona cards.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Price ($ / minute)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">$</span>
                    <input
                      type="number"
                      min={0.5}
                      max={20}
                      step={0.01}
                      // Stored in cents (a coin is a cent): 299 ⇄ $2.99. The admin types
                      // dollars; we persist round(dollars × 100) as coinsPerMinute(cents/min).
                      value={(form.coinsPerMinute / 100).toString()}
                      onChange={(e) => {
                        const dollars = parseFloat(e.target.value);
                        updateField(
                          "coinsPerMinute",
                          isNaN(dollars) ? CENTS_PER_MINUTE_DEFAULT : Math.max(1, Math.round(dollars * 100)),
                        );
                      }}
                      className="w-full bg-gray-800 text-white rounded-lg pl-7 pr-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                      placeholder="2.99"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Dollars charged per minute of live reading — flows through the whole funnel (packs, paywall, in-chat meter, billing). Default: $2.99. Reset free trial time if you change this.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* AI Model Selection */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">AI Model</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Conversation Model
                  </label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">
                      Use default{modelDefaults.conversationModel ? ` (${availableModels.find(m => m.id === modelDefaults.conversationModel)?.label || modelDefaults.conversationModel})` : ""}
                    </option>
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.tier}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Model for main chat responses. Leave as default unless you want to override.</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    Basic Model
                  </label>
                  <select
                    value={basicModel}
                    onChange={(e) => setBasicModel(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">
                      Use default{modelDefaults.basicModel ? ` (${availableModels.find(m => m.id === modelDefaults.basicModel)?.label || modelDefaults.basicModel})` : ""}
                    </option>
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.tier}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-600 mt-1">Model for greetings & summaries. Recommended: a cheaper model like Haiku.</p>
                </div>
              </CardContent>
            </Card>

            {/* Availability Scheduling */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-sm">Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Manual Override */}
                <div>
                  <label className="text-xs text-gray-400 mb-2 block">Manual Override</label>
                  <div className="flex gap-1">
                    {([null, 'online', 'offline'] as const).map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setOnlineOverride(val)}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                          onlineOverride === val
                            ? val === 'online'
                              ? 'bg-green-600 text-white'
                              : val === 'offline'
                              ? 'bg-red-700 text-white'
                              : 'bg-purple-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {val === null ? 'Schedule' : val === 'online' ? 'Force Online' : 'Force Offline'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Timezone</label>
                  <input
                    type="text"
                    value={availabilitySchedule.timezone}
                    onChange={(e) =>
                      setAvailabilitySchedule((s) => ({ ...s, timezone: e.target.value }))
                    }
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="America/New_York"
                  />
                </div>

                {availabilitySchedule.windows.map((win, idx) => (
                  <div key={idx} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-gray-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Window {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAvailabilitySchedule((s) => ({
                            ...s,
                            windows: s.windows.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {/* Day toggles */}
                    <div className="flex gap-1 flex-wrap">
                      {DAY_LABELS.map((label, dayNum) => (
                        <button
                          key={dayNum}
                          type="button"
                          onClick={() => {
                            setAvailabilitySchedule((s) => {
                              const updated = [...s.windows];
                              const days = updated[idx].days.includes(dayNum)
                                ? updated[idx].days.filter((d) => d !== dayNum)
                                : [...updated[idx].days, dayNum].sort();
                              updated[idx] = { ...updated[idx], days };
                              return { ...s, windows: updated };
                            });
                          }}
                          className={`w-7 h-7 rounded text-[10px] font-medium transition-colors ${
                            win.days.includes(dayNum)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    {/* Time range */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={win.startTime}
                        onChange={(e) =>
                          setAvailabilitySchedule((s) => {
                            const updated = [...s.windows];
                            updated[idx] = { ...updated[idx], startTime: e.target.value };
                            return { ...s, windows: updated };
                          })
                        }
                        className="flex-1 bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="09:00"
                      />
                      <span className="text-gray-500 text-xs">to</span>
                      <input
                        type="text"
                        value={win.endTime}
                        onChange={(e) =>
                          setAvailabilitySchedule((s) => {
                            const updated = [...s.windows];
                            updated[idx] = { ...updated[idx], endTime: e.target.value };
                            return { ...s, windows: updated };
                          })
                        }
                        className="flex-1 bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                        placeholder="17:00"
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setAvailabilitySchedule((s) => ({
                      ...s,
                      windows: [
                        ...s.windows,
                        { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
                      ],
                    }))
                  }
                  className="w-full text-xs text-purple-400 hover:text-purple-300 flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-700 rounded-lg transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Window
                </button>

                {/* Cyclic Breaks */}
                <div className="pt-3 border-t border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="text-xs text-gray-400 block">Cyclic Breaks</label>
                      <p className="text-xs text-gray-600 mt-0.5">Guide goes "Busy" for a short break on a repeating cycle.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCyclicBreak((s) => ({ ...s, enabled: !s.enabled }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                        cyclicBreak.enabled ? 'bg-purple-600' : 'bg-gray-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                          cyclicBreak.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                        }`}
                      />
                    </button>
                  </div>
                  {cyclicBreak.enabled && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Online duration (min)</label>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={cyclicBreak.availableMinutes}
                            onChange={(e) =>
                              setCyclicBreak((s) => ({
                                ...s,
                                availableMinutes: Math.max(1, parseInt(e.target.value) || 30),
                              }))
                            }
                            className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Break duration (min)</label>
                          <input
                            type="number"
                            min={1}
                            max={60}
                            value={cyclicBreak.breakMinutes}
                            onChange={(e) =>
                              setCyclicBreak((s) => ({
                                ...s,
                                breakMinutes: Math.max(1, parseInt(e.target.value) || 7),
                              }))
                            }
                            className="w-full bg-gray-800 text-white rounded px-2 py-1.5 text-xs border border-gray-700 focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 bg-gray-800/60 rounded-lg px-3 py-2">
                        Online for <span className="text-purple-400">{cyclicBreak.availableMinutes} min</span>, then busy for <span className="text-rose-400">{cyclicBreak.breakMinutes} min</span> — repeating all day.
                        {' '}Cycle: every {cyclicBreak.availableMinutes + cyclicBreak.breakMinutes} min.
                      </p>
                    </div>
                  )}
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
                    Free Coins (per new user)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={pricing.freeCoins}
                    onChange={(e) =>
                      setFreeCoins(parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-gray-800 text-white rounded-lg px-3 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Coins granted free before credits are needed.
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
