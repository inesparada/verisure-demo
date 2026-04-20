"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  ChevronRight, 
  LucideIcon, 
  AlertTriangle,
  BarChart3,
  Settings,
  RotateCcw,
  Loader2,
  X,
  ClipboardList,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isCollapsed = !isHovered;

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (response.ok) {
        setShowResetModal(false);
        // Refresh the page to show new data
        window.location.reload();
      } else {
        alert("Error al reiniciar la demo");
      }
    } catch (error) {
      console.error("Reset error:", error);
      alert("Error al reiniciar la demo");
    } finally {
      setIsResetting(false);
    }
  };

  // HappyRobot footer logo selection
  const getHappyRobotLogo = () => {
    if (isCollapsed) {
      return theme === "dark"
        ? "/happyrobot/Footer-logo-white.png"
        : "/happyrobot/Footer-logo-black.png";
    }
    return theme === "dark"
      ? "/happyrobot/Footer-expand-happyrobot_white.png"
      : "/happyrobot/Footer-expand-happyrobot-blacl.png";
  };

  const navItems: {
    href: string;
    icon: LucideIcon;
    label: string;
    subtitle: string;
  }[] = [
    {
      href: "/incidents",
      icon: AlertTriangle,
      label: "Centro de Alarmas",
      subtitle: "Alarmas en tiempo real",
    },
    {
      href: "/history",
      icon: ClipboardList,
      label: "Alarmas",
      subtitle: "Histórico completo",
    },
    {
      href: "/summary",
      icon: BarChart3,
      label: "Resumen",
      subtitle: "KPIs y métricas",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Configuración",
      subtitle: "Ajustes del sistema",
    },
  ];

  const sidebarWidth = isCollapsed ? 72 : 260;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#09090B] flex">
      {/* Sidebar - Two layer approach: outer clips, inner is fixed width */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width: sidebarWidth }}
        className="fixed left-0 top-0 h-screen z-40 overflow-hidden transition-[width] duration-300 ease-out"
      >
        {/* Inner container - always 260px wide, never changes */}
        <div className="w-[260px] h-full flex flex-col bg-white/80 dark:bg-[#18181B]/90 backdrop-blur-xl border-r border-gray-200/60 dark:border-white/[0.08]">
          
          {/* Logo header - both logos stacked, opacity switches */}
          <div className="h-[73px] shrink-0 flex items-center border-b border-gray-200/60 dark:border-white/[0.08] relative">
            {/* Square logo - centered in 72px zone */}
            <div
              className="absolute left-0 w-[72px] h-full flex items-center justify-center transition-opacity duration-300"
              style={{ opacity: isCollapsed ? 1 : 0 }}
            >
              <Image
                src="https://www.verisure.es/lp/static/specific/logos/logo_vs.webp"
                alt="Verisure"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
            </div>
            {/* Horizontal logo - starts at pl-4 */}
            <div
              className="pl-4 transition-opacity duration-300"
              style={{ opacity: isCollapsed ? 0 : 1 }}
            >
              <Image
                src="https://www.verisure.es/lp/static/specific/logos/logo_vs.webp"
                alt="Verisure"
                width={130}
                height={44}
                className="object-contain object-left"
                priority
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              // Collapsed: small square icon box - positioned in left 72px zone
              if (isCollapsed) {
                return (
                  <Tooltip key={item.href} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center w-[52px] h-[48px] rounded-lg ml-[10px] transition-colors duration-150",
                          isActive
                            ? "bg-gradient-to-r from-[#003DA5] to-[#0050CC] text-white shadow-lg shadow-[#003DA5]/25"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-gray-500 dark:text-gray-500")} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={12} className="bg-gray-900 dark:bg-gray-800 text-white border-0 shadow-xl">
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs text-gray-400">{item.subtitle}</div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              // Expanded: full horizontal box with icon + text
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center h-12 rounded-lg mx-3 px-3 gap-3 transition-colors duration-150",
                    isActive
                      ? "bg-gradient-to-r from-[#003DA5] to-[#0050CC] text-white shadow-lg shadow-[#003DA5]/25"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-gray-500 dark:text-gray-500")} />
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-medium whitespace-nowrap", isActive && "text-white")}>
                      {item.label}
                    </div>
                    <div className={cn("text-xs mt-0.5 whitespace-nowrap", isActive ? "text-blue-100" : "text-gray-400 dark:text-gray-500")}>
                      {item.subtitle}
                    </div>
                  </div>
                  {isActive && <ChevronRight className="h-4 w-4 text-white/70 shrink-0" />}
                </Link>
              );
            })}
          </nav>

          {/* Reset Demo Button - hidden until hover */}
          <div className="py-2">
            {isCollapsed ? (
              <div className="w-[72px] flex justify-center">
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setShowResetModal(true)}
                      className="w-[52px] h-[40px] flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="bg-gray-900 dark:bg-gray-800 text-white border-0 shadow-xl">
                    Reset Demo
                  </TooltipContent>
                </Tooltip>
              </div>
            ) : (
              <button
                onClick={() => setShowResetModal(true)}
                className="w-full mx-3 h-10 flex items-center justify-center gap-2 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{ width: 'calc(100% - 24px)' }}
              >
                <RotateCcw className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium whitespace-nowrap">Reset Demo</span>
              </button>
            )}
          </div>

          {/* Theme Toggle - icon stays in same position, label and toggle appear when expanded */}
          <div className="border-t border-gray-200/60 dark:border-white/[0.08] py-3 flex items-center">
            {/* Icon always in 72px zone */}
            <div className="w-[72px] shrink-0 flex justify-center">
              {isCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div>
                      <ThemeToggle variant="button" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12} className="bg-gray-900 dark:bg-gray-800 text-white border-0 shadow-xl">
                    {theme === "dark" ? "Modo Oscuro" : "Modo Claro"}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <ThemeToggle variant="button" />
              )}
            </div>
            {/* Label and toggle - only when expanded */}
            {!isCollapsed && (
              <div className="flex-1 flex items-center justify-between pr-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {theme === "dark" ? "Modo Oscuro" : "Modo Claro"}
                </span>
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "relative inline-flex h-6 w-10 items-center rounded-full transition-colors shrink-0",
                    theme === "dark" ? "bg-blue-600" : "bg-gray-300"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                      theme === "dark" ? "translate-x-5" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Powered by Footer */}
          <div className="border-t border-gray-200/60 dark:border-white/[0.08] h-[72px]">
            {isCollapsed ? (
              <div className="w-[72px] h-full flex items-center justify-center">
                <Image
                  src={theme === "dark" ? "/happyrobot/Footer-logo-white.png" : "/happyrobot/Footer-logo-black.png"}
                  alt="HappyRobot AI"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
                  Powered by
                </div>
                <Image
                  src={theme === "dark" ? "/happyrobot/Footer-expand-happyrobot_white.png" : "/happyrobot/Footer-expand-happyrobot-blacl.png"}
                  alt="HappyRobot AI"
                  width={140}
                  height={28}
                  className="object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content - slides with sidebar */}
      <main 
        className="flex-1 min-h-screen transition-[margin-left] duration-300 ease-out"
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>

      {/* Reset Demo Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isResetting && setShowResetModal(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-6 w-[400px] max-w-[90vw]">
            {/* Close button */}
            <button
              onClick={() => !isResetting && setShowResetModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
              disabled={isResetting}
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>

            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <RotateCcw className="h-7 w-7 text-red-600 dark:text-red-400" />
              </div>
            </div>

            {/* Content */}
            <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-white mb-2">
              ¿Reiniciar Demo?
            </h3>
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-6">
              Esto eliminará todos los datos actuales y restaurará las incidencias de ejemplo. Esta acción no se puede deshacer.
            </p>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors font-medium disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetDemo}
                disabled={isResetting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reiniciando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

