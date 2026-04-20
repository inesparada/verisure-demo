import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { broadcastEvent } from "@/lib/pusher-server";

type RouteParams = {
    params: Promise<{ id: string }>;
};

// PATCH /api/incidents/[id]/end-call - Mark the call as finished
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        // Validate API key only if one is provided (external API calls)
        // Dashboard calls don't need to send a key
        const apiKey = request.headers.get("x-api-key");
        const expectedKey = process.env.WEBHOOK_API_KEY;
        
        if (apiKey && expectedKey && apiKey !== expectedKey) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { id } = await params;

        // Check if incident exists
        const existingIncident = await prisma.incident.findUnique({
            where: { id },
            select: { id: true, ticketNumber: true },
        });

        if (!existingIncident) {
            return NextResponse.json(
                { success: false, error: "Incident not found" },
                { status: 404 }
            );
        }

        // Create the "Llamada Finalizada" log entry
        const log = await prisma.incidentLog.create({
            data: {
                incidentId: id,
                message: "Llamada finalizada",
                source: "AGENT",
                status: "SUCCESS",
            },
        });

        // Broadcast the log creation
        await broadcastEvent("incident-log:created", {
            incidentId: id,
            log,
        });

        console.log(`[PATCH /api/incidents/[id]/end-call] Call ended for incident: ${existingIncident.ticketNumber}`);

        return NextResponse.json({
            success: true,
            log,
        });
    } catch (error) {
        console.error("Error ending call:", error);
        return NextResponse.json(
            { success: false, error: "Failed to end call" },
            { status: 500 }
        );
    }
}


