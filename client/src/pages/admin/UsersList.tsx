import { useState, useEffect } from "react";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/hooks/useAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  MessageSquare,
  Trash2,
} from "lucide-react";

interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  coinBalance: number;
  totalMinutesUsed: number;
  accountStatus: string;
  totalSessions: number;
  totalSpent: number;
  lastLoginAt: string | null;
  createdAt: string;
}

interface PaginatedUsers {
  users: UserSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export default function UsersList() {
  const [data, setData] = useState<PaginatedUsers | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: "20",
      });
      if (search) params.set("search", search);

      const res = await adminFetch(`/api/admin/users?${params}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;

  async function handleDeleteUser(user: UserSummary, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Permanently delete ${user.firstName} (${user.email})?\n\nThis will delete all their sessions, messages, memories, and purchase history. This cannot be undone.`,
      )
    )
      return;

    try {
      const res = await adminFetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                users: prev.users.filter((u) => u.id !== user.id),
                total: prev.total - 1,
              }
            : prev,
        );
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user.");
      }
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <AdminLayout title="Users">
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 text-sm border border-gray-700 focus:border-purple-500 focus:outline-none"
          />
        </div>
      </form>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats bar */}
          {data && (
            <div className="mb-4 text-sm text-gray-500">
              Showing {data.users.length} of {data.total} users
              {search && (
                <span>
                  {" "}
                  matching "{search}"
                  <button
                    onClick={() => {
                      setSearch("");
                      setSearchInput("");
                    }}
                    className="text-purple-400 hover:underline ml-2"
                  >
                    Clear
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Users table */}
          <Card className="bg-gray-900 border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">
                      User
                    </th>
                    <th className="text-left text-xs text-gray-500 px-4 py-3 font-medium">
                      Status
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Credits
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Sessions
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Spent
                    </th>
                    <th className="text-right text-xs text-gray-500 px-4 py-3 font-medium">
                      Joined
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${user.id}`}>
                          <div className="cursor-pointer">
                            <p className="text-sm text-white hover:text-purple-300 transition-colors">
                              {user.firstName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {user.email}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            user.accountStatus === "active"
                              ? "text-green-400 border-green-800"
                              : user.accountStatus === "suspended"
                                ? "text-red-400 border-red-800"
                                : "text-gray-500 border-gray-700"
                          }`}
                        >
                          {user.accountStatus}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-white">
                          {user.coinBalance} coins
                        </span>
                        <span className="text-xs text-gray-600 block">
                          {user.totalMinutesUsed ?? 0}m used
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        {user.totalSessions ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-white">
                        ${((user.totalSpent ?? 0) / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => handleDeleteUser(user, e)}
                          title="Delete user"
                          className="text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="text-gray-400 border-gray-700"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {data?.users.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              No users found.
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
