import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";
import { IncidentPhase } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/incidents/[id] - Get a single incident with all logs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(incident);
  } catch (error) {
    console.error("[GET /api/incidents/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/incidents/[id] - Update incident
 * 
 * Used primarily for:
 * - Adding customer/policy info (updates phase to INFO_COLLECTED)
 * - Resolving incidents (updates status to RESOLVED)
 * - General field updates
 * 
 * For location/vehicle confirmation, use /api/incidents/[id]/confirm
 * For crane assignment, use /api/incidents/[id]/crane
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate X-API-KEY header only if one is provided (external API calls)
    // Dashboard calls don't need to send a key
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (apiKey && expectedKey && apiKey !== expectedKey) {
      console.warn("[PATCH /api/incidents/[id]] Invalid API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

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
    const updateData: Record<string, unknown> = {};
    const logsToCreate: Array<{ message: string; source: string; status: string }> = [];

    // Status update
    if (body.status) {
      updateData.status = body.status.toUpperCase();
      if (body.status.toUpperCase() === "RESOLVED") {
        updateData.resolvedAt = new Date();
        logsToCreate.push({
          message: "Incidencia marcada como resuelta",
          source: "SYSTEM",
          status: "SUCCESS",
        });
      }
    }

    // Customer info - if policy_number is being set, update phase to INFO_COLLECTED
    const isAddingPolicyInfo = body.policy_number !== undefined && body.policy_number !== null;
    const isAddingCustomerName = body.customer_name !== undefined && body.customer_name !== null;
    const isAddingCustomerPhone = body.customer_phone !== undefined && body.customer_phone !== null;
    
    if (body.customer_name !== undefined) updateData.customerName = body.customer_name;
    if (body.customer_phone !== undefined) updateData.customerPhone = body.customer_phone;
    if (body.policy_number !== undefined) updateData.policyNumber = body.policy_number;

    // If we're adding customer/policy info, update phase to INFO_COLLECTED (only if still in GATHERING_INFO)
    if (isAddingPolicyInfo && existingIncident.phase === IncidentPhase.GATHERING_INFO) {
      updateData.phase = IncidentPhase.INFO_COLLECTED;
    }

    // Always create a log when customer info is updated (for any PATCH call with customer data)
    if (isAddingPolicyInfo || isAddingCustomerName || isAddingCustomerPhone) {
      const parts = [];
      if (body.customer_name) parts.push(`Cliente: ${body.customer_name}`);
      if (body.policy_number) parts.push(`Póliza: ${body.policy_number}`);
      if (body.customer_phone) parts.push(`Tel: ${body.customer_phone}`);
      
      logsToCreate.push({
        message: parts.length > 0 ? parts.join(" • ") : "Información del cliente actualizada",
        source: "AGENT",
        status: "SUCCESS",
      });
    }

    // Vehicle info
    if (body.vehicle_plate !== undefined) updateData.vehiclePlate = body.vehicle_plate;
    if (body.vehicle_model !== undefined) updateData.vehicleModel = body.vehicle_model;
    if (body.vehicle_brand !== undefined) updateData.vehicleBrand = body.vehicle_brand;

    // Incident details
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity.toUpperCase();
    if (body.comments !== undefined) updateData.comments = body.comments;

    // Location
    if (body.latitude !== undefined) updateData.latitude = parseFloat(body.latitude);
    if (body.longitude !== undefined) updateData.longitude = parseFloat(body.longitude);
    if (body.address !== undefined) updateData.address = body.address;

    // Crane/assistance (prefer dedicated /crane endpoint)
    if (body.crane_assigned !== undefined) updateData.craneAssigned = body.crane_assigned;
    if (body.crane_company !== undefined) updateData.craneCompany = body.crane_company;
    if (body.crane_phone !== undefined) updateData.cranePhone = body.crane_phone;
    if (body.crane_eta !== undefined) updateData.craneETA = new Date(body.crane_eta);

    // HappyRobot link
    if (body.happyrobot_run_link !== undefined) updateData.happyRobotRunLink = body.happyrobot_run_link;

    // Update the incident first
    await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    // Create logs for significant changes
    const createdLogs = [];
    for (const logData of logsToCreate) {
      const log = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          ...logData,
        },
      });
      createdLogs.push(log);
    }

    // Refetch the incident with all new logs included
    const updatedIncident = await prisma.incident.findUnique({
      where: { id },
      include: {
        logs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    // Broadcast the update (now includes all new logs)
    await broadcastEvent("incident:updated", { incident: updatedIncident });

    // Broadcast each log
    for (const log of createdLogs) {
      await broadcastEvent("incident-log:created", {
        incidentId: id,
        log,
      });
    }

    console.log(`[PATCH /api/incidents/[id]] Updated incident: ${updatedIncident?.ticketNumber}${updateData.phase ? ` (phase: ${updateData.phase})` : ""}`);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      phase: updatedIncident?.phase,
      logs_created: createdLogs.length,
    });
  } catch (error) {
    console.error("[PATCH /api/incidents/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to update incident" },
      { status: 500 }
    );
  }
}

// DELETE /api/incidents/[id] - Delete an incident
// Note: No API key required for dashboard deletions
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Delete all logs first (cascade should handle this, but being explicit)
    await prisma.incidentLog.deleteMany({
      where: { incidentId: id },
    });

    // Delete the incident
    await prisma.incident.delete({
      where: { id },
    });

    // Broadcast the deletion
    await broadcastEvent("incident:deleted", { incidentId: id });

    console.log(`[DELETE /api/incidents/[id]] Deleted incident: ${existingIncident.ticketNumber}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/incidents/[id]] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete incident" },
      { status: 500 }
    );
  }
}

