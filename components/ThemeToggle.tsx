"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  variant: "switch" | "button" | "expanded";
}

export function ThemeToggle({ variant }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  if (variant === "button") {
    return (
      <button
        onClick={toggleTheme}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-white" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" />
        )}
      </button>
    );
  }

  // Expanded variant - minimalistic: icon, label, toggle inline without box
  if (variant === "expanded") {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-white" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {theme === "dark" ? "Modo Oscuro" : "Modo Claro"}
          </span>
        </div>
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
    );
  }

  // Switch variant (default)
  return (
    <div className="flex items-center justify-between w-full px-4 py-3.5 bg-gray-50 dark:bg-white/5 rounded-xl">
      <div className="flex items-center gap-3">
        {theme === "dark" ? (
          <Sun className="h-5 w-5 text-white" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {theme === "dark" ? "Oscuro" : "Claro"}
        </span>
      </div>
      <button
        onClick={toggleTheme}
        className={cn(
          "relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0",
          theme === "dark" ? "bg-blue-600" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform",
            theme === "dark" ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

