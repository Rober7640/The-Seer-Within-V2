import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GripVertical, Star, CheckCircle2, Save } from "lucide-react";

interface MarketingPersona {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  accuracyRank: number | null;
  sortOrder: number;
}

export default function MarketplacePage() {
  const [personas, setPersonas] = useState<MarketingPersona[]>([]);
  const [accuracyOrder, setAccuracyOrder] = useState<MarketingPersona[]>([]);
  const [unranked, setUnranked] = useState<MarketingPersona[]>([]);
  const [featuredId, setFeaturedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await adminFetch("/api/admin/marketplace");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: MarketingPersona[] = await res.json();
        setPersonas(data);

        const ranked = [...data]
          .filter((p) => p.accuracyRank !== null)
          .sort((a, b) => (a.accuracyRank ?? 0) - (b.accuracyRank ?? 0));
        const notRanked = data.filter((p) => p.accuracyRank === null);

        setAccuracyOrder(ranked);
        setUnranked(notRanked);
        setFeaturedId(data.find((p) => p.isFeatured)?.id ?? null);
      } catch (err: any) {
        setError("Failed to load marketplace data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Drag handlers for accuracy order list ──
  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOver.current = index;
  }

  function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    const updated = [...accuracyOrder];
    const [moved] = updated.splice(dragItem.current, 1);
    updated.splice(dragOver.current, 0, moved);
    setAccuracyOrder(updated);
    dragItem.current = null;
    dragOver.current = null;
    setSaved(false);
  }

  function addToRanked(persona: MarketingPersona) {
    setAccuracyOrder((prev) => [...prev, persona]);
    setUnranked((prev) => prev.filter((p) => p.id !== persona.id));
    setSaved(false);
  }

  function removeFromRanked(persona: MarketingPersona) {
    setUnranked((prev) => [...prev, persona]);
    setAccuracyOrder((prev) => prev.filter((p) => p.id !== persona.id));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // Save accuracy ranks
      const ranks = [
        ...accuracyOrder.map((p, i) => ({ id: p.id, rank: i + 1 })),
        ...unranked.map((p) => ({ id: p.id, rank: null })),
      ];
      const ranksRes = await adminFetch("/api/admin/marketplace/accuracy-ranks", {
        method: "PUT",
        body: JSON.stringify(ranks),
      });
      if (!ranksRes.ok) throw new Error(`Ranks save failed: ${ranksRes.status}`);

      // Save featured
      const featuredRes = await adminFetch("/api/admin/marketplace/featured", {
        method: "PUT",
        body: JSON.stringify({ id: featuredId }),
      });
      if (!featuredRes.ok) throw new Error(`Featured save failed: ${featuredRes.status}`);

      setSaved(true);
    } catch (err: any) {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout title="Marketplace Layout">
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="space-y-8 max-w-2xl">
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* ── Voted Most Accurate ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-amber-400" />
              <h2 className="text-white font-semibold text-lg">Voted Most Accurate</h2>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Drag to reorder. The top 3 appear in the "Voted Most Accurate" section.
            </p>

            {/* Ranked list */}
            {accuracyOrder.length === 0 && (
              <p className="text-gray-500 text-sm italic mb-4">
                No guides ranked yet. Add some from below.
              </p>
            )}

            <div className="space-y-2 mb-4">
              {accuracyOrder.map((p, i) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 cursor-grab active:cursor-grabbing select-none"
                >
                  <GripVertical className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="w-6 text-center text-[13px] font-bold text-purple-400">
                    #{i + 1}
                  </span>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={p.avatarUrl || undefined} alt={p.displayName} />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                      {p.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-white text-sm font-medium">
                    {p.displayName}
                  </span>
                  <button
                    onClick={() => removeFromRanked(p)}
                    className="text-gray-500 hover:text-red-400 text-xs transition-colors px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Unranked pool */}
            {unranked.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
                  Not ranked — click + to add
                </p>
                <div className="space-y-1.5">
                  {unranked.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 bg-gray-850 border border-gray-700/50 rounded-lg px-3 py-2 opacity-60"
                    >
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarImage src={p.avatarUrl || undefined} alt={p.displayName} />
                        <AvatarFallback className="bg-gray-700 text-white text-xs">
                          {p.displayName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-gray-300 text-sm">{p.displayName}</span>
                      <button
                        onClick={() => addToRanked(p)}
                        className="text-purple-400 hover:text-purple-300 text-sm font-bold px-2 transition-colors"
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Guide of the Day ── */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <h2 className="text-white font-semibold text-lg">Guide of the Day</h2>
            </div>
            <p className="text-gray-400 text-sm mb-5">
              Select which guide appears in the featured "Guide of the Day" section.
            </p>

            <div className="space-y-2">
              <label className="flex items-center gap-3 bg-gray-800 border border-gray-700/50 rounded-lg px-3 py-2.5 cursor-pointer hover:border-gray-600 transition-colors">
                <input
                  type="radio"
                  name="featured"
                  value=""
                  checked={featuredId === null}
                  onChange={() => { setFeaturedId(null); setSaved(false); }}
                  className="accent-purple-500"
                />
                <span className="text-gray-400 text-sm italic">None (hide section)</span>
              </label>

              {personas.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer border transition-colors ${
                    featuredId === p.id
                      ? "bg-purple-900/30 border-purple-600/50"
                      : "bg-gray-800 border-gray-700/50 hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="featured"
                    value={p.id}
                    checked={featuredId === p.id}
                    onChange={() => { setFeaturedId(p.id); setSaved(false); }}
                    className="accent-purple-500"
                  />
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarImage src={p.avatarUrl || undefined} alt={p.displayName} />
                    <AvatarFallback className="bg-gray-700 text-white text-xs">
                      {p.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white text-sm font-medium">{p.displayName}</span>
                  {featuredId === p.id && (
                    <span className="ml-auto text-[11px] text-purple-400 font-semibold uppercase tracking-wide">
                      Featured
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* ── Save button ── */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 h-10"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            {saved && (
              <span className="text-green-400 text-sm flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </span>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
