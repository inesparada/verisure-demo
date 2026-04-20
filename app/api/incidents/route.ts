import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";

// Generate ticket number in format VS-YYYY-XXXX
async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VS-${year}-`;
  
  // Find the highest ticket number for this year
  const lastIncident = await prisma.incident.findFirst({
    where: {
      ticketNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketNumber: "desc",
    },
    select: {
      ticketNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastIncident?.ticketNumber) {
    const lastNumber = parseInt(lastIncident.ticketNumber.split("-")[2], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

// GET /api/incidents - List all incidents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // Filter by status
    const limit = searchParams.get("limit");

    const where = status ? { status: status as "ACTIVE" | "RESOLVED" | "CANCELLED" } : {};

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
          take: 5, // Only include last 5 logs in list view
        },
        _count: {
          select: { logs: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("[GET /api/incidents] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch incidents" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/incidents - Create a new incident (called by AI agent when call starts)
 * 
 * This creates a minimal incident with phase GATHERING_INFO.
 * The incident starts empty and will be populated through subsequent API calls:
 * - PATCH /api/incidents/[id] - Add customer/policy info
 * - PATCH /api/incidents/[id]/confirm - Add location, vehicle, description
 * - PATCH /api/incidents/[id]/crane - Assign crane service
 */
export async function POST(request: NextRequest) {
  try {
    // Validate X-API-KEY header (optional, configurable)
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[POST /api/incidents] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const { happyrobot_run_link } = body;

    // Generate proper ticket number format (MM-YYYY-XXXX)
    const ticketNumber = await generateTicketNumber();

    // Create a minimal incident with GATHERING_INFO phase (default)
    // All other fields are null/empty and will be filled in progressively
    const incident = await prisma.incident.create({
      data: {
        ticketNumber,
        // phase: GATHERING_INFO is the default
        happyRobotRunLink: happyrobot_run_link || null,
      },
      include: {
        logs: true,
      },
    });

    // Create initial system log
    const log = await prisma.incidentLog.create({
      data: {
        incidentId: incident.id,
        message: "Llamada recibida - recogiendo información",
        source: "SYSTEM",
        status: "INFO",
      },
    });

    // Refetch incident with the log included
    const incidentWithLog = await prisma.incident.findUnique({
      where: { id: incident.id },
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
        },
      },
    });

    // Broadcast the new incident
    await broadcastEvent("incident:created", { incident: incidentWithLog });

    // Broadcast the log
    await broadcastEvent("incident-log:created", {
      incidentId: incident.id,
      log,
    });

    console.log(`[POST /api/incidents] Created incident: ${incident.ticketNumber} (phase: GATHERING_INFO)`);

    return NextResponse.json({
      success: true,
      incident_id: incident.id,
      ticket_number: incident.ticketNumber,
      phase: "GATHERING_INFO",
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/incidents] Error:", error);
    return NextResponse.json(
      { error: "Failed to create incident" },
      { status: 500 }
    );
  }
}

