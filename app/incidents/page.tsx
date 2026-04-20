"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { usePusher } from "@/components/PusherProvider";
import { IncidentDetailPanel } from "@/components/IncidentDetailPanel";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  Phone,
  Clock,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import {
  useIncidents,
  useSettings,
  revalidateIncidents,
  mutateAddIncident,
  mutateUpdateIncident,
  type Incident,
} from "@/hooks";
import { formatDateTime, minutesElapsed, formatDuration } from "@/lib/utils";

// Dynamic import for map to avoid SSR issues
const IncidentMap = dynamic(
  () => import("@/components/IncidentMap").then((mod) => mod.IncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] flex items-center justify-center">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">CARGANDO MAPA...</span>
        </div>
      </div>
    ),
  }
);

// Duration in ms for new incident blinking effect
const NEW_INCIDENT_BLINK_DURATION = 60 * 1000; // 60 seconds

export default function IncidentsPage() {
  const { pusher } = usePusher();
  const { incidents: allIncidents, isLoading } = useIncidents();
  const { settings } = useSettings();
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(620); // Default width - 30% larger
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track "new" incidents that should blink (incident IDs and their arrival time)
  const [newIncidentIds, setNewIncidentIds] = useState<Set<string>>(new Set());
  const newIncidentTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Filter incidents by time threshold from settings
  // Only show incidents created within the last X hours (default: 5)
  const controlTowerHours = settings?.controlTowerHours ?? 5;
  const cutoffTime = new Date(Date.now() - controlTowerHours * 60 * 60 * 1000);
  
  const incidents = allIncidents.filter((incident) => {
    const createdAt = new Date(incident.createdAt);
    return createdAt >= cutoffTime;
  });
  
  const activeIncidents = incidents.filter((inc) => inc.status === "ACTIVE");
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // Mark incident as "seen" (stop blinking) when clicked
  const markIncidentAsSeen = useCallback((incidentId: string) => {
    setNewIncidentIds((prev) => {
      const next = new Set(prev);
      next.delete(incidentId);
      return next;
    });
    // Clear the timer if it exists
    const timer = newIncidentTimers.current.get(incidentId);
    if (timer) {
      clearTimeout(timer);
      newIncidentTimers.current.delete(incidentId);
    }
  }, []);

  // Add a new incident to the blinking set with auto-expiry
  const addNewIncident = useCallback((incidentId: string) => {
    setNewIncidentIds((prev) => new Set(prev).add(incidentId));
    
    // Set timer to auto-remove after 60 seconds
    const timer = setTimeout(() => {
      setNewIncidentIds((prev) => {
        const next = new Set(prev);
        next.delete(incidentId);
        return next;
      });
      newIncidentTimers.current.delete(incidentId);
    }, NEW_INCIDENT_BLINK_DURATION);
    
    newIncidentTimers.current.set(incidentId, timer);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      newIncidentTimers.current.forEach((timer) => clearTimeout(timer));
      newIncidentTimers.current.clear();
    };
  }, []);

  // Resizer drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      // Clamp between min and max (allow up to 900px)
      const clampedWidth = Math.max(280, Math.min(900, newWidth));
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isDragging]);

  // Real-time Pusher listeners
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("verisure-dashboard");

    // Refetch on reconnect
    const handleConnected = () => {
      console.log("[Pusher] Connected - refetching incidents");
      revalidateIncidents();
    };
    pusher.connection.bind("connected", handleConnected);

    // New incident created
    channel.bind("incident:created", (data: { incident: Incident }) => {
      console.log("[Pusher] New incident:", data.incident.ticketNumber);
      mutateAddIncident(data.incident);
      // Add to blinking set
      addNewIncident(data.incident.id);
    });

    // Incident updated - optimistically update AND revalidate for consistency
    channel.bind("incident:updated", (data: { incident: Incident }) => {
      console.log("[Pusher] Incident updated:", data.incident.ticketNumber, data.incident);
      // First optimistically update the cache
      mutateUpdateIncident(data.incident);
      // Then revalidate to ensure we have all the latest data
      revalidateIncidents();
    });

    // Location updated
    channel.bind("incident:location-updated", (data: { incidentId: string; latitude: number; longitude: number }) => {
      console.log("[Pusher] Location updated for:", data.incidentId);
      mutateUpdateIncident({
        id: data.incidentId,
        latitude: data.latitude,
        longitude: data.longitude,
      });
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("verisure-dashboard");
      pusher.connection.unbind("connected", handleConnected);
    };
  }, [pusher, addNewIncident]);

  // Handle incident selection
  const handleIncidentSelect = (incidentId: string | null) => {
    setSelectedIncidentId(incidentId);
    // Stop blinking when incident is clicked
    if (incidentId) {
      markIncidentAsSeen(incidentId);
    }
  };

  // Handle resolve from panel
  const handleResolve = () => {
    revalidateIncidents();
    setSelectedIncidentId(null);
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      CRITICAL: { bg: "bg-red-500/20", text: "text-red-400" },
      HIGH: { bg: "bg-red-500/10", text: "text-red-400" },
      MEDIUM: { bg: "bg-orange-500/10", text: "text-orange-400" },
      LOW: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
    };
    const config = configs[severity] || { bg: "bg-zinc-500/10", text: "text-zinc-400" };
    return (
      <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium", config.bg, config.text)}>
        {severity}
      </span>
    );
  };

  // Get phase display text and styling
  const getPhaseDisplay = (incident: Incident) => {
    if (incident.status === "RESOLVED") {
      return { text: "Resuelta", color: "text-emerald-500", icon: "✓" };
    }
    
    const phaseConfigs: Record<string, { text: string; color: string; icon: string }> = {
      GATHERING_INFO: { text: "Recogiendo información", color: "text-blue-400", icon: "📞" },
      INFO_COLLECTED: { text: "Cliente identificado", color: "text-cyan-400", icon: "👤" },
      CONFIRMED: { text: "Técnico asignado", color: "text-orange-400", icon: "⏳" },
      CRANE_ASSIGNED: { text: "Técnico en camino", color: "text-yellow-400", icon: "🔧" },
    };
    
    return phaseConfigs[incident.phase] || { text: incident.phase, color: "text-zinc-400", icon: "•" };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--mutua-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">CARGANDO SISTEMA...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[var(--mutua-bg)] overflow-hidden font-sans">
      {/* Header - h-[73px] matches sidebar header */}
      <header className="flex-none z-30 bg-[var(--mutua-bg)]/80 backdrop-blur-xl border-b border-[var(--mutua-border)] h-[73px]">
        <div className="px-6 h-full flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
              Centro de Alarmas
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono">
              SEGURIDAD DEL HOGAR EN TIEMPO REAL
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-2.5 w-2.5 rounded-full",
                activeIncidents.length > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
              )} />
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                {activeIncidents.length > 0
                  ? `${activeIncidents.length} alarma${activeIncidents.length > 1 ? "s" : ""} activa${activeIncidents.length > 1 ? "s" : ""}`
                  : "Sistema operativo"
                }
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex min-h-0 p-6 gap-0">
        {/* Map Section */}
        <div className="flex-1 relative mr-1 min-w-0">
          <div className="absolute inset-0">
            <IncidentMap
              incidents={incidents}
              selectedIncidentId={selectedIncidentId}
              onIncidentSelect={handleIncidentSelect}
              newIncidentIds={newIncidentIds}
            />
          </div>

          {/* Incident Detail Panel (overlays map) */}
          <AnimatePresence>
            {selectedIncident && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="absolute top-4 left-4 z-50"
              >
                <IncidentDetailPanel
                  incident={selectedIncident}
                  onClose={() => setSelectedIncidentId(null)}
                  onResolve={handleResolve}
                  onDelete={() => {
                    revalidateIncidents();
                    setSelectedIncidentId(null);
                  }}
                  onUpdate={() => {
                    revalidateIncidents();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resizable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "w-2 cursor-col-resize flex items-center justify-center group hover:bg-blue-500/10 transition-colors rounded",
            isDragging && "bg-blue-500/20"
          )}
        >
          <div className={cn(
            "w-1 h-12 rounded-full transition-colors",
            isDragging ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-600 group-hover:bg-blue-400"
          )} />
        </div>

        {/* Incidents List Sidebar */}
        <div 
          style={{ width: sidebarWidth }}
          className="flex flex-col rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] shadow-xl overflow-hidden ml-1">
          {/* List Header */}
          <div className="px-4 py-3 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Alarmas Recientes
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-zinc-500 font-mono">
                    ÚLTIMAS {controlTowerHours}H • EN TIEMPO REAL
                  </span>
                </div>
              </div>
              <div className="text-xs text-zinc-500 font-mono">
                {incidents.length} total
              </div>
            </div>
          </div>

          {/* Incidents List */}
          <div className="flex-1 overflow-y-auto">
            {incidents.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-500/30 mx-auto mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Sin alarmas activas</p>
                <p className="text-xs text-zinc-500 mt-1">El sistema está operativo</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--mutua-border)]/50">
                {incidents.map((incident) => {
                  const isActive = incident.status === "ACTIVE";
                  const isSelected = incident.id === selectedIncidentId;
                  const isNew = newIncidentIds.has(incident.id);
                  const elapsedMins = minutesElapsed(incident.createdAt);

                  return (
                    <div
                      key={incident.id}
                      onClick={() => handleIncidentSelect(incident.id)}
                      className={cn(
                        "px-4 py-3 cursor-pointer transition-colors relative",
                        isSelected 
                          ? "bg-blue-500/10" 
                          : "hover:bg-[var(--mutua-surface)]",
                        !isActive && "opacity-60",
                        isNew && "animate-new-incident"
                      )}
                    >
                      {/* New incident indicator */}
                      {isNew && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 animate-pulse" />
                      )}
                      <div className="flex items-start gap-3">
                        {/* Status Icon */}
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          isNew && "animate-pulse",
                          isActive
                            ? incident.severity === "CRITICAL" || incident.severity === "HIGH"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-orange-500/20 text-orange-400"
                            : "bg-emerald-500/20 text-emerald-400"
                        )}>
                          {isActive ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-zinc-900 dark:text-white">
                              {incident.ticketNumber}
                            </span>
                            {getSeverityBadge(incident.severity)}
                          </div>

                          {incident.customerName && (
                            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                              {incident.customerName}
                            </div>
                          )}

                          {incident.address && (
                            <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
                              📍 {incident.address}
                            </div>
                          )}

                          {/* Phase indicator */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={cn("text-[10px] font-medium", getPhaseDisplay(incident).color)}>
                              {getPhaseDisplay(incident).icon} {getPhaseDisplay(incident).text}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(elapsedMins)}
                            </span>
                          </div>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          isSelected ? "text-blue-400" : "text-zinc-400"
                        )} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

