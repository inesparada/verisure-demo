"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/hooks";
import { 
  Link2, 
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
  Shield,
} from "lucide-react";

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings();
  const [formState, setFormState] = useState({
    defaultHappyRobotLink: settings?.defaultHappyRobotLink || "",
    slaWarningMinutes: settings?.slaWarningMinutes || 15,
    slaCriticalMinutes: settings?.slaCriticalMinutes || 30,
    controlTowerHours: settings?.controlTowerHours || 5,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Update form when settings load
  useState(() => {
    if (settings) {
      setFormState({
        defaultHappyRobotLink: settings.defaultHappyRobotLink,
        slaWarningMinutes: settings.slaWarningMinutes,
        slaCriticalMinutes: settings.slaCriticalMinutes,
        controlTowerHours: settings.controlTowerHours,
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await updateSettings(formState);
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--mutua-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">CARGANDO CONFIGURACIÓN...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mutua-bg)] p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
          Configuración
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Ajustes del sistema de asistencia en carretera
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* HappyRobot Integration */}
            <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-purple-400" />
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Integración HappyRobot
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Configura el enlace predeterminado para ver las ejecuciones en HappyRobot
                </p>
              </div>
              <div className="p-5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  URL base de HappyRobot
                </label>
                <input
                  type="url"
                  value={formState.defaultHappyRobotLink}
                  onChange={(e) => setFormState({ ...formState, defaultHappyRobotLink: e.target.value })}
                  placeholder="https://v2.platform.happyrobot.ai/workflow"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    "bg-[var(--mutua-bg)] border-[var(--mutua-border)]",
                    "text-zinc-900 dark:text-white placeholder-zinc-500",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  )}
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Este enlace se utilizará como plantilla para los enlaces de seguimiento de llamadas.
                </p>
              </div>
            </div>

            {/* SLA Configuration - Two columns inside */}
            <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Configuración de SLA
                  </h2>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Define los umbrales de tiempo para las alertas de SLA
                </p>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Tiempo de advertencia (minutos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={formState.slaWarningMinutes}
                      onChange={(e) => setFormState({ ...formState, slaWarningMinutes: parseInt(e.target.value) || 15 })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                        "bg-[var(--mutua-bg)] border-[var(--mutua-border)]",
                        "text-zinc-900 dark:text-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      )}
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Advertencia cuando una incidencia supere este tiempo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Tiempo crítico (minutos)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="180"
                      value={formState.slaCriticalMinutes}
                      onChange={(e) => setFormState({ ...formState, slaCriticalMinutes: parseInt(e.target.value) || 30 })}
                      className={cn(
                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                        "bg-[var(--mutua-bg)] border-[var(--mutua-border)]",
                        "text-zinc-900 dark:text-white",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      )}
                    />
                    <p className="text-xs text-zinc-500 mt-2">
                      Incumplimiento de SLA si supera este tiempo.
                    </p>
                  </div>
                </div>

                {/* Visual SLA Preview */}
                <div className="mt-5 p-4 rounded-lg bg-[var(--mutua-bg)] border border-[var(--mutua-border)]">
                  <div className="text-xs font-medium text-zinc-500 mb-3">Vista previa de umbrales</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 rounded-full bg-zinc-300 dark:bg-zinc-800 overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500"
                        style={{ width: `${(formState.slaWarningMinutes / formState.slaCriticalMinutes) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-orange-500"
                        style={{ width: `${((formState.slaCriticalMinutes - formState.slaWarningMinutes) / formState.slaCriticalMinutes) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-zinc-500">
                    <span>0 min</span>
                    <span className="text-orange-400">{formState.slaWarningMinutes} min (Advertencia)</span>
                    <span className="text-red-400">{formState.slaCriticalMinutes} min (Crítico)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors",
                  "bg-blue-600 hover:bg-blue-500 text-white",
                  isSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </button>

              {saveStatus === "success" && (
                <div className="flex items-center gap-2 text-sm text-emerald-500">
                  <CheckCircle className="h-4 w-4" />
                  Cambios guardados correctamente
                </div>
              )}

              {saveStatus === "error" && (
                <div className="flex items-center gap-2 text-sm text-red-500">
                  <AlertCircle className="h-4 w-4" />
                  Error al guardar los cambios
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            {/* Centro de Control Configuration */}
            <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Centro de Control
                  </h2>
                </div>
              </div>
              <div className="p-5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Horas de retención
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={formState.controlTowerHours}
                  onChange={(e) => setFormState({ ...formState, controlTowerHours: parseInt(e.target.value) || 5 })}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    "bg-[var(--mutua-bg)] border-[var(--mutua-border)]",
                    "text-zinc-900 dark:text-white",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  )}
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Incidencias visibles en Centro de Control durante las últimas {formState.controlTowerHours}h.
                </p>
              </div>
            </div>

            {/* API Info */}
            <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--mutua-border)] bg-[var(--mutua-surface)]">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-400" />
                  <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    API Info
                  </h2>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Webhook Endpoint</div>
                  <code className="text-xs bg-[var(--mutua-bg)] px-2 py-1 rounded border border-[var(--mutua-border)] text-zinc-700 dark:text-zinc-300 block truncate">
                    /api/incidents
                  </code>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Autenticación</div>
                  <code className="text-xs bg-[var(--mutua-bg)] px-2 py-1 rounded border border-[var(--mutua-border)] text-zinc-700 dark:text-zinc-300 block">
                    X-API-KEY: ********
                  </code>
                </div>
                <div className="pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-500 font-medium">Sistema operativo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

