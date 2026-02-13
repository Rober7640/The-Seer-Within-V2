import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Plus,
  Edit,
  BarChart3,
  Pause,
  Play,
  Users,
  DollarSign,
  MessageSquare,
} from "lucide-react";

interface PersonaStats {
  id: string;
  slug: string;
  displayName: string;
  tagline: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  categories: string | null;
  // Stats
  totalUsers: number;
  totalSessions: number;
  totalRevenue: number;
  activeSessionsNow: number;
}

export default function PersonasDashboard() {
  const [personas, setPersonas] = useState<PersonaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused"
  >("all");

  useEffect(() => {
    fetchPersonas();
  }, []);

  async function fetchPersonas() {
    try {
      const res = await adminFetch("/api/admin/personas?stats=true");
      if (res.ok) {
        const data = await res.json();
        setPersonas(data.personas || []);
      }
    } catch (err) {
      console.error("Failed to fetch personas:", err);
    } finally {
      setLoading(false);
    }
  }

  async function togglePersonaStatus(personaId: string, isActive: boolean) {
    try {
      await adminFetch(`/api/admin/personas/${personaId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !isActive }),
      });
      setPersonas((prev) =>
        prev.map((p) =>
          p.id === personaId ? { ...p, isActive: !isActive } : p,
        ),
      );
    } catch (err) {
      console.error("Failed to toggle persona:", err);
    }
  }

  const filtered =
    statusFilter === "all"
      ? personas
      : personas.filter((p) =>
          statusFilter === "active" ? p.isActive : !p.isActive,
        );

  const totalUsers = personas.reduce((sum, p) => sum + p.totalUsers, 0);
  const totalRevenue = personas.reduce((sum, p) => sum + p.totalRevenue, 0);
  const activeSessions = personas.reduce(
    (sum, p) => sum + p.activeSessionsNow,
    0,
  );

  return (
    <AdminLayout title="Personas">
      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Personas</p>
                <p className="text-2xl font-bold text-white">
                  {personas.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-white">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  ${(totalRevenue / 100).toFixed(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600/20 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Active Sessions</p>
                <p className="text-2xl font-bold text-white">
                  {activeSessions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {(["all", "active", "paused"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                statusFilter === filter
                  ? "bg-purple-600/20 text-purple-300"
                  : "text-gray-500 hover:text-white"
              }`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
        </div>
        <Link href="/admin/personas/new">
          <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-1" />
            New Persona
          </Button>
        </Link>
      </div>

      {/* Personas grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((persona) => (
            <Card
              key={persona.id}
              className={`bg-gray-900 border-gray-800 transition-all ${
                !persona.isActive ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-gray-700">
                      <AvatarImage
                        src={persona.avatarUrl || "/evelyn-avatar.png"}
                        alt={persona.displayName}
                      />
                      <AvatarFallback>
                        {persona.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {persona.displayName}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            persona.isActive
                              ? "text-green-400 border-green-800"
                              : "text-gray-500 border-gray-700"
                          }`}
                        >
                          {persona.isActive ? "Active" : "Paused"}
                        </Badge>
                        {persona.isDefault && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-purple-400 border-purple-800"
                          >
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {persona.tagline && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-1">
                    {persona.tagline}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {persona.totalUsers}
                    </p>
                    <p className="text-[10px] text-gray-500">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      {persona.totalSessions}
                    </p>
                    <p className="text-[10px] text-gray-500">Sessions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-white">
                      ${(persona.totalRevenue / 100).toFixed(0)}
                    </p>
                    <p className="text-[10px] text-gray-500">Revenue</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Link href={`/admin/personas/${persona.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs flex-1 text-gray-300 border-gray-700"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs text-gray-300 border-gray-700"
                    onClick={() =>
                      togglePersonaStatus(persona.id, persona.isActive)
                    }
                  >
                    {persona.isActive ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </Button>
                  <Link href={`/admin/analytics?persona=${persona.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-gray-300 border-gray-700"
                    >
                      <BarChart3 className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No personas found.{" "}
          <Link
            href="/admin/personas/new"
            className="text-purple-400 hover:underline"
          >
            Create one
          </Link>
        </div>
      )}
    </AdminLayout>
  );
}
