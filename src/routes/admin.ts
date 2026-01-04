import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";

const router = Router();

// Simple admin auth (in production, use proper authentication)
const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin_secret_change_me";

function authenticateAdmin(req: Request, res: Response, next: Function) {
  const adminKey = req.headers["x-admin-key"] as string;

  if (adminKey !== ADMIN_SECRET) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  next();
}

/**
 * POST /admin/clients
 * Create a new API client (third-party app)
 */
router.post("/clients", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { name, webhookUrl, userId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Client name is required",
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Generate a secure API key
    const apiKey = `otp_${crypto.randomBytes(32).toString("hex")}`;

    const client = await prisma.apiClient.create({
      data: {
        name,
        apiKey,
        webhookUrl,
        userId,
      },
    });

    return res.status(201).json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        apiKey: client.apiKey, // Only shown once!
        webhookUrl: client.webhookUrl,
        createdAt: client.createdAt,
      },
      message: "Save this API key securely - it won't be shown again!",
    });
  } catch (error) {
    console.error("Error creating client:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /admin/clients
 * List all API clients
 */
router.get("/clients", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const clients = await prisma.apiClient.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        createdAt: true,
        webhookUrl: true,
        _count: {
          select: { otpRequests: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      clients: clients.map((c) => ({
        ...c,
        totalRequests: c._count.otpRequests,
      })),
    });
  } catch (error) {
    console.error("Error listing clients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * PATCH /admin/clients/:id
 * Update a client (activate/deactivate)
 */
router.patch("/clients/:id", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive, name, webhookUrl } = req.body;

    const client = await prisma.apiClient.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" && { isActive }),
        ...(name && { name }),
        ...(webhookUrl !== undefined && { webhookUrl }),
      },
    });

    return res.json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        isActive: client.isActive,
        webhookUrl: client.webhookUrl,
      },
    });
  } catch (error) {
    console.error("Error updating client:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /admin/stats
 * Get service statistics
 */
router.get("/stats", authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalClients, activeClients, totalRequests, todayRequests, monthRequests, verifiedRequests] =
      await Promise.all([
        prisma.apiClient.count(),
        prisma.apiClient.count({ where: { isActive: true } }),
        prisma.otpRequest.count(),
        prisma.otpRequest.count({ where: { createdAt: { gte: today } } }),
        prisma.otpRequest.count({ where: { createdAt: { gte: thisMonth } } }),
        prisma.otpRequest.count({ where: { status: "verified" } }),
      ]);

    return res.json({
      success: true,
      stats: {
        clients: {
          total: totalClients,
          active: activeClients,
        },
        requests: {
          total: totalRequests,
          today: todayRequests,
          thisMonth: monthRequests,
          verified: verifiedRequests,
          verificationRate: totalRequests > 0 ? ((verifiedRequests / totalRequests) * 100).toFixed(1) + "%" : "0%",
        },
      },
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;

