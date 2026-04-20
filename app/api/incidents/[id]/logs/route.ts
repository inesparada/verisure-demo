import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid source and status values
const VALID_SOURCES = ["AGENT", "SYSTEM", "CRANE", "CUSTOMER"];
const VALID_STATUSES = ["INFO", "SUCCESS", "WARNING", "ERROR"];

// GET /api/incidents/[id]/logs - Get all logs for an incident
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Verify incident exists
    const incident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    const logs = await prisma.incidentLog.findMany({
      where: { incidentId: id },
      orderBy: { timestamp: "asc" },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("[GET /api/incidents/[id]/logs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}

// POST /api/incidents/[id]/logs - Add a log entry (called by AI agent during conversation)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate X-API-KEY header (optional)
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[POST /api/incidents/[id]/logs] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { message, source = "AGENT", status = "INFO", metadata } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Validate source
    if (!VALID_SOURCES.includes(source.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${VALID_SOURCES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate status
    if (!VALID_STATUSES.includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify incident exists
    const incident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true, ticketNumber: true },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Create the log entry
    const log = await prisma.incidentLog.create({
      data: {
        incidentId: id,
        message,
        source: source.toUpperCase(),
        status: status.toUpperCase(),
        metadata: metadata || null,
      },
    });

    // Broadcast the new log
    await broadcastEvent("incident-log:created", {
      incidentId: id,
      log,
    });

    console.log(`[POST /api/incidents/[id]/logs] Log added to incident ${incident.ticketNumber}: ${message.substring(0, 50)}...`);

    return NextResponse.json({
      success: true,
      log_id: log.id,
    }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/incidents/[id]/logs] Error:", error);
    return NextResponse.json(
      { error: "Failed to create log" },
      { status: 500 }
    );
  }
}



