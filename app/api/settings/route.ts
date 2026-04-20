import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/settings - Get application settings
export async function GET() {
  try {
    // Get or create default settings
    let settings = await prisma.settings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          id: "default",
          defaultHappyRobotLink: "https://v2.platform.happyrobot.ai/mutua/workflow",
          slaWarningMinutes: 15,
          slaCriticalMinutes: 30,
          controlTowerHours: 5,
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("[GET /api/settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH /api/settings - Update application settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      default_happyrobot_link,
      sla_warning_minutes,
      sla_critical_minutes,
      control_tower_hours,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (default_happyrobot_link !== undefined) {
      updateData.defaultHappyRobotLink = default_happyrobot_link;
    }

    if (sla_warning_minutes !== undefined) {
      updateData.slaWarningMinutes = parseInt(sla_warning_minutes);
    }

    if (sla_critical_minutes !== undefined) {
      updateData.slaCriticalMinutes = parseInt(sla_critical_minutes);
    }

    if (control_tower_hours !== undefined) {
      updateData.controlTowerHours = parseInt(control_tower_hours);
    }

    // Upsert settings
    const settings = await prisma.settings.upsert({
      where: { id: "default" },
      update: updateData,
      create: {
        id: "default",
        defaultHappyRobotLink: default_happyrobot_link || "https://v2.platform.happyrobot.ai/mutua/workflow",
        slaWarningMinutes: sla_warning_minutes ? parseInt(sla_warning_minutes) : 15,
        slaCriticalMinutes: sla_critical_minutes ? parseInt(sla_critical_minutes) : 30,
        controlTowerHours: control_tower_hours ? parseInt(control_tower_hours) : 5,
      },
    });

    console.log("[PATCH /api/settings] Settings updated");

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("[PATCH /api/settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

