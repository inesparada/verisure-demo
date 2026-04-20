"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  useIncidents,
  type Incident,
} from "@/hooks";
import { formatDateTime, minutesElapsed, formatDuration } from "@/lib/utils";
import { IncidentDetailPanel } from "@/components/IncidentDetailPanel";

type SortField = "createdAt" | "ticketNumber" | "status" | "severity" | "customerName";
type SortDirection = "asc" | "desc";

export default function HistoryPage() {
  const { incidents, isLoading, mutate } = useIncidents();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "RESOLVED">("ALL");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filter and sort incidents
  const filteredIncidents = useMemo(() => {
    let result = [...incidents];

    // Apply status filter
    if (statusFilter !== "ALL") {
      result = result.filter((inc) => inc.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((inc) => 
        inc.ticketNumber.toLowerCase().includes(query) ||
        inc.customerName?.toLowerCase().includes(query) ||
        inc.policyNumber?.toLowerCase().includes(query) ||
        inc.address?.toLowerCase().includes(query) ||
        inc.vehiclePlate?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortField) {
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case "ticketNumber":
          aVal = a.ticketNumber;
          bVal = b.ticketNumber;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "severity":
          const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          aVal = severityOrder[a.severity] ?? 4;
          bVal = severityOrder[b.severity] ?? 4;
          break;
        case "customerName":
          aVal = a.customerName?.toLowerCase() || "zzz";
          bVal = b.customerName?.toLowerCase() || "zzz";
          break;
        default:
          aVal = 0;
          bVal = 0;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [incidents, searchQuery, sortField, sortDirection, statusFilter]);

  // Handle sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      CRITICAL: { bg: "bg-red-500/20", text: "text-red-500" },
      HIGH: { bg: "bg-red-500/10", text: "text-red-400" },
      MEDIUM: { bg: "bg-orange-500/10", text: "text-orange-400" },
      LOW: { bg: "bg-yellow-500/10", text: "text-yellow-400" },
    };
    const config = configs[severity] || { bg: "bg-zinc-500/10", text: "text-zinc-400" };
    return (
      <span className={cn("px-2 py-0.5 rounded text-xs font-medium", config.bg, config.text)}>
        {severity}
      </span>
    );
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const isActive = status === "ACTIVE";
    return (
      <span className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
        isActive 
          ? "bg-orange-500/10 text-orange-400" 
          : "bg-emerald-500/10 text-emerald-400"
      )}>
        {isActive ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <CheckCircle className="h-3 w-3" />
        )}
        {isActive ? "Activa" : "Resuelta"}
      </span>
    );
  };

  // Open incident detail modal
  const handleRowClick = (incident: Incident) => {
    setSelectedIncident(incident);
  };

  // Handle incident update (refresh data)
  const handleIncidentUpdate = () => {
    mutate();
    // Also update selectedIncident if it's still selected
    if (selectedIncident) {
      const updatedIncident = incidents.find((i) => i.id === selectedIncident.id);
      if (updatedIncident) {
        setSelectedIncident(updatedIncident);
      }
    }
  };

  // Handle incident delete
  const handleIncidentDelete = () => {
    mutate();
    setSelectedIncident(null);
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

  const activeCount = incidents.filter((inc) => inc.status === "ACTIVE").length;
  const resolvedCount = incidents.filter((inc) => inc.status === "RESOLVED").length;

  return (
    <div className="flex flex-col h-screen bg-[var(--mutua-bg)] overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-none z-30 bg-[var(--mutua-bg)]/80 backdrop-blur-xl border-b border-[var(--mutua-border)] h-[73px]">
        <div className="px-6 h-full flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
              Histórico de Incidencias
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5 font-mono">
              REGISTRO COMPLETO DE TODAS LAS INCIDENCIAS
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-orange-400 font-medium">{activeCount}</span>
              <span className="text-zinc-500">activas</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-emerald-400 font-medium">{resolvedCount}</span>
              <span className="text-zinc-500">resueltas</span>
            </div>
            <div className="text-sm text-zinc-400">
              {incidents.length} total
            </div>
          </div>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="flex-none px-6 py-4 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por ticket, cliente, póliza, dirección o matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--mutua-border)] bg-[var(--mutua-bg)] text-sm text-zinc-900 dark:text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "RESOLVED")}
              className="px-3 py-2 rounded-lg border border-[var(--mutua-border)] bg-[var(--mutua-bg)] text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="ALL">Todas</option>
              <option value="ACTIVE">Activas</option>
              <option value="RESOLVED">Resueltas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--mutua-surface)] border-b border-[var(--mutua-border)]">
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("ticketNumber")}
                >
                  <div className="flex items-center gap-1">
                    Ticket
                    {getSortIcon("ticketNumber")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("status")}
                >
                  <div className="flex items-center gap-1">
                    Estado
                    {getSortIcon("status")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("severity")}
                >
                  <div className="flex items-center gap-1">
                    Severidad
                    {getSortIcon("severity")}
                  </div>
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("customerName")}
                >
                  <div className="flex items-center gap-1">
                    Cliente
                    {getSortIcon("customerName")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Ubicación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Vehículo
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("createdAt")}
                >
                  <div className="flex items-center gap-1">
                    Fecha
                    {getSortIcon("createdAt")}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Duración
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--mutua-border)]/50">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-zinc-500/30 mx-auto mb-3" />
                    <p className="text-sm text-zinc-500">
                      {searchQuery || statusFilter !== "ALL" 
                        ? "No se encontraron incidencias con los filtros aplicados"
                        : "No hay incidencias registradas"
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((incident) => {
                  const elapsedMins = incident.resolvedAt 
                    ? Math.round((new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()) / 60000)
                    : minutesElapsed(incident.createdAt);

                  return (
                    <tr 
                      key={incident.id}
                      onClick={() => handleRowClick(incident)}
                      className="hover:bg-[var(--mutua-surface)] cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-zinc-900 dark:text-white">
                          {incident.ticketNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(incident.status)}
                      </td>
                      <td className="px-4 py-3">
                        {getSeverityBadge(incident.severity)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-900 dark:text-white truncate max-w-[150px]">
                          {incident.customerName || "-"}
                        </div>
                        {incident.policyNumber && (
                          <div className="text-xs text-zinc-500 truncate">
                            {incident.policyNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-500 truncate max-w-[200px]">
                          {incident.address || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {incident.vehiclePlate ? (
                          <div>
                            <div className="text-sm text-zinc-900 dark:text-white">
                              {incident.vehiclePlate}
                            </div>
                            {(incident.vehicleBrand || incident.vehicleModel) && (
                              <div className="text-xs text-zinc-500">
                                {[incident.vehicleBrand, incident.vehicleModel].filter(Boolean).join(" ")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-zinc-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-zinc-900 dark:text-white">
                          {formatDateTime(incident.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatDuration(elapsedMins)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {incident.happyRobotRunLink && (
                            <a
                              href={incident.happyRobotRunLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors"
                              title="Ver en HappyRobot"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            className="p-1.5 rounded-lg hover:bg-zinc-500/10 text-zinc-400 hover:text-zinc-300 transition-colors"
                            title="Ver detalles"
                          >
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex-none px-6 py-3 border-t border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span>
            Mostrando {filteredIncidents.length} de {incidents.length} incidencias
          </span>
          <span className="font-mono">
            ÚLTIMA ACTUALIZACIÓN: {formatDateTime(new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedIncident(null)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal Content */}
          <div 
            className="relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <IncidentDetailPanel
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
              onResolve={handleIncidentUpdate}
              onDelete={handleIncidentDelete}
              onUpdate={handleIncidentUpdate}
            />
          </div>
        </div>
      )}
    </div>
  );
}



