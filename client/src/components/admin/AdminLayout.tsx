import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Users,
  Bot,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Shield,
  Brain,
  Mail,
  LayoutGrid,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/admin/personas", label: "Personas", icon: Bot },
  { path: "/admin/prompts", label: "Prompts", icon: FileText },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/admin/users", label: "Users", icon: Users },
  { path: "/admin/safety", label: "Safety", icon: Shield },
  { path: "/admin/intent-configs", label: "Intent Configs", icon: Brain },
  { path: "/admin/follow-ups", label: "Follow-Ups", icon: Mail },
  { path: "/admin/marketplace", label: "Marketplace", icon: LayoutGrid },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { admin, isLoading, isAuthenticated, logout } = useAdmin();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="font-serif text-lg text-white">Seer Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-purple-600/20 text-purple-300"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 truncate">
              {admin?.displayName}
            </div>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-2xl font-serif text-white mb-6">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
