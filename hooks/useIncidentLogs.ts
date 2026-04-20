import useSWR, { mutate } from "swr";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";

export interface IncidentLog {
  id: string;
  incidentId: string;
  timestamp: string;
  message: string;
  source: string;
  status: string;
  metadata?: unknown;
  createdAt: string;
}

interface UseIncidentLogsReturn {
  logs: IncidentLog[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<IncidentLog[] | undefined>;
  addLog: (log: IncidentLog) => void;
}

/**
 * SWR hook for fetching incident logs.
 */
export function useIncidentLogs(incidentId: string): UseIncidentLogsReturn {
  const key = incidentId ? SWR_KEYS.INCIDENT_LOGS(incidentId) : null;

  const { data, error, isLoading, mutate: boundMutate } = useSWR<IncidentLog[]>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  );

  const logs = data ?? [];

  /**
   * Optimistically add a log to the cache.
   */
  const addLog = (log: IncidentLog) => {
    boundMutate(
      (currentLogs) => {
        if (!currentLogs) return [log];
        const exists = currentLogs.find((l) => l.id === log.id);
        if (exists) return currentLogs;
        return [...currentLogs, log];
      },
      { revalidate: false }
    );
  };

  return {
    logs,
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    addLog,
  };
}

/**
 * Utility to revalidate logs for a specific incident.
 */
export function revalidateIncidentLogs(incidentId: string) {
  return mutate(SWR_KEYS.INCIDENT_LOGS(incidentId));
}

/**
 * Utility to add a log from anywhere.
 */
export function mutateAddLog(incidentId: string, log: IncidentLog) {
  return mutate<IncidentLog[]>(
    SWR_KEYS.INCIDENT_LOGS(incidentId),
    (currentLogs) => {
      if (!currentLogs) return [log];
      const exists = currentLogs.find((l) => l.id === log.id);
      if (exists) return currentLogs;
      return [...currentLogs, log];
    },
    { revalidate: false }
  );
}



