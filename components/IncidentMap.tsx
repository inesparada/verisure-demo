"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Map, { Marker, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { AlertTriangle, CheckCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import type { Incident } from "@/hooks";

// Madrid view — center between Salamanca and Chamartín where incidents cluster
const SPAIN_VIEW = { lat: 40.4350, lng: -3.6900, zoom: 10.5 };
const MADRID_VIEW = { lat: 40.4350, lng: -3.6900, zoom: 12.5 };

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncidentId?: string | null;
  onIncidentSelect?: (incidentId: string | null) => void;
  interactive?: boolean;
  showOnlyActive?: boolean;
  newIncidentIds?: Set<string>; // IDs of new incidents that should blink
}

export function IncidentMap({
  incidents,
  selectedIncidentId,
  onIncidentSelect,
  interactive = true,
  showOnlyActive = false,
  newIncidentIds = new Set(),
}: IncidentMapProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [hoveredIncidentId, setHoveredIncidentId] = useState<string | null>(null);
  const [hasPlayedInitialAnimation, setHasPlayedInitialAnimation] = useState(false);

  // Resize observer to handle container size changes
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      // Trigger map resize when container size changes
      mapRef.current?.resize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [isMapLoaded]);

  // Map style based on theme
  const mapStyle = theme === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";

  // Filter incidents with valid coordinates
  const mappableIncidents = useMemo(() => {
    return incidents.filter((incident) => {
      if (showOnlyActive && incident.status !== "ACTIVE") return false;
      return incident.latitude != null && incident.longitude != null;
    });
  }, [incidents, showOnlyActive]);

  // Stats
  const stats = useMemo(() => {
    const active = incidents.filter((i) => i.status === "ACTIVE").length;
    const resolved = incidents.filter((i) => i.status === "RESOLVED").length;
    const critical = incidents.filter((i) => i.severity === "CRITICAL" || i.severity === "HIGH").length;
    return { active, resolved, critical, total: incidents.length };
  }, [incidents]);

  const handleMapLoad = useCallback(() => {
    setIsMapLoaded(true);
  }, []);

  // Cinematic initial zoom to Spain
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || hasPlayedInitialAnimation) return;

    const timer = setTimeout(() => {
      mapRef.current?.flyTo({
        center: [MADRID_VIEW.lng, MADRID_VIEW.lat],
        zoom: MADRID_VIEW.zoom,
        duration: 3000,
        essential: true,
      });
      setHasPlayedInitialAnimation(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isMapLoaded, hasPlayedInitialAnimation]);

  // Fly to selected incident
  useEffect(() => {
    if (!isMapLoaded || !mapRef.current || !selectedIncidentId) return;

    const incident = mappableIncidents.find((i) => i.id === selectedIncidentId);
    if (incident && incident.latitude && incident.longitude) {
      mapRef.current.flyTo({
        center: [incident.longitude, incident.latitude],
        zoom: 14,
        duration: 2000,
        essential: true,
      });
    }
  }, [selectedIncidentId, mappableIncidents, isMapLoaded]);

  // Handle marker click
  const handleMarkerClick = useCallback((incidentId: string) => {
    const newSelection = selectedIncidentId === incidentId ? null : incidentId;
    onIncidentSelect?.(newSelection);
  }, [selectedIncidentId, onIncidentSelect]);

  // Get severity color
  const getSeverityColor = (severity: string, isResolved: boolean) => {
    if (isResolved) return "bg-emerald-500 border-emerald-400";
    switch (severity) {
      case "CRITICAL":
        return "bg-red-600 border-red-500";
      case "HIGH":
        return "bg-red-500 border-red-400";
      case "MEDIUM":
        return "bg-orange-500 border-orange-400";
      case "LOW":
        return "bg-yellow-500 border-yellow-400";
      default:
        return "bg-blue-500 border-blue-400";
    }
  };

  // Get phase text for display
  const getPhaseText = (incident: Incident) => {
    if (incident.status === "RESOLVED") return "Resuelta";
    const phaseTexts: Record<string, string> = {
      GATHERING_INFO: "Recogiendo info",
      INFO_COLLECTED: "Cliente identificado",
      CONFIRMED: "Técnico asignado",
      CRANE_ASSIGNED: "Técnico en camino",
    };
    return phaseTexts[incident.phase] || incident.status;
  };

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden rounded-xl border shadow-lg relative bg-[var(--mutua-card)] border-[var(--mutua-border)]">
      <Map
        key={theme} // Force re-render when theme changes to ensure correct map style
        ref={mapRef}
        onLoad={handleMapLoad}
        initialViewState={{
          longitude: SPAIN_VIEW.lng,
          latitude: SPAIN_VIEW.lat,
          zoom: SPAIN_VIEW.zoom,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        attributionControl={false}
        reuseMaps={false} // Disable reuse to ensure theme changes take effect
        scrollZoom={interactive}
        dragPan={interactive}
        dragRotate={interactive}
        doubleClickZoom={interactive}
        touchZoomRotate={interactive}
      >
        {/* Incident Markers */}
        {mappableIncidents.map((incident) => {
          const isSelected = incident.id === selectedIncidentId;
          const isHovered = hoveredIncidentId === incident.id;
          const isResolved = incident.status === "RESOLVED";
          const isCritical = incident.severity === "CRITICAL" || incident.severity === "HIGH";
          const isNew = newIncidentIds.has(incident.id);

          return (
            <Marker
              key={incident.id}
              longitude={incident.longitude!}
              latitude={incident.latitude!}
              style={{ zIndex: isNew ? 200 : isHovered || isSelected ? 100 : 10 }}
            >
              <div
                className="relative group cursor-pointer"
                onClick={() => handleMarkerClick(incident.id)}
                onMouseEnter={() => setHoveredIncidentId(incident.id)}
                onMouseLeave={() => setHoveredIncidentId(null)}
              >
                {/* New incident blinking effect */}
                {isNew && (
                  <>
                    <div
                      className="absolute rounded-full border-2 border-blue-500 pointer-events-none"
                      style={{
                        width: '50px',
                        height: '50px',
                        top: '-13px',
                        left: '-13px',
                        animation: 'radar-ping 1.5s ease-out infinite',
                      }}
                    />
                    <div
                      className="absolute rounded-full border-2 border-blue-500 pointer-events-none"
                      style={{
                        width: '50px',
                        height: '50px',
                        top: '-13px',
                        left: '-13px',
                        animation: 'radar-ping 1.5s ease-out infinite 0.5s',
                      }}
                    />
                  </>
                )}

                {/* Radar ping effect for critical/active incidents (only if not new) */}
                {!isNew && !isResolved && isCritical && (
                  <>
                    <div
                      className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                      style={{
                        width: '50px',
                        height: '50px',
                        top: '-13px',
                        left: '-13px',
                        animation: 'radar-ping 3s ease-out infinite',
                      }}
                    />
                    <div
                      className="absolute rounded-full border-2 border-red-500 pointer-events-none"
                      style={{
                        width: '50px',
                        height: '50px',
                        top: '-13px',
                        left: '-13px',
                        animation: 'radar-ping 3s ease-out infinite 1s',
                      }}
                    />
                  </>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <div className="absolute -top-2 -left-2 h-10 w-10 rounded-full border-2 border-blue-400 animate-pulse" />
                )}

                {/* Marker icon */}
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-lg transition-all",
                  isNew ? "bg-blue-500 border-blue-400 animate-marker-blink" : getSeverityColor(incident.severity, isResolved),
                  "text-white",
                  isSelected && "scale-125 ring-2 ring-blue-400 ring-offset-1"
                )}>
                  {isResolved ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <AlertTriangle className="h-3 w-3" />
                  )}
                </div>

                {/* Tooltip on hover */}
                <div className={cn(
                  "absolute bottom-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50",
                  "whitespace-nowrap border px-3 py-2 text-xs font-mono rounded-lg pointer-events-none",
                  "bg-black/90 border-zinc-700 text-white min-w-[200px]"
                )}>
                  <div className="font-semibold text-blue-400">{incident.ticketNumber}</div>
                  {incident.customerName && (
                    <div className="text-white text-[11px]">{incident.customerName}</div>
                  )}
                  {incident.address && (
                    <div className="text-zinc-400 text-[10px] mt-1 truncate max-w-[200px]">
                      📍 {incident.address}
                    </div>
                  )}
                  {incident.vehiclePlate && (
                    <div className="text-zinc-500 text-[10px]">
                      🚗 {incident.vehicleBrand} {incident.vehicleModel} - {incident.vehiclePlate}
                    </div>
                  )}
                  <div className={cn(
                    "text-[10px] mt-1 font-semibold",
                    isResolved ? "text-emerald-400" : isCritical ? "text-red-400" : "text-orange-400"
                  )}>
                    {incident.severity} • {getPhaseText(incident)}
                  </div>
                </div>
              </div>
            </Marker>
          );
        })}
      </Map>

      {/* Stats overlay - positioned to cover Mapbox watermark */}
      <div className="absolute bottom-0 left-0 z-30">
        <div className={cn(
          "backdrop-blur px-3 py-2 rounded-tr-lg border-t border-r text-xs font-mono",
          "bg-white/90 dark:bg-black/90 border-gray-300 dark:border-zinc-700"
        )}>
          <div className="text-gray-500 dark:text-zinc-400 mb-1 text-[10px] uppercase tracking-wider">Estado</div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-0.5 bg-red-500 rounded"></span>
              <span className="text-gray-600 dark:text-zinc-500 text-[11px]">Activas</span>
              <span className="text-red-600 dark:text-red-400 ml-auto text-[11px]">{stats.active}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-0.5 bg-emerald-500 rounded"></span>
              <span className="text-gray-600 dark:text-zinc-500 text-[11px]">Resueltas</span>
              <span className="text-emerald-600 dark:text-emerald-400 ml-auto text-[11px]">{stats.resolved}</span>
            </div>
            {stats.critical > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-0.5 bg-orange-500 rounded"></span>
                <span className="text-gray-600 dark:text-zinc-500 text-[11px]">Críticas</span>
                <span className="text-orange-600 dark:text-orange-400 ml-auto text-[11px]">{stats.critical}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 right-4 z-30">
        <div className={cn(
          "backdrop-blur px-3 py-2 rounded-lg border text-xs font-mono",
          "bg-white/90 dark:bg-black/80 border-gray-300 dark:border-zinc-700"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              stats.active > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            )} />
            <span className="text-gray-600 dark:text-zinc-400">ESTADO:</span>
            <span className={cn(
              "font-semibold",
              stats.active > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
            )}>
              {stats.active > 0 ? `${stats.active} ACTIVAS` : "NOMINAL"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

