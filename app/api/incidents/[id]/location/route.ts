import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/incidents/[id]/location - Update incident location
// This is called by the AI agent when the customer provides their location
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate X-API-KEY header (optional)
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[PATCH /api/incidents/[id]/location] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { latitude, longitude, address } = body;

    // Validate required fields
    if (latitude === undefined || longitude === undefined) {
      return NextResponse.json(
        { error: "latitude and longitude are required" },
        { status: 400 }
      );
    }

    // Verify incident exists
    const existingIncident = await prisma.incident.findUnique({
      where: { id },
      select: { id: true, ticketNumber: true },
    });

    if (!existingIncident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      );
    }

    // Update the incident location
    const updatedIncident = await prisma.incident.update({
      where: { id },
      data: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || null,
      },
    });

    // Create a log entry for the location update
    const log = await prisma.incidentLog.create({
      data: {
        incidentId: id,
        message: address 
          ? `Ubicación confirmada: ${address}`
          : `Ubicación actualizada: ${latitude}, ${longitude}`,
        source: "AGENT",
        status: "INFO",
        metadata: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) },
      },
    });

    // Broadcast the location update
    await broadcastEvent("incident:location-updated", {
      incidentId: id,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      address,
    });

    // Also broadcast the log
    await broadcastEvent("incident-log:created", {
      incidentId: id,
      log,
    });

    console.log(`[PATCH /api/incidents/[id]/location] Location updated for ${existingIncident.ticketNumber}`);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
    });
  } catch (error) {
    console.error("[PATCH /api/incidents/[id]/location] Error:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}



