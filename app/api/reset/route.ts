import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { IncidentPhase } from "@prisma/client";

const SAMPLE_INCIDENTS = [
  {
    ticketNumber: "VS-2026-0001",
    status: "ACTIVE" as const,
    phase: IncidentPhase.CONFIRMED,
    severity: "HIGH" as const,
    customerName: "Isabel Moreno Castillo",
    customerPhone: "+34 612 345 678",
    policyNumber: "VER-2024-789456",
    latitude: 40.4235,
    longitude: -3.6887,
    address: "Calle Serrano 41, Salamanca, Madrid",
    vehiclePlate: null,
    vehicleModel: null,
    vehicleBrand: null,
    description: "Sensor de movimiento activado en salón principal. Titular fuera del domicilio. Sin respuesta al código de verificación.",
    comments: "Zona de alto valor. Técnico en ruta.",
    craneAssigned: false,
  },
  {
    ticketNumber: "VS-2026-0002",
    status: "ACTIVE" as const,
    phase: IncidentPhase.CRANE_ASSIGNED,
    severity: "CRITICAL" as const,
    customerName: "Alejandro Vega Romero",
    customerPhone: "+34 623 456 789",
    policyNumber: "VER-2023-123456",
    latitude: 40.4596,
    longitude: -3.6927,
    address: "Paseo de la Castellana 200, Chamartín, Madrid",
    vehiclePlate: null,
    vehicleModel: null,
    vehicleBrand: null,
    description: "Detector de humo activado en cocina. Titular confirmó posible cortocircuito. Técnico en ruta.",
    comments: "ETA técnico: 8 minutos.",
    craneAssigned: true,
    craneCompany: "Verisure Técnicos Madrid Norte",
    cranePhone: "+34 900 100 102",
    craneETA: new Date(Date.now() + 8 * 60 * 1000),
  },
  {
    ticketNumber: "VS-2026-0003",
    status: "ACTIVE" as const,
    phase: IncidentPhase.INFO_COLLECTED,
    severity: "MEDIUM" as const,
    customerName: "Carmen Delgado Fuentes",
    customerPhone: "+34 634 567 890",
    policyNumber: "VER-2025-654321",
    latitude: null,
    longitude: null,
    address: null,
    vehiclePlate: null,
    vehicleModel: null,
    vehicleBrand: null,
    description: null,
    craneAssigned: false,
  },
  {
    ticketNumber: "VS-2026-0004",
    status: "RESOLVED" as const,
    phase: IncidentPhase.CRANE_ASSIGNED,
    severity: "LOW" as const,
    customerName: "Roberto Iglesias Prieto",
    customerPhone: "+34 645 678 901",
    policyNumber: "VER-2024-111222",
    latitude: 40.4275,
    longitude: -3.6766,
    address: "Avenida de América 15, Madrid",
    vehiclePlate: null,
    vehicleModel: null,
    vehicleBrand: null,
    description: "Sensor de movimiento activado en pasillo. Titular confirmó que fue la mascota. Falsa alarma descartada.",
    comments: "Resuelta sin intervención técnica.",
    craneAssigned: false,
    createdAt: new Date(Date.now() - (2 * 60 + 25) * 60 * 1000),
    resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    ticketNumber: "VS-2026-0005",
    status: "ACTIVE" as const,
    phase: IncidentPhase.GATHERING_INFO,
    severity: "MEDIUM" as const,
    customerName: null,
    customerPhone: null,
    policyNumber: null,
    latitude: null,
    longitude: null,
    address: null,
    vehiclePlate: null,
    vehicleModel: null,
    vehicleBrand: null,
    description: null,
    craneAssigned: false,
  },
];

const SAMPLE_LOGS_MAP: Record<string, Array<{ message: string; source: string; status: string; metadata?: { lat: number; lng: number } }>> = {
  "VS-2026-0001": [
    { message: "Alarma activada — sensor de movimiento en salón", source: "SYSTEM", status: "INFO" },
    { message: "Titular identificada: Isabel Moreno Castillo — Póliza: VER-2024-789456", source: "AGENT", status: "SUCCESS" },
    { message: "Sin respuesta al código de verificación. Alarma confirmada como real.", source: "AGENT", status: "WARNING" },
    { message: "Localización confirmada: Calle Serrano 41, Salamanca, Madrid", source: "AGENT", status: "SUCCESS", metadata: { lat: 40.4235, lng: -3.6887 } },
  ],
  "VS-2026-0002": [
    { message: "Alarma activada — detector de humo en cocina", source: "SYSTEM", status: "INFO" },
    { message: "Titular identificado: Alejandro Vega Romero — Póliza: VER-2023-123456", source: "AGENT", status: "SUCCESS" },
    { message: "Alarma confirmada: posible cortocircuito en cocina", source: "AGENT", status: "WARNING" },
    { message: "Localización confirmada: Paseo de la Castellana 200, Madrid", source: "AGENT", status: "SUCCESS", metadata: { lat: 40.4596, lng: -3.6927 } },
    { message: "Técnico asignado: Verisure Técnicos Madrid Norte (ETA: 8 min)", source: "SYSTEM", status: "SUCCESS" },
  ],
  "VS-2026-0003": [
    { message: "Alarma activada — sensor de apertura en ventana trasera", source: "SYSTEM", status: "INFO" },
    { message: "Titular identificada: Carmen Delgado Fuentes — Póliza: VER-2025-654321", source: "AGENT", status: "SUCCESS" },
  ],
  "VS-2026-0004": [
    { message: "Alarma activada — sensor de movimiento en pasillo", source: "SYSTEM", status: "INFO" },
    { message: "Titular identificado: Roberto Iglesias Prieto — Póliza: VER-2024-111222", source: "AGENT", status: "SUCCESS" },
    { message: "Titular confirmó: falsa alarma por mascota en el domicilio", source: "AGENT", status: "INFO" },
    { message: "Alarma resuelta — falsa alarma descartada", source: "SYSTEM", status: "SUCCESS" },
  ],
  "VS-2026-0005": [
    { message: "Alarma activada — recogiendo información del titular", source: "SYSTEM", status: "INFO" },
  ],
};

export async function POST() {
  try {
    await prisma.incidentLog.deleteMany({});
    await prisma.incident.deleteMany({});

    await prisma.settings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        defaultHappyRobotLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow",
        slaWarningMinutes: 20,
        slaCriticalMinutes: 45,
        controlTowerHours: 5,
      },
    });

    for (const incidentData of SAMPLE_INCIDENTS) {
      const incident = await prisma.incident.create({ data: incidentData });
      const logsToCreate = SAMPLE_LOGS_MAP[incidentData.ticketNumber] || [];
      for (let i = 0; i < logsToCreate.length; i++) {
        await prisma.incidentLog.create({
          data: {
            incidentId: incident.id,
            message: logsToCreate[i].message,
            source: logsToCreate[i].source,
            status: logsToCreate[i].status,
            timestamp: new Date(Date.now() - (logsToCreate.length - i) * 2 * 60 * 1000),
            metadata: logsToCreate[i].metadata,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Demo reset successfully", incidents: SAMPLE_INCIDENTS.length });
  } catch (error) {
    console.error("Error resetting demo:", error);
    return NextResponse.json({ success: false, error: "Failed to reset demo" }, { status: 500 });
  }
}
