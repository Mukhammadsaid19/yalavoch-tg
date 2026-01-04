import { Router, Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { normalizePhoneNumber, getExpiryTime, isExpired, generateOtpCode } from "../lib/utils.js";
import { sendOtpMessage } from "../lib/telegram.js";

const router = Router();

const BOT_USERNAME = process.env.BOT_USERNAME || "YourBotUsername";

/**
 * Middleware: Authenticate API clients via API key
 */
async function authenticateClient(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: "Missing API key. Include 'X-API-Key' header.",
    });
  }

  const client = await prisma.apiClient.findUnique({
    where: { apiKey },
  });

  if (!client || !client.isActive) {
    return res.status(401).json({
      success: false,
      error: "Invalid or inactive API key.",
    });
  }

  // Attach client to request for later use
  (req as any).client = client;
  next();
}

/**
 * POST /otp/send
 * Third-party calls this to request OTP for a phone number
 */
router.post("/send", authenticateClient, async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    const client = (req as any).client;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    // Normalize phone number to E.164 format
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Use E.164 format (e.g., +15550001234)",
      });
    }

    // Rate limiting: Max 100 OTP requests per phone per hour per client
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = await prisma.otpRequest.count({
      where: {
        phoneNumber: normalizedPhone,
        clientId: client.id,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentRequests >= 100) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Max 100 requests per phone per hour.",
      });
    }

    // Clean up any existing pending requests for this phone from this client
    await prisma.otpRequest.deleteMany({
      where: {
        phoneNumber: normalizedPhone,
        clientId: client.id,
        status: { in: ["pending", "code_sent"] },
      },
    });

    // Check if user is already registered with the Telegram bot
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    // Generate OTP code if user is registered (we'll send it proactively)
    const otpCode = telegramUser ? generateOtpCode() : null;
    const expiryTime = getExpiryTime(5); // 5 minutes

    // Create new OTP request
    const otpRequest = await prisma.otpRequest.create({
      data: {
        phoneNumber: normalizedPhone,
        clientId: client.id,
        expiresAt: expiryTime,
        status: telegramUser ? "code_sent" : "pending",
        otpCode: otpCode,
      },
    });

    // If user is registered, send OTP proactively via Telegram
    if (telegramUser && otpCode) {
      const remainingMinutes = Math.ceil((expiryTime.getTime() - Date.now()) / 60000);
      const sendResult = await sendOtpMessage(
        telegramUser.chatId,
        otpCode,
        client.name,
        remainingMinutes
      );

      if (sendResult.success) {
        console.log(`📤 OTP sent proactively to ${normalizedPhone}`);
        return res.json({
          success: true,
          requestId: otpRequest.id,
          phoneNumber: normalizedPhone,
          expiresAt: otpRequest.expiresAt.toISOString(),
          otpSent: true,
          message: "OTP code sent directly to user's Telegram. No bot visit needed.",
        });
      } else {
        // Failed to send - revert to pending status
        await prisma.otpRequest.update({
          where: { id: otpRequest.id },
          data: { status: "pending", otpCode: null },
        });
        console.log(`⚠️ Failed to send OTP proactively, falling back to manual flow`);
      }
    }

    return res.json({
      success: true,
      requestId: otpRequest.id,
      phoneNumber: normalizedPhone,
      expiresAt: otpRequest.expiresAt.toISOString(),
      botLink: `https://t.me/${BOT_USERNAME}`,
      otpSent: false,
      message: "Direct user to open the Telegram bot and share their contact.",
    });
  } catch (error) {
    console.error("Error in /otp/send:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /otp/verify
 * Third-party calls this to verify the OTP code
 */
router.post("/verify", authenticateClient, async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, requestId } = req.body;
    const client = (req as any).client;

    if (!code || (!phoneNumber && !requestId)) {
      return res.status(400).json({
        success: false,
        error: "Code and either phoneNumber or requestId are required",
      });
    }

    // Normalize phone number if provided
    let normalizedPhone: string | null = null;
    if (phoneNumber) {
      normalizedPhone = normalizePhoneNumber(phoneNumber);
      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          error: "Invalid phone number format",
        });
      }
    }

    // Find matching OTP request
    const whereClause: any = {
      clientId: client.id,
      otpCode: code,
      status: "code_sent",
    };

    if (requestId) {
      whereClause.id = requestId;
    } else if (normalizedPhone) {
      whereClause.phoneNumber = normalizedPhone;
    }

    const otpRequest = await prisma.otpRequest.findFirst({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    if (!otpRequest) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    // Check expiry
    if (isExpired(otpRequest.expiresAt)) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "expired" },
      });
      return res.status(400).json({
        success: false,
        error: "OTP code has expired",
      });
    }

    // Mark as verified
    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: {
        status: "verified",
        verifiedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      phoneNumber: otpRequest.phoneNumber,
      verifiedAt: new Date().toISOString(),
      message: "Phone number verified successfully",
    });
  } catch (error) {
    console.error("Error in /otp/verify:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /otp/status/:requestId
 * Check the status of an OTP request
 */
router.get("/status/:requestId", authenticateClient, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const client = (req as any).client;

    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        id: requestId,
        clientId: client.id,
      },
    });

    if (!otpRequest) {
      return res.status(404).json({
        success: false,
        error: "Request not found",
      });
    }

    // Check if expired
    if (otpRequest.status !== "verified" && otpRequest.status !== "expired" && isExpired(otpRequest.expiresAt)) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "expired" },
      });
      otpRequest.status = "expired";
    }

    return res.json({
      success: true,
      requestId: otpRequest.id,
      phoneNumber: otpRequest.phoneNumber,
      status: otpRequest.status,
      expiresAt: otpRequest.expiresAt.toISOString(),
      verifiedAt: otpRequest.verifiedAt?.toISOString() || null,
    });
  } catch (error) {
    console.error("Error in /otp/status:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
