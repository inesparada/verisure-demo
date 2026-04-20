import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";
import { geocodeAddress } from "@/lib/geocode";
import { IncidentPhase } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/incidents/[id]/confirm
 * 
 * Confirm incident details after the agent has gathered all information.
 * This endpoint:
 * 1. Uses provided coordinates OR geocodes the address to get lat/lng
 * 2. Updates the incident with all confirmed details
 * 3. Sets phase to CONFIRMED
 * 4. Auto-generates 3 log entries
 * 5. Broadcasts updates via Pusher (incident will now appear on map)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate X-API-KEY header (optional)
    const apiKey = request.headers.get("X-API-KEY");
    const expectedKey = process.env.WEBHOOK_API_KEY;

    if (expectedKey && apiKey !== expectedKey) {
      console.warn("[PATCH /api/incidents/[id]/confirm] Invalid or missing API key");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const {
      description,
      address,
      coordinates,  // Optional: { latitude, longitude } - if provided, skip geocoding
      vehicle_plate,
      vehicle_model,
      vehicle_brand,
      severity = "MEDIUM",
      comments,
    } = body;

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: "address is required" },
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

    // Determine coordinates: use provided coordinates or geocode the address
    let finalLatitude: number | null = null;
    let finalLongitude: number | null = null;
    let coordinateSource: "provided" | "geocoded" | "none" = "none";

    // Accept coordinates in multiple formats: {lat, lng} or {latitude, longitude}
    // Also handle both number and string types (parse strings to numbers)
    const rawLat = coordinates?.latitude ?? coordinates?.lat;
    const rawLng = coordinates?.longitude ?? coordinates?.lng;
    
    // Parse coordinates - handle both number and string types
    const providedLat = rawLat !== undefined && rawLat !== null ? parseFloat(String(rawLat)) : NaN;
    const providedLng = rawLng !== undefined && rawLng !== null ? parseFloat(String(rawLng)) : NaN;

    if (!isNaN(providedLat) && !isNaN(providedLng)) {
      // Use provided coordinates directly (skip geocoding)
      finalLatitude = providedLat;
      finalLongitude = providedLng;
      coordinateSource = "provided";
      console.log(`[PATCH /api/incidents/[id]/confirm] Using provided coordinates: ${finalLatitude}, ${finalLongitude}`);
    } else {
      // Geocode the address to get coordinates
      console.log(`[PATCH /api/incidents/[id]/confirm] Geocoding address: ${address}`);
      const geocodeResult = await geocodeAddress(address);

      if (geocodeResult) {
        finalLatitude = geocodeResult.latitude;
        finalLongitude = geocodeResult.longitude;
        coordinateSource = "geocoded";
      } else {
        console.warn(`[PATCH /api/incidents/[id]/confirm] Geocoding failed for address: ${address}`);
        // Continue without coordinates - we'll still update the incident
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      phase: IncidentPhase.CONFIRMED,
      description,
      address,  // Always use the original address text for display
      comments,
      severity: severity.toUpperCase(),
    };

    // Add coordinates if we have them (from either source)
    if (finalLatitude !== null && finalLongitude !== null) {
      updateData.latitude = finalLatitude;
      updateData.longitude = finalLongitude;
    }

    // Add vehicle info if provided
    if (vehicle_plate) updateData.vehiclePlate = vehicle_plate;
    if (vehicle_model) updateData.vehicleModel = vehicle_model;
    if (vehicle_brand) updateData.vehicleBrand = vehicle_brand;

    // Update the incident first
    await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    // Create auto-generated logs for all confirmed data
    const logs = [];

    // Log 1: Incident description confirmed (if provided)
    if (description) {
      const logDesc = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          message: `Incidente confirmado: ${description}`,
          source: "AGENT",
          status: "SUCCESS",
        },
      });
      logs.push(logDesc);
    } else {
      const logConfirm = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          message: "Incidente confirmado",
          source: "AGENT",
          status: "SUCCESS",
        },
      });
      logs.push(logConfirm);
    }

    // Log 2: Location confirmed (with coordinates in metadata)
    const logLocation = await prisma.incidentLog.create({
      data: {
        incidentId: id,
        message: `Localización confirmada: ${address}`,
        source: "AGENT",
        status: "SUCCESS",
        metadata: (finalLatitude !== null && finalLongitude !== null) ? {
          lat: finalLatitude,
          lng: finalLongitude,
          source: coordinateSource,
        } : undefined,
      },
    });
    logs.push(logLocation);

    // Log 3: Vehicle model confirmed (if provided)
    if (vehicle_brand || vehicle_model) {
      const vehicleInfo = [vehicle_brand, vehicle_model].filter(Boolean).join(" ");
      const logModel = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          message: `Vehículo confirmado: ${vehicleInfo}`,
          source: "AGENT",
          status: "INFO",
        },
      });
      logs.push(logModel);
    }

    // Log 4: License plate confirmed (if provided)
    if (vehicle_plate) {
      const logPlate = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          message: `Matrícula confirmada: ${vehicle_plate}`,
          source: "AGENT",
          status: "INFO",
        },
      });
      logs.push(logPlate);
    }

    // Log 5: Severity level
    const logSeverity = await prisma.incidentLog.create({
      data: {
        incidentId: id,
        message: `Severidad: ${severity.toUpperCase()}`,
        source: "SYSTEM",
        status: severity.toUpperCase() === "CRITICAL" || severity.toUpperCase() === "HIGH" ? "WARNING" : "INFO",
      },
    });
    logs.push(logSeverity);

    // Log 6: Comments/safety notes (if provided)
    if (comments) {
      const logComments = await prisma.incidentLog.create({
        data: {
          incidentId: id,
          message: `Notas: ${comments}`,
          source: "AGENT",
          status: "INFO",
        },
      });
      logs.push(logComments);
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

    // Broadcast the incident update (this will make it appear on the map)
    await broadcastEvent("incident:updated", { incident: updatedIncident });

    // Broadcast each log creation
    for (const log of logs) {
      await broadcastEvent("incident-log:created", {
        incidentId: id,
        log,
      });
    }

    console.log(`[PATCH /api/incidents/[id]/confirm] Confirmed incident: ${updatedIncident?.ticketNumber} at ${address} (coordinates: ${coordinateSource})`);

    return NextResponse.json({
      success: true,
      incident: updatedIncident,
      coordinate_source: coordinateSource,  // "provided", "geocoded", or "none"
      coordinates: (finalLatitude !== null && finalLongitude !== null) ? {
        latitude: finalLatitude,
        longitude: finalLongitude,
      } : null,
      logs_created: logs.length,
    });
  } catch (error) {
    console.error("[PATCH /api/incidents/[id]/confirm] Error:", error);
    return NextResponse.json(
      { error: "Failed to confirm incident" },
      { status: 500 }
    );
  }
}

