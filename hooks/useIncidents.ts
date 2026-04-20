import useSWR, { mutate } from "swr";
import { useEffect, useRef } from "react";
import { fetcher, SWR_KEYS } from "@/lib/swr-config";
import { usePusher } from "@/components/PusherProvider";

export type IncidentPhase = "GATHERING_INFO" | "INFO_COLLECTED" | "CONFIRMED" | "CRANE_ASSIGNED";

export interface Incident {
  id: string;
  ticketNumber: string;
  status: "ACTIVE" | "RESOLVED" | "CANCELLED";
  phase: IncidentPhase;
  customerName?: string | null;
  customerPhone?: string | null;
  policyNumber?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  vehiclePlate?: string | null;
  vehicleModel?: string | null;
  vehicleBrand?: string | null;
  description?: string | null;
  comments?: string | null;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  craneAssigned: boolean;
  craneETA?: string | null;
  craneCompany?: string | null;
  cranePhone?: string | null;
  happyRobotRunLink?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  logs?: IncidentLog[];
  _count?: { logs: number };
}

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

interface UseIncidentsReturn {
  incidents: Incident[];
  activeIncidents: Incident[];
  resolvedIncidents: Incident[];
  isLoading: boolean;
  isError: boolean;
  error: Error | undefined;
  mutate: () => Promise<Incident[] | undefined>;
  addIncident: (incident: Incident) => void;
  updateIncident: (incident: Partial<Incident> & { id: string }) => void;
  removeIncident: (incidentId: string) => void;
  isPolling: boolean;
}

// Fallback polling interval when Pusher is disconnected (5 seconds)
const FALLBACK_POLLING_INTERVAL = 5000;
// Normal refresh interval when Pusher is connected (30 seconds)
const NORMAL_REFRESH_INTERVAL = 30000;

/**
 * SWR hook for fetching and managing incidents.
 * Includes automatic fallback to polling when Pusher is disconnected.
 */
export function useIncidents(): UseIncidentsReturn {
  const { isConnected } = usePusher();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Determine refresh interval based on Pusher connection state
  // When Pusher is connected, we rely on real-time updates, so longer interval
  // When disconnected, we poll more frequently as fallback
  const refreshInterval = isConnected ? NORMAL_REFRESH_INTERVAL : FALLBACK_POLLING_INTERVAL;
  
  const { data, error, isLoading, mutate: boundMutate } = useSWR<Incident[]>(
    SWR_KEYS.INCIDENTS,
    fetcher,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
      refreshInterval, // Dynamic based on Pusher state
    }
  );

  // Track when we switch to polling mode
  useEffect(() => {
    if (!isConnected) {
      console.log("[useIncidents] Pusher disconnected - switching to fallback polling every 5s");
    } else {
      console.log("[useIncidents] Pusher connected - using real-time updates");
    }
    
    // Cleanup any manual polling if we had one
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isConnected]);

  const incidents = data ?? [];
  const activeIncidents = incidents.filter((inc) => inc.status === "ACTIVE");
  const resolvedIncidents = incidents.filter((inc) => inc.status === "RESOLVED");

  /**
   * Optimistically add an incident to the cache.
   */
  const addIncident = (incident: Incident) => {
    boundMutate(
      (currentIncidents) => {
        if (!currentIncidents) return [incident];
        const exists = currentIncidents.find((i) => i.id === incident.id);
        if (exists) return currentIncidents;
        return [incident, ...currentIncidents];
      },
      { revalidate: false }
    );
  };

  /**
   * Optimistically update an incident in the cache.
   */
  const updateIncident = (incident: Partial<Incident> & { id: string }) => {
    boundMutate(
      (currentIncidents) => {
        if (!currentIncidents) return currentIncidents;
        return currentIncidents.map((i) =>
          i.id === incident.id ? { ...i, ...incident } : i
        );
      },
      { revalidate: false }
    );
  };

  /**
   * Optimistically remove an incident from the cache.
   */
  const removeIncident = (incidentId: string) => {
    boundMutate(
      (currentIncidents) => {
        if (!currentIncidents) return currentIncidents;
        return currentIncidents.filter((i) => i.id !== incidentId);
      },
      { revalidate: false }
    );
  };

  return {
    incidents,
    activeIncidents,
    resolvedIncidents,
    isLoading,
    isError: !!error,
    error,
    mutate: boundMutate,
    addIncident,
    updateIncident,
    removeIncident,
    isPolling: !isConnected, // True when we're using fallback polling
  };
}

/**
 * Utility to revalidate incidents from anywhere.
 */
export function revalidateIncidents() {
  return mutate(SWR_KEYS.INCIDENTS);
}

/**
 * Utility to add an incident from anywhere.
 */
export function mutateAddIncident(incident: Incident) {
  return mutate<Incident[]>(
    SWR_KEYS.INCIDENTS,
    (currentIncidents) => {
      if (!currentIncidents) return [incident];
      const exists = currentIncidents.find((i) => i.id === incident.id);
      if (exists) return currentIncidents;
      return [incident, ...currentIncidents];
    },
    { revalidate: false }
  );
}

/**
 * Utility to update an incident from anywhere.
 * If a full incident object is passed, it replaces the entire incident.
 * If a partial object is passed, it merges with the existing incident.
 */
export function mutateUpdateIncident(incident: Partial<Incident> & { id: string }) {
  return mutate<Incident[]>(
    SWR_KEYS.INCIDENTS,
    (currentIncidents) => {
      if (!currentIncidents) return currentIncidents;
      // Create a new array to ensure React detects the change
      return currentIncidents.map((i) => {
        if (i.id === incident.id) {
          // Create a completely new object to ensure React re-renders
          return { ...i, ...incident } as Incident;
        }
        return i;
      });
    },
    { revalidate: false }
  );
}

/**
 * Utility to remove an incident from anywhere.
 */
export function mutateRemoveIncident(incidentId: string) {
  return mutate<Incident[]>(
    SWR_KEYS.INCIDENTS,
    (currentIncidents) => {
      if (!currentIncidents) return currentIncidents;
      return currentIncidents.filter((i) => i.id !== incidentId);
    },
    { revalidate: false }
  );
}

