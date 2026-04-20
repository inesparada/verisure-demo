import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface Settings {
  id: string;
  defaultHappyRobotLink: string;
  slaWarningMinutes: number;
  slaCriticalMinutes: number;
  controlTowerHours: number;
  createdAt: string;
  updatedAt: string;
}

interface UseSettingsReturn {
  settings: Settings | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Settings | undefined>;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
}

/**
 * SWR hook for fetching and updating settings.
 */
export function useSettings(): UseSettingsReturn {
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Settings>(
    SWR_KEYS.SETTINGS,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache settings for 1 minute
    }
  );

  /**
   * Update settings via API and optimistically update cache.
   */
  const updateSettings = async (updates: Partial<Settings>) => {
    // Optimistic update
    boundMutate(
      (currentSettings) => {
        if (!currentSettings) return currentSettings;
        return { ...currentSettings, ...updates };
      },
      { revalidate: false }
    );

    // Send to API
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_happyrobot_link: updates.defaultHappyRobotLink,
          sla_warning_minutes: updates.slaWarningMinutes,
          sla_critical_minutes: updates.slaCriticalMinutes,
          control_tower_hours: updates.controlTowerHours,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update settings");
      }

      // Revalidate to get server state
      boundMutate();
    } catch (error) {
      // Revert on error
      boundMutate();
      throw error;
    }
  };

  return {
    settings: data ?? null,
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    updateSettings,
  };
}

/**
 * Utility to revalidate settings from anywhere.
 */
export function revalidateSettings() {
  return mutate(SWR_KEYS.SETTINGS);
}

