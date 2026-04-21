"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { 
  X,
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  CheckCircle,
  ExternalLink,
  Truck,
  User,
  Trash2,
  Pencil,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatTime, minutesElapsed, formatDuration } from "@/lib/utils";
import { useIncidentLogs, type IncidentLog } from "@/hooks";
import { usePusher } from "./PusherProvider";
import type { Incident } from "@/hooks";

interface IncidentDetailPanelProps {
  incident: Incident;
  onClose: () => void;
  onResolve?: () => void;
  onDelete?: () => void;
  onUpdate?: () => void;
}

// Editable field component
interface EditableFieldProps {
  value: string | null | undefined;
  fieldKey: string;
  icon: React.ReactNode;
  placeholder?: string;
  onSave: (key: string, value: string) => Promise<void>;
  multiline?: boolean;
}

function EditableField({ value, fieldKey, icon, placeholder, onSave, multiline = false }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(fieldKey, editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving field:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      setEditValue(value || "");
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const inputClasses = cn(
      "flex-1 bg-transparent border-b border-blue-400 focus:outline-none text-sm py-0.5",
      "text-gray-700 dark:text-zinc-300"
    );

    return (
      <div className="flex items-start gap-2 text-sm group">
        <div className="text-gray-500 dark:text-zinc-500 mt-0.5">{icon}</div>
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={cn(inputClasses, "resize-none min-h-[60px]")}
            placeholder={placeholder}
            disabled={isSaving}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className={inputClasses}
            placeholder={placeholder}
            disabled={isSaving}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="flex items-start gap-2 text-sm group cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 -mx-2 px-2 py-1 rounded transition-colors"
      onClick={() => setIsEditing(true)}
    >
      <div className="text-gray-500 dark:text-zinc-500 mt-0.5 shrink-0">{icon}</div>
      <span className={cn(
        "flex-1",
        value ? "text-gray-700 dark:text-zinc-300" : "text-gray-400 dark:text-zinc-600 italic"
      )}>
        {value || placeholder || "Añadir..."}
      </span>
      <Pencil className="h-3 w-3 text-gray-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}

export function IncidentDetailPanel({
  incident,
  onClose,
  onResolve,
  onDelete,
  onUpdate,
}: IncidentDetailPanelProps) {
  const { pusher } = usePusher();
  const { logs, isLoading, addLog } = useIncidentLogs(incident.id);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isResolved = incident.status === "RESOLVED";
  const isCritical = incident.severity === "CRITICAL" || incident.severity === "HIGH";
  const elapsedMins = minutesElapsed(incident.createdAt);

  // Get phase display text
  const getPhaseText = () => {
    if (isResolved) return "Resuelta";
    const phaseTexts: Record<string, string> = {
      GATHERING_INFO: "Recogiendo información",
      INFO_COLLECTED: "Cliente identificado",
      CONFIRMED: "Técnico asignado",
      CRANE_ASSIGNED: "Técnico en camino",
    };
    return phaseTexts[incident.phase] || incident.phase;
  };

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Listen for real-time log AND incident updates
  useEffect(() => {
    if (!pusher) return;

    const channel = pusher.subscribe("verisure-dashboard");

    // Listen for new logs
    channel.bind("incident-log:created", (data: { incidentId: string; log: IncidentLog }) => {
      if (data.incidentId === incident.id) {
        addLog(data.log);
      }
    });

    // Listen for incident updates - trigger parent refresh to get new details
    channel.bind("incident:updated", (data: { incident: { id: string } }) => {
      if (data.incident.id === incident.id) {
        console.log("[IncidentDetailPanel] Incident updated, triggering refresh");
        onUpdate?.();
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe("verisure-dashboard");
    };
  }, [pusher, incident.id, addLog, onUpdate]);

  // Save field update
  const handleFieldSave = async (fieldKey: string, value: string) => {
    const response = await fetch(`/api/incidents/${incident.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [fieldKey]: value }),
    });

    if (response.ok) {
      onUpdate?.();
    } else {
      throw new Error("Failed to update field");
    }
  };

  // Handle resolve action
  const handleResolve = async () => {
    if (isResolving || isResolved) return;
    
    setIsResolving(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });

      if (response.ok) {
        onResolve?.();
      }
    } catch (error) {
      console.error("Error resolving incident:", error);
    } finally {
      setIsResolving(false);
    }
  };

  // Handle delete action
  const handleDelete = async () => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/incidents/${incident.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onDelete?.();
        onClose();
      }
    } catch (error) {
      console.error("Error deleting incident:", error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Get source color for logs
  const getSourceColor = (source: string) => {
    switch (source) {
      case "AGENT": return "text-purple-400";
      case "SYSTEM": return "text-zinc-500";
      case "CRANE": return "text-orange-400";
      case "CUSTOMER": return "text-blue-400";
      default: return "text-zinc-400";
    }
  };

  return (
    <div className="w-[380px] max-h-[calc(100vh-200px)] flex flex-col">
      <div className={cn(
        "backdrop-blur rounded-xl border overflow-hidden flex flex-col shadow-xl",
        "bg-white/95 dark:bg-black/90 border-gray-200 dark:border-zinc-700"
      )}>
        {/* Header */}
        <div className={cn(
          "px-4 py-3 border-b flex items-center justify-between shrink-0",
          isResolved 
            ? "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20" 
            : isCritical 
              ? "border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20"
              : "border-gray-200 dark:border-zinc-800"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center",
              isResolved
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : isCritical
                  ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                  : "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400"
            )}>
              {isResolved ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white text-sm">{incident.ticketNumber}</div>
              <div className={cn(
                "text-[10px] font-mono",
                isResolved ? "text-emerald-600 dark:text-emerald-400" : isCritical ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
              )}>
                {incident.severity} • {getPhaseText()}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Customer Info - Editable */}
          <div className="p-4 space-y-1 border-b border-gray-200 dark:border-zinc-800">
            <EditableField
              value={incident.customerName}
              fieldKey="customer_name"
              icon={<User className="h-4 w-4" />}
              placeholder="Nombre del cliente"
              onSave={handleFieldSave}
            />
            <EditableField
              value={incident.customerPhone}
              fieldKey="customer_phone"
              icon={<Phone className="h-4 w-4" />}
              placeholder="Teléfono"
              onSave={handleFieldSave}
            />
            <EditableField
              value={incident.address}
              fieldKey="address"
              icon={<MapPin className="h-4 w-4" />}
              placeholder="Dirección"
              onSave={handleFieldSave}
            />
            <div className="flex items-center gap-2 text-sm py-1">
              <Clock className="h-4 w-4 text-gray-500 dark:text-zinc-500" />
              <span className="text-gray-500 dark:text-zinc-400 text-xs">
                {formatDateTime(incident.createdAt)} ({formatDuration(elapsedMins)})
              </span>
            </div>
          </div>

          {/* Description - Editable */}
          <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
            <EditableField
              value={incident.description}
              fieldKey="description"
              icon={<FileText className="h-4 w-4" />}
              placeholder="Descripción de la alarma"
              onSave={handleFieldSave}
              multiline
            />
          </div>

          {/* Technician Info */}
          {incident.craneAssigned && (
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800 bg-orange-50 dark:bg-orange-950/10">
              <div className="flex items-center gap-2 text-sm mb-2">
                <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-orange-600 dark:text-orange-400 font-medium">Técnico asignado</span>
              </div>
              {incident.craneCompany && (
                <div className="text-sm text-gray-700 dark:text-zinc-300 ml-6">{incident.craneCompany}</div>
              )}
              {incident.cranePhone && (
                <div className="text-xs text-gray-500 dark:text-zinc-500 ml-6">{incident.cranePhone}</div>
              )}
              {incident.craneETA && (
                <div className="text-xs text-orange-600 dark:text-orange-400 ml-6 mt-1">
                  ETA: {formatDateTime(incident.craneETA)}
                </div>
              )}
            </div>
          )}

          {/* HappyRobot Link */}
          {incident.happyRobotRunLink && (
            <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
              <a
                href={incident.happyRobotRunLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-500 dark:hover:text-purple-300 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Ver en HappyRobot
              </a>
            </div>
          )}

          {/* Timeline Logs */}
          <div className="p-4">
            <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-zinc-500 mb-3">
              Registro de actividad
            </div>
            {isLoading ? (
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2 animate-pulse" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-gray-500 dark:text-zinc-600 text-xs">Sin registros aún</div>
            ) : (
              <div className="space-y-3 max-h-[200px] overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="flex gap-2 text-xs">
                    <span className="text-gray-500 dark:text-zinc-600 shrink-0 w-[50px] tabular-nums text-[10px]">
                      {formatTime(log.timestamp)}
                    </span>
                    <div className="flex-1 border-l-2 border-gray-200 dark:border-zinc-800 pl-2">
                      <div className={cn("text-[9px] uppercase tracking-wider mb-0.5", getSourceColor(log.source))}>
                        {log.source}
                      </div>
                      <div className="leading-relaxed text-gray-700 dark:text-zinc-300">
                        {log.message}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-zinc-800 shrink-0 space-y-2">
          {!isResolved && (
            <button
              onClick={handleResolve}
              disabled={isResolving}
              className={cn(
                "w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                "bg-emerald-600 hover:bg-emerald-500 text-white",
                isResolving && "opacity-50 cursor-not-allowed"
              )}
            >
              {isResolving ? "Resolviendo..." : "Marcar como resuelta"}
            </button>
          )}
          
          {/* Delete Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar incidencia
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors border border-gray-300 dark:border-zinc-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors",
                  "bg-red-600 hover:bg-red-500 text-white",
                  isDeleting && "opacity-50 cursor-not-allowed"
                )}
              >
                {isDeleting ? "Eliminando..." : "Confirmar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
