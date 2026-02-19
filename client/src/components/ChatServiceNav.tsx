import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CreditBadge } from "@/components/CreditBadge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sparkles,
  Users,
  Coins,
  LayoutDashboard,
  LogOut,
  Menu,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const NAV_ITEMS = [
  { path: "/reading", label: "Start Reading", shortLabel: "Reading", icon: Sparkles },
  { path: "/personas", label: "Browse Personas", shortLabel: "Personas", icon: Users },
  { path: "/credits", label: "Credits", shortLabel: "Credits", icon: Coins },
  { path: "/dashboard", label: "Dashboard", shortLabel: "Dashboard", icon: LayoutDashboard },
];

export function ChatServiceNav() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavClick = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-bg-mid/80 backdrop-blur-md">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/reading">
            <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-serif text-lg text-white hidden sm:inline">
                The Seer Within
              </span>
            </button>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.path ||
                (item.path === "/reading" && location.startsWith("/chat/"));
              const Icon = item.icon;

              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-600/20 text-purple-300"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Tablet Navigation */}
          <div className="hidden md:flex lg:hidden items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.path ||
                (item.path === "/reading" && location.startsWith("/chat/"));
              const Icon = item.icon;

              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-purple-600/20 text-purple-300"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.shortLabel}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Right side: Credits + User Menu */}
          <div className="flex items-center gap-3">
            {/* Credit Badge - Desktop/Tablet */}
            <div className="hidden md:block">
              <CreditBadge
                coins={(user as any).coinBalance ?? 0}
                onClick={() => navigate("/credits")}
              />
            </div>

            {/* User Menu - Desktop/Tablet */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} />
                      <AvatarFallback>
                        {user.firstName?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-sm">
                    <div className="font-medium text-white">{user.firstName}</div>
                    <div className="text-xs text-gray-400 truncate">{user.email}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                    <User className="w-4 h-4 mr-2" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Hamburger Menu */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 bg-bg-mid border-white/10">
                  <div className="flex flex-col gap-6 mt-8">
                    {/* User Info */}
                    <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} />
                        <AvatarFallback>
                          {user.firstName?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white">{user.firstName}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                      </div>
                    </div>

                    {/* Credit Badge */}
                    <div className="flex justify-center">
                      <CreditBadge
                        coins={(user as any).coinBalance ?? 0}
                        size="lg"
                        onClick={() => handleNavClick("/credits")}
                      />
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex flex-col gap-2">
                      {NAV_ITEMS.map((item) => {
                        const isActive = location === item.path ||
                          (item.path === "/reading" && location.startsWith("/chat/"));
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavClick(item.path)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                              isActive
                                ? "bg-purple-600/20 text-purple-300"
                                : "text-gray-300 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            {item.label}
                          </button>
                        );
                      })}
                    </nav>

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors mt-auto"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
