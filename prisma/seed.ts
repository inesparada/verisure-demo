import "dotenv/config";
import { PrismaClient, IncidentStatus, Severity, IncidentPhase } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Seed data with 5 Verisure alarm incidents across Madrid:
 *
 * 1. Calle Serrano 41, Salamanca — sensor de movimiento
 * 2. Paseo de la Castellana 200, Chamartín — detector de humo
 * 3. Calle Gran Vía 32 — alarma de apertura de ventana
 * 4. Avenida de América 15 — resuelta
 * 5. Calle Alcalá 120 — llamada en curso
 */
async function main() {
  console.log("🌱 Seeding database...");

  await prisma.incidentLog.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.settings.deleteMany();

  await prisma.settings.create({
    data: {
      id: "default",
      defaultHappyRobotLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow",
      slaWarningMinutes: 20,
      slaCriticalMinutes: 45,
      controlTowerHours: 5,
    },
  });
  console.log("✅ Settings created");

  // Alarm 1: Sensor de movimiento — CONFIRMED (técnico asignado)
  const incident1 = await prisma.incident.create({
    data: {
      ticketNumber: "VS-2026-0001",
      status: IncidentStatus.ACTIVE,
      phase: IncidentPhase.CONFIRMED,
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
      severity: Severity.HIGH,
      craneAssigned: false,
      happyRobotRunLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow/run/vs001",
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      { incidentId: incident1.id, message: "Alarma activada — sensor de movimiento en salón", source: "SYSTEM", status: "INFO", timestamp: new Date(Date.now() - 15 * 60 * 1000) },
      { incidentId: incident1.id, message: "Titular identificada: Isabel Moreno Castillo — Póliza: VER-2024-789456", source: "AGENT", status: "SUCCESS", timestamp: new Date(Date.now() - 12 * 60 * 1000) },
      { incidentId: incident1.id, message: "Sin respuesta al código de verificación. Alarma confirmada como real.", source: "AGENT", status: "WARNING", timestamp: new Date(Date.now() - 10 * 60 * 1000) },
      { incidentId: incident1.id, message: "Localización confirmada: Calle Serrano 41, Salamanca, Madrid", source: "AGENT", status: "SUCCESS", metadata: { lat: 40.4235, lng: -3.6887 }, timestamp: new Date(Date.now() - 9 * 60 * 1000) },
    ],
  });
  console.log(`✅ Created: ${incident1.ticketNumber}`);

  // Alarm 2: Detector de humo — CRANE_ASSIGNED (técnico en camino)
  const incident2 = await prisma.incident.create({
    data: {
      ticketNumber: "VS-2026-0002",
      status: IncidentStatus.ACTIVE,
      phase: IncidentPhase.CRANE_ASSIGNED,
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
      severity: Severity.CRITICAL,
      craneAssigned: true,
      craneCompany: "Verisure Técnicos Madrid Norte",
      cranePhone: "+34 900 100 102",
      craneETA: new Date(Date.now() + 8 * 60 * 1000),
      happyRobotRunLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow/run/vs002",
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      { incidentId: incident2.id, message: "Alarma activada — detector de humo en cocina", source: "SYSTEM", status: "INFO", timestamp: new Date(Date.now() - 28 * 60 * 1000) },
      { incidentId: incident2.id, message: "Titular identificado: Alejandro Vega Romero — Póliza: VER-2023-123456", source: "AGENT", status: "SUCCESS", timestamp: new Date(Date.now() - 25 * 60 * 1000) },
      { incidentId: incident2.id, message: "Alarma confirmada: posible cortocircuito en cocina", source: "AGENT", status: "WARNING", timestamp: new Date(Date.now() - 22 * 60 * 1000) },
      { incidentId: incident2.id, message: "Localización confirmada: Paseo de la Castellana 200, Madrid", source: "AGENT", status: "SUCCESS", metadata: { lat: 40.4596, lng: -3.6927 }, timestamp: new Date(Date.now() - 20 * 60 * 1000) },
      { incidentId: incident2.id, message: "Técnico asignado: Verisure Técnicos Madrid Norte (ETA: 8 min)", source: "SYSTEM", status: "SUCCESS", timestamp: new Date(Date.now() - 10 * 60 * 1000) },
    ],
  });
  console.log(`✅ Created: ${incident2.ticketNumber}`);

  // Alarm 3: Apertura de ventana — INFO_COLLECTED
  const incident3 = await prisma.incident.create({
    data: {
      ticketNumber: "VS-2026-0003",
      status: IncidentStatus.ACTIVE,
      phase: IncidentPhase.INFO_COLLECTED,
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
      severity: Severity.MEDIUM,
      craneAssigned: false,
      happyRobotRunLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow/run/vs003",
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      { incidentId: incident3.id, message: "Alarma activada — sensor de apertura en ventana trasera", source: "SYSTEM", status: "INFO", timestamp: new Date(Date.now() - 5 * 60 * 1000) },
      { incidentId: incident3.id, message: "Titular identificada: Carmen Delgado Fuentes — Póliza: VER-2025-654321", source: "AGENT", status: "SUCCESS", timestamp: new Date(Date.now() - 3 * 60 * 1000) },
    ],
  });
  console.log(`✅ Created: ${incident3.ticketNumber}`);

  // Alarm 4: RESOLVED — acceso no autorizado descartado
  const incident4 = await prisma.incident.create({
    data: {
      ticketNumber: "VS-2026-0004",
      status: IncidentStatus.RESOLVED,
      phase: IncidentPhase.CRANE_ASSIGNED,
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
      severity: Severity.LOW,
      craneAssigned: false,
      createdAt: new Date(Date.now() - (2 * 60 + 25) * 60 * 1000),
      resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      happyRobotRunLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow/run/vs004",
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      { incidentId: incident4.id, message: "Alarma activada — sensor de movimiento en pasillo", source: "SYSTEM", status: "INFO", timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      { incidentId: incident4.id, message: "Titular identificado: Roberto Iglesias Prieto — Póliza: VER-2024-111222", source: "AGENT", status: "SUCCESS", timestamp: new Date(Date.now() - 3.9 * 60 * 60 * 1000) },
      { incidentId: incident4.id, message: "Titular confirmó: falsa alarma por mascota en el domicilio", source: "AGENT", status: "INFO", timestamp: new Date(Date.now() - 3.7 * 60 * 60 * 1000) },
      { incidentId: incident4.id, message: "Alarma resuelta — falsa alarma descartada", source: "SYSTEM", status: "SUCCESS", timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    ],
  });
  console.log(`✅ Created: ${incident4.ticketNumber}`);

  // Alarm 5: GATHERING_INFO — llamada entrante
  const incident5 = await prisma.incident.create({
    data: {
      ticketNumber: "VS-2026-0005",
      status: IncidentStatus.ACTIVE,
      phase: IncidentPhase.GATHERING_INFO,
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
      severity: Severity.MEDIUM,
      craneAssigned: false,
      happyRobotRunLink: "https://v2.platform.happyrobot.ai/insparadasorganization/workflow/run/vs005",
    },
  });

  await prisma.incidentLog.createMany({
    data: [
      { incidentId: incident5.id, message: "Alarma activada — recogiendo información del titular", source: "SYSTEM", status: "INFO", timestamp: new Date(Date.now() - 1 * 60 * 1000) },
    ],
  });
  console.log(`✅ Created: ${incident5.ticketNumber}`);

  console.log("\n📊 Summary:");
  console.log("  - 5 alarmas Verisure creadas en Madrid");
  console.log("  - Phases: GATHERING_INFO (1), INFO_COLLECTED (1), CONFIRMED (1), CRANE_ASSIGNED (2)");
  console.log("  - Status: ACTIVE (4), RESOLVED (1)");
  console.log("\n🎉 Seed completado!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
