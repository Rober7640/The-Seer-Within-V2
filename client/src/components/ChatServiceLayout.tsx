import { useEffect, ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { ChatServiceNav } from "@/components/ChatServiceNav";
import { cn } from "@/lib/utils";

interface ChatServiceLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "full";
  centerContent?: boolean;
  className?: string;
  requiresAuth?: boolean;
}

export function ChatServiceLayout({
  children,
  showNav = true,
  maxWidth = "full",
  centerContent = false,
  className,
  requiresAuth = true,
}: ChatServiceLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Auth protection - redirect to login if not authenticated (only for protected routes)
  useEffect(() => {
    if (requiresAuth && !isLoading && !isAuthenticated) {
      navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
    }
  }, [isLoading, isAuthenticated, navigate, requiresAuth]);

  // Loading state - only block render for auth-protected routes
  if (requiresAuth && isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg-deep to-bg-mid flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated on protected route - return null while redirect happens
  if (requiresAuth && !isAuthenticated) {
    return null;
  }

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case "sm":
        return "max-w-sm";
      case "md":
        return "max-w-md";
      case "lg":
        return "max-w-lg";
      case "xl":
        return "max-w-xl";
      case "2xl":
        return "max-w-2xl";
      case "3xl":
        return "max-w-3xl";
      default:
        return "max-w-full";
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Cosmic background - behind everything */}
      <CosmicBackground />

      {/* Content layer */}
      <div className="relative z-10">
        {/* Navigation (optional) */}
        {showNav && <ChatServiceNav />}

        {/* Main content area */}
        <main
          className={cn(
            "w-full",
            showNav && "pt-0", // No extra padding if nav is shown (nav has its own spacing)
            !showNav && "pt-8", // Add padding if no nav
            className
          )}
        >
          {centerContent ? (
            <div className="container mx-auto px-4">
              <div className={cn("mx-auto", getMaxWidthClass())}>{children}</div>
            </div>
          ) : (
            <div className={cn(maxWidth !== "full" && "container mx-auto px-4")}>
              <div className={cn(maxWidth !== "full" && getMaxWidthClass())}>
                {children}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
