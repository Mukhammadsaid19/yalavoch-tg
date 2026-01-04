import { Router, Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticateUser } from "./users.js";

const router = Router();

/**
 * GET /dashboard/stats
 * Get dashboard statistics for current user
 */
router.get("/stats", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Get user's API clients
    const apiClients = await prisma.apiClient.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const clientIds = apiClients.map((c) => c.id);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRequests,
      todayRequests,
      thisMonthRequests,
      lastMonthRequests,
      verifiedRequests,
      expiredRequests,
      incorrectRequests,
    ] = await Promise.all([
      prisma.otpRequest.count({ where: { clientId: { in: clientIds } } }),
      prisma.otpRequest.count({ where: { clientId: { in: clientIds }, createdAt: { gte: today } } }),
      prisma.otpRequest.count({ where: { clientId: { in: clientIds }, createdAt: { gte: thisMonth } } }),
      prisma.otpRequest.count({
        where: {
          clientId: { in: clientIds },
          createdAt: { gte: lastMonth, lt: thisMonth },
        },
      }),
      prisma.otpRequest.count({ where: { clientId: { in: clientIds }, status: "verified" } }),
      prisma.otpRequest.count({ where: { clientId: { in: clientIds }, status: "expired" } }),
      prisma.otpRequest.count({ where: { clientId: { in: clientIds }, status: "incorrect" } }),
    ]);

    return res.json({
      success: true,
      stats: {
        total: totalRequests,
        today: todayRequests,
        thisMonth: thisMonthRequests,
        lastMonth: lastMonthRequests,
        verified: verifiedRequests,
        expired: expiredRequests,
        incorrect: incorrectRequests,
        verificationRate:
          totalRequests > 0 ? ((verifiedRequests / totalRequests) * 100).toFixed(1) + "%" : "0%",
      },
      balance: user.balance,
    });
  } catch (error) {
    console.error("Error in /dashboard/stats:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /dashboard/chart
 * Get chart data for OTP activity
 */
router.get("/chart", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const apiClients = await prisma.apiClient.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const clientIds = apiClients.map((c) => c.id);

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get daily counts for current month
    const thisMonthRequests = await prisma.otpRequest.findMany({
      where: {
        clientId: { in: clientIds },
        createdAt: { gte: thisMonth },
      },
      select: { createdAt: true },
    });

    // Get daily counts for last month
    const lastMonthRequests = await prisma.otpRequest.findMany({
      where: {
        clientId: { in: clientIds },
        createdAt: { gte: lastMonth, lt: thisMonth },
      },
      select: { createdAt: true },
    });

    // Group by day
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const thisMonthDaily: number[] = new Array(daysInMonth).fill(0);
    const lastMonthDaily: number[] = new Array(daysInMonth).fill(0);

    thisMonthRequests.forEach((r) => {
      const day = r.createdAt.getDate() - 1;
      if (day < daysInMonth) thisMonthDaily[day]++;
    });

    lastMonthRequests.forEach((r) => {
      const day = r.createdAt.getDate() - 1;
      if (day < daysInMonth) lastMonthDaily[day]++;
    });

    const labels = Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);

    return res.json({
      success: true,
      chart: {
        labels,
        thisMonth: thisMonthDaily,
        lastMonth: lastMonthDaily,
      },
    });
  } catch (error) {
    console.error("Error in /dashboard/chart:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /dashboard/sent-otps
 * Get list of sent OTPs with filters
 */
router.get("/sent-otps", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { phoneNumber, serviceName, status, startDate, endDate, page = "1", limit = "20" } = req.query;

    const apiClients = await prisma.apiClient.findMany({
      where: { userId: user.id },
      select: { id: true, name: true },
    });

    const clientIds = apiClients.map((c) => c.id);

    const where: any = { clientId: { in: clientIds } };

    if (phoneNumber) {
      where.phoneNumber = { contains: phoneNumber as string };
    }

    if (serviceName) {
      where.serviceName = { contains: serviceName as string };
    }

    if (status) {
      where.status = status as string;
    }

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const skip = (pageNum - 1) * limitNum;

    const [otps, total] = await Promise.all([
      prisma.otpRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
        select: {
          id: true,
          phoneNumber: true,
          serviceName: true,
          status: true,
          createdAt: true,
          verifiedAt: true,
          client: { select: { name: true } },
        },
      }),
      prisma.otpRequest.count({ where }),
    ]);

    return res.json({
      success: true,
      otps: otps.map((otp) => ({
        id: otp.id,
        phoneNumber: otp.phoneNumber,
        serviceName: otp.serviceName || otp.client.name,
        status: otp.status,
        date: otp.createdAt.toISOString().split("T")[0],
        time: otp.createdAt.toTimeString().split(" ")[0],
        verifiedAt: otp.verifiedAt?.toISOString(),
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error in /dashboard/sent-otps:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /dashboard/reports
 * Get monthly reports
 */
router.get("/reports", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const apiClients = await prisma.apiClient.findMany({
      where: { userId: user.id },
      select: { id: true },
    });

    const clientIds = apiClients.map((c) => c.id);

    // Get monthly stats for last 12 months
    const now = new Date();
    const reports = [];

    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [total, verified, expired] = await Promise.all([
        prisma.otpRequest.count({
          where: {
            clientId: { in: clientIds },
            createdAt: { gte: monthStart, lte: monthEnd },
          },
        }),
        prisma.otpRequest.count({
          where: {
            clientId: { in: clientIds },
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "verified",
          },
        }),
        prisma.otpRequest.count({
          where: {
            clientId: { in: clientIds },
            createdAt: { gte: monthStart, lte: monthEnd },
            status: "expired",
          },
        }),
      ]);

      reports.push({
        month: monthStart.toLocaleString("default", { month: "long", year: "numeric" }),
        monthKey: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
        total,
        verified,
        expired,
        verificationRate: total > 0 ? ((verified / total) * 100).toFixed(1) : "0",
      });
    }

    return res.json({
      success: true,
      reports,
    });
  } catch (error) {
    console.error("Error in /dashboard/reports:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /dashboard/topup
 * Simulate balance top-up (in real app, integrate with payment gateway)
 */
router.post("/topup", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { amount } = req.body;

    if (!amount || amount < 10000) {
      return res.status(400).json({
        success: false,
        error: "Minimum top-up amount is 10,000 UZS",
      });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        status: "pending",
        paymentMethod: "card",
      },
    });

    // In real app, redirect to payment gateway
    // For demo, simulate successful payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "completed", transactionId: `TXN_${Date.now()}` },
    });

    // Update user balance
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: amount } },
    });

    return res.json({
      success: true,
      newBalance: updatedUser.balance,
      message: "Balance topped up successfully",
    });
  } catch (error) {
    console.error("Error in /dashboard/topup:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /dashboard/api-clients
 * Get user's API clients
 */
router.get("/api-clients", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const clients = await prisma.apiClient.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        apiKey: true,
        webhookUrl: true,
        isActive: true,
        createdAt: true,
        _count: { select: { otpRequests: true } },
      },
    });

    return res.json({
      success: true,
      clients: clients.map((c) => ({
        ...c,
        totalRequests: c._count.otpRequests,
      })),
    });
  } catch (error) {
    console.error("Error in /dashboard/api-clients:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /dashboard/api-clients
 * Create a new API client
 */
router.post("/api-clients", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, webhookUrl } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: "Client name is required",
      });
    }

    const crypto = await import("crypto");
    const apiKey = `otp_${crypto.randomBytes(32).toString("hex")}`;

    const client = await prisma.apiClient.create({
      data: {
        name,
        apiKey,
        webhookUrl,
        userId: user.id,
      },
    });

    return res.status(201).json({
      success: true,
      client: {
        id: client.id,
        name: client.name,
        apiKey: client.apiKey,
        webhookUrl: client.webhookUrl,
        isActive: client.isActive,
        createdAt: client.createdAt,
      },
      message: "Save this API key securely - it won't be shown again!",
    });
  } catch (error) {
    console.error("Error creating API client:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;

