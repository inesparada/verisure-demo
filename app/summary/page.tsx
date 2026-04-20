"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useIncidents, type Incident } from "@/hooks";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Gauge,
  Activity,
  Truck,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatDuration, minutesElapsed } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "orange" | "purple";
}

function KPICard({ title, value, subtitle, trend, icon, color = "blue" }: KPICardProps) {
  const colorClasses = {
    blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
    green: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
    red: "from-red-500/10 to-red-600/5 border-red-500/20",
    orange: "from-orange-500/10 to-orange-600/5 border-orange-500/20",
    purple: "from-purple-500/10 to-purple-600/5 border-purple-500/20",
  };

  const iconColors = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    red: "text-red-400",
    orange: "text-orange-400",
    purple: "text-purple-400",
  };

  return (
    <div className={cn(
      "rounded-xl border p-5 bg-gradient-to-br",
      colorClasses[color],
      "bg-[var(--mutua-card)]"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-lg bg-white/5", iconColors[color])}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium",
            trend >= 0 ? "text-emerald-400" : "text-red-400"
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
        {value}
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">{title}</div>
      {subtitle && (
        <div className="text-xs text-zinc-500 mt-2">{subtitle}</div>
      )}
    </div>
  );
}

export default function SummaryPage() {
  const { incidents, isLoading } = useIncidents();
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("day");

  // Calculate KPIs from incidents
  const kpis = useMemo(() => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const active = incidents.filter((i) => i.status === "ACTIVE");
    const resolved = incidents.filter((i) => i.status === "RESOLVED");

    // Time-filtered incidents
    const getTimeRange = () => {
      switch (timeRange) {
        case "day": return dayAgo;
        case "week": return weekAgo;
        case "month": return monthAgo;
      }
    };

    const rangeStart = getTimeRange();
    const filteredIncidents = incidents.filter(
      (i) => new Date(i.createdAt) >= rangeStart
    );
    const filteredResolved = filteredIncidents.filter((i) => i.status === "RESOLVED");

    // Average resolution time (only for resolved incidents with resolvedAt)
    const resolvedWithTime = resolved.filter((i) => i.resolvedAt);
    const avgResolutionMins = resolvedWithTime.length > 0
      ? Math.round(
          resolvedWithTime.reduce((sum, i) => {
            const created = new Date(i.createdAt).getTime();
            const resolvedAt = new Date(i.resolvedAt!).getTime();
            return sum + (resolvedAt - created) / (1000 * 60);
          }, 0) / resolvedWithTime.length
        )
      : 0;

    // SLA compliance (resolved within 30 minutes)
    const withinSLA = resolvedWithTime.filter((i) => {
      const created = new Date(i.createdAt).getTime();
      const resolvedAt = new Date(i.resolvedAt!).getTime();
      return (resolvedAt - created) / (1000 * 60) <= 30;
    });
    const slaCompliance = resolvedWithTime.length > 0
      ? Math.round((withinSLA.length / resolvedWithTime.length) * 100)
      : 100;

    // Severity distribution
    const bySeverity = {
      CRITICAL: incidents.filter((i) => i.severity === "CRITICAL").length,
      HIGH: incidents.filter((i) => i.severity === "HIGH").length,
      MEDIUM: incidents.filter((i) => i.severity === "MEDIUM").length,
      LOW: incidents.filter((i) => i.severity === "LOW").length,
    };

    // Crane assigned percentage
    const withCrane = incidents.filter((i) => i.craneAssigned).length;
    const cranePercentage = incidents.length > 0
      ? Math.round((withCrane / incidents.length) * 100)
      : 0;

    return {
      active: active.length,
      resolved: resolved.length,
      total: incidents.length,
      filteredTotal: filteredIncidents.length,
      filteredResolved: filteredResolved.length,
      resolutionRate: filteredIncidents.length > 0
        ? Math.round((filteredResolved.length / filteredIncidents.length) * 100)
        : 0,
      avgResolutionMins,
      slaCompliance,
      bySeverity,
      cranePercentage,
    };
  }, [incidents, timeRange]);

  // Mock hourly data for chart
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const hour = i.toString().padStart(2, "0") + ":00";
      return {
        hour,
        incidents: Math.floor(Math.random() * 5) + 1,
        resolved: Math.floor(Math.random() * 4),
      };
    });
    return hours;
  }, []);

  // Severity distribution for pie chart
  const severityData = [
    { name: "Crítica", value: kpis.bySeverity.CRITICAL, color: "#ef4444" },
    { name: "Alta", value: kpis.bySeverity.HIGH, color: "#f97316" },
    { name: "Media", value: kpis.bySeverity.MEDIUM, color: "#f59e0b" },
    { name: "Baja", value: kpis.bySeverity.LOW, color: "#22c55e" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--mutua-bg)]">
        <div className="flex items-center gap-3 text-zinc-500">
          <div className="w-5 h-5 border-2 border-zinc-700 border-t-blue-500 rounded-full animate-spin" />
          <span className="font-mono text-sm">CARGANDO MÉTRICAS...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--mutua-bg)] p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">
          Panel de Resumen
        </h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Métricas y KPIs del servicio de asistencia en carretera
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-sm text-zinc-500">Período:</span>
        <div className="inline-flex rounded-lg border border-[var(--mutua-border)] bg-[var(--mutua-card)] p-1">
          {[
            { value: "day", label: "Hoy" },
            { value: "week", label: "Semana" },
            { value: "month", label: "Mes" },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value as typeof timeRange)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                timeRange === option.value
                  ? "bg-blue-500/20 text-blue-500"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard
          title="Incidencias Activas"
          value={kpis.active}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={kpis.active > 5 ? "red" : kpis.active > 0 ? "orange" : "green"}
        />
        <KPICard
          title="Resueltas"
          value={kpis.filteredResolved}
          subtitle={`${kpis.resolutionRate}% tasa de resolución`}
          icon={<CheckCircle className="h-5 w-5" />}
          color="green"
          trend={12}
        />
        <KPICard
          title="Tiempo Medio de Resolución"
          value={formatDuration(kpis.avgResolutionMins)}
          icon={<Clock className="h-5 w-5" />}
          color="blue"
          subtitle="Promedio histórico"
        />
        <KPICard
          title="Cumplimiento SLA"
          value={`${kpis.slaCompliance}%`}
          subtitle="Resueltas en < 30 min"
          icon={<Gauge className="h-5 w-5" />}
          color={kpis.slaCompliance >= 90 ? "green" : kpis.slaCompliance >= 70 ? "orange" : "red"}
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KPICard
          title="Total de Incidencias"
          value={kpis.filteredTotal}
          subtitle={`En el período seleccionado`}
          icon={<Activity className="h-5 w-5" />}
          color="purple"
        />
        <KPICard
          title="Asistencias con Grúa"
          value={`${kpis.cranePercentage}%`}
          subtitle={`${incidents.filter((i) => i.craneAssigned).length} asistencias`}
          icon={<Truck className="h-5 w-5" />}
          color="orange"
        />
        <KPICard
          title="Histórico Total"
          value={kpis.total}
          subtitle="Todas las incidencias"
          icon={<Calendar className="h-5 w-5" />}
          color="blue"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart */}
        <div className="lg:col-span-2 rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Actividad por Hora
          </h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fill: '#71717a', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="incidents" fill="#f97316" radius={[4, 4, 0, 0]} name="Nuevas" />
                <Bar dataKey="resolved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Resueltas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
            Distribución por Severidad
          </h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    border: '1px solid #27272a',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-zinc-500">{item.name}</span>
                </div>
                <span className="font-medium text-zinc-900 dark:text-white">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Response Time Trend */}
      <div className="mt-6 rounded-xl border border-[var(--mutua-border)] bg-[var(--mutua-card)] p-5">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">
          Tendencia de Tiempo de Respuesta (últimos 7 días)
        </h3>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { day: "Lun", avgTime: 18 },
                { day: "Mar", avgTime: 22 },
                { day: "Mié", avgTime: 15 },
                { day: "Jue", avgTime: 20 },
                { day: "Vie", avgTime: 25 },
                { day: "Sáb", avgTime: 12 },
                { day: "Dom", avgTime: 10 },
              ]}
            >
              <XAxis 
                dataKey="day" 
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'Minutos', angle: -90, position: 'insideLeft', style: { fill: '#71717a', fontSize: 10 } }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#18181b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  fontSize: 12,
                }}
                formatter={(value) => [`${value} min`, 'Tiempo medio']}
              />
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}



