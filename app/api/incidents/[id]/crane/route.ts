import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";
import { IncidentPhase } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/incidents/[id]/crane
 * 
 * Assign a crane/roadside assistance service to an incident.
 * This endpoint:
 * 1. Sets craneAssigned to true
 * 2. Updates crane company and contact info
 * 3. Sets phase to CRANE_ASSIGNED
 * 4. Creates a log entry for crane assignment
 * 5. Broadcasts updates via Pusher
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate X-API-KEY header (optional)
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[PATCH /api/incidents/[id]/crane] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      crane_company,
      crane_phone,
      crane_eta_minutes,  // ETA in minutes from now
    } = body;

    // Validate required fields
    if (!crane_company) {
      return NextResponse.json(
        { error: "crane_company is required" },
        { status: 400 }
      );
    }

    // Check if incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      phase: IncidentPhase.CRANE_ASSIGNED,
      craneAssigned: true,
      craneCompany: crane_company,
    };

    if (crane_phone) updateData.cranePhone = crane_phone;
    
    // Calculate ETA from minutes
    let etaDate: Date | null = null;
    if (crane_eta_minutes !== undefined && crane_eta_minutes !== null) {
      const minutes = parseInt(crane_eta_minutes, 10);
      if (!isNaN(minutes) && minutes > 0) {
        etaDate = new Date(Date.now() + minutes * 60 * 1000);
        updateData.craneETA = etaDate;
      }
    }

    // Update the incident first
    await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    // Build log message with ETA if provided
    const etaText = crane_eta_minutes ? ` (ETA: ${crane_eta_minutes} min)` : "";
    
    // Create log entry for crane assignment
    const log = await prisma.incidentLog.create({
      data: {
        incidentId: id,
        message: `Grúa asignada: ${crane_company}${etaText}`,
        source: "AGENT",
        status: "SUCCESS",
        metadata: {
          craneCompany: crane_company,
          cranePhone: crane_phone || null,
          craneETAMinutes: crane_eta_minutes || null,
          craneETATimestamp: etaDate?.toISOString() || null,
        },
      },
    });

    // Refetch the incident with the new log included
    const updatedIncident = await prisma.incident.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    // Broadcast the incident update (now includes the new log)
    await broadcastEvent("incident:updated", { incident: updatedIncident });

    // Broadcast the log creation
    await broadcastEvent("incident-log:created", {
      incidentId: id,
      log,
    });

    console.log(`[PATCH /api/incidents/[id]/crane] Crane assigned to incident: ${updatedIncident?.ticketNumber} - ${crane_company}${etaText}`);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      crane: {
        company: crane_company,
        phone: crane_phone || null,
        eta_minutes: crane_eta_minutes || null,
        eta_timestamp: etaDate?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/incidents/[id]/crane] Error:", error);
    return NextResponse.json(
      { error: "Failed to assign crane" },
      { status: 500 }
    );
  }
}

