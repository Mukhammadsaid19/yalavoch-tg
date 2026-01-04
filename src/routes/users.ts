import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { normalizePhoneNumber, getExpiryTime, generateOtpCode } from "../lib/utils.js";
import { sendOtpMessage } from "../lib/telegram.js";
import { getSystemClient } from "../lib/systemClient.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_change_me";
const JWT_EXPIRES_IN = "7d";
const BOT_USERNAME = process.env.BOT_USERNAME || "YourBotUsername";

interface JwtPayload {
  userId: string;
  phoneNumber: string;
}

/**
 * Middleware: Authenticate users via JWT
 */
export async function authenticateUser(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Missing or invalid authorization header",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Invalid or inactive user",
      });
    }

    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: "Invalid token",
    });
  }
}

/**
 * POST /users/register
 * Register a new user - Step 1
 */
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, projectName, firstName, lastName, password, accountType, acceptTerms } = req.body;

    // Validate required fields
    if (!phoneNumber || !projectName || !firstName || !lastName || !password || !accountType) {
      return res.status(400).json({
        success: false,
        error: "All fields are required",
      });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        success: false,
        error: "You must accept the terms of service",
      });
    }

    if (!["individual", "legal_entity"].includes(accountType)) {
      return res.status(400).json({
        success: false,
        error: "Account type must be 'individual' or 'legal_entity'",
      });
    }

    // Normalize phone number
    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format. Use international format (e.g., +998901234567)",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: "User with this phone number already exists",
      });
    }

    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (unverified)
    const user = await prisma.user.create({
      data: {
        phoneNumber: normalizedPhone,
        firstName,
        lastName,
        projectName,
        passwordHash,
        accountType,
        isVerified: false,
      },
    });

    // Get system client for OTP
    const systemClient = await getSystemClient();

    // Check if user has Telegram registered
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    // Generate OTP code
    const otpCode = telegramUser ? generateOtpCode() : null;
    const expiryTime = getExpiryTime(5); // 5 minutes

    // Clean up any existing pending OTP requests for this phone
    await prisma.otpRequest.deleteMany({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        status: { in: ["pending", "code_sent"] },
      },
    });

    // Create OTP request using the unified table
    const otpRequest = await prisma.otpRequest.create({
      data: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        otpCode,
        status: telegramUser ? "code_sent" : "pending",
        expiresAt: expiryTime,
        serviceName: "Yalavoch Registration",
      },
    });

    // If user has Telegram, send OTP proactively
    if (telegramUser && otpCode) {
      await sendOtpMessage(
        telegramUser.chatId,
        otpCode,
        "Yalavoch Registration",
        5
      );

      return res.status(201).json({
        success: true,
        userId: user.id,
        requestId: otpRequest.id,
        phoneNumber: normalizedPhone,
        accountType,
        otpSent: true,
        message: "OTP code sent to your Telegram. Enter it to complete registration.",
      });
    }

    return res.status(201).json({
      success: true,
      userId: user.id,
      requestId: otpRequest.id,
      phoneNumber: normalizedPhone,
      accountType,
      otpSent: false,
      botLink: `https://t.me/${BOT_USERNAME}`,
      message: "Please open our Telegram bot to receive verification code.",
    });
  } catch (error) {
    console.error("Error in /users/register:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/resend-otp
 * Resend OTP for registration or password reset
 */
router.post("/resend-otp", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, type } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    if (!type || !["registration", "password_reset"].includes(type)) {
      return res.status(400).json({
        success: false,
        error: "Type must be 'registration' or 'password_reset'",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    // Get system client
    const systemClient = await getSystemClient();

    // Rate limit: check if last OTP was sent less than 60 seconds ago
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentOtp = await prisma.otpRequest.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        createdAt: { gte: oneMinuteAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentOtp) {
      const waitSeconds = Math.ceil((recentOtp.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        error: `Please wait ${waitSeconds} seconds before requesting a new code`,
        waitSeconds,
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    if (type === "registration" && (!user || user.isVerified)) {
      return res.status(400).json({
        success: false,
        error: "Invalid request",
      });
    }

    if (type === "password_reset" && !user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        otpSent: false,
        message: "If an account exists, an OTP will be sent.",
      });
    }

    // Check if user has Telegram
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    // Generate new OTP
    const otpCode = telegramUser ? generateOtpCode() : null;
    const expiryTime = getExpiryTime(5);

    // Expire old pending OTPs
    await prisma.otpRequest.updateMany({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        status: { in: ["pending", "code_sent"] },
      },
      data: { status: "expired" },
    });

    // Create new OTP request
    const serviceName = type === "registration" ? "Yalavoch Registration" : "Yalavoch Password Reset";
    await prisma.otpRequest.create({
      data: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        otpCode,
        status: telegramUser ? "code_sent" : "pending",
        expiresAt: expiryTime,
        serviceName,
      },
    });

    // Send OTP if user has Telegram
    if (telegramUser && otpCode) {
      await sendOtpMessage(telegramUser.chatId, otpCode, serviceName, 5);
    }

    return res.json({
      success: true,
      otpSent: !!telegramUser,
      botLink: `https://t.me/${BOT_USERNAME}`,
      message: telegramUser
        ? "New OTP code sent to your Telegram"
        : "Open Telegram bot to receive OTP",
    });
  } catch (error) {
    console.error("Error in /users/resend-otp:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/verify-registration
 * Verify registration OTP
 */
router.post("/verify-registration", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        error: "Phone number and code are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    // Get system client
    const systemClient = await getSystemClient();

    // Find the OTP request
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        otpCode: code,
        status: "code_sent",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRequest) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    // Check expiry
    if (new Date() > otpRequest.expiresAt) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "expired" },
      });
      return res.status(400).json({
        success: false,
        error: "OTP code has expired",
      });
    }

    // Mark OTP as verified
    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { status: "verified", verifiedAt: new Date() },
    });

    // Verify user
    const user = await prisma.user.update({
      where: { phoneNumber: normalizedPhone },
      data: { isVerified: true },
    });

    // Create initial API client for user
    const apiKey = `otp_${crypto.randomBytes(32).toString("hex")}`;
    await prisma.apiClient.create({
      data: {
        name: user.projectName,
        apiKey,
        userId: user.id,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, phoneNumber: normalizedPhone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        projectName: user.projectName,
        accountType: user.accountType,
        isVerified: true,
      },
      requiresCompanyDetails: user.accountType === "legal_entity",
      message: "Registration completed successfully",
    });
  } catch (error) {
    console.error("Error in /users/verify-registration:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/complete-company-details
 * Complete company details for legal entities
 */
router.post("/complete-company-details", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { companyName, taxId, directorName } = req.body;

    if (!companyName || !taxId || !directorName) {
      return res.status(400).json({
        success: false,
        error: "All company details are required",
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        companyName,
        taxId,
        directorName,
      },
    });

    return res.json({
      success: true,
      message: "Company details saved. A contract will be sent via Didox.",
    });
  } catch (error) {
    console.error("Error in /users/complete-company-details:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/login
 * Login with phone and password
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, password } = req.body;

    if (!phoneNumber || !password) {
      return res.status(400).json({
        success: false,
        error: "Phone number and password are required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account is deactivated",
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, phoneNumber: normalizedPhone },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        projectName: user.projectName,
        accountType: user.accountType,
        balance: user.balance,
        isVerified: user.isVerified,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    console.error("Error in /users/login:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/forgot-password
 * Request password reset OTP
 */
router.post("/forgot-password", async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: "If an account exists, an OTP will be sent to Telegram.",
      });
    }

    // Get system client
    const systemClient = await getSystemClient();

    // Check if user has Telegram
    const telegramUser = await prisma.telegramUser.findUnique({
      where: { phoneNumber: normalizedPhone },
    });

    // Generate OTP
    const otpCode = telegramUser ? generateOtpCode() : null;
    const expiryTime = getExpiryTime(5);

    // Clean up existing pending requests
    await prisma.otpRequest.deleteMany({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        status: { in: ["pending", "code_sent"] },
      },
    });

    // Create OTP request
    await prisma.otpRequest.create({
      data: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        otpCode,
        status: telegramUser ? "code_sent" : "pending",
        expiresAt: expiryTime,
        serviceName: "Yalavoch Password Reset",
      },
    });

    if (telegramUser && otpCode) {
      await sendOtpMessage(
        telegramUser.chatId,
        otpCode,
        "Yalavoch Password Reset",
        5
      );
    }

    return res.json({
      success: true,
      otpSent: !!telegramUser,
      botLink: `https://t.me/${BOT_USERNAME}`,
      message: telegramUser 
        ? "OTP sent to your Telegram" 
        : "Open Telegram bot to receive OTP",
    });
  } catch (error) {
    console.error("Error in /users/forgot-password:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/reset-password
 * Reset password with OTP
 */
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code, newPassword } = req.body;

    if (!phoneNumber || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Phone number, code, and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone number format",
      });
    }

    // Get system client
    const systemClient = await getSystemClient();

    // Find OTP request
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        clientId: systemClient.id,
        otpCode: code,
        status: "code_sent",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRequest) {
      return res.status(400).json({
        success: false,
        error: "Invalid OTP code",
      });
    }

    // Check expiry
    if (new Date() > otpRequest.expiresAt) {
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
      data: { status: "verified", verifiedAt: new Date() },
    });

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { phoneNumber: normalizedPhone },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error in /users/reset-password:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * GET /users/me
 * Get current user profile
 */
router.get("/me", authenticateUser, async (req: Request, res: Response) => {
  const user = (req as any).user;

  const apiClients = await prisma.apiClient.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      apiKey: true,
      isActive: true,
      createdAt: true,
    },
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      projectName: user.projectName,
      accountType: user.accountType,
      balance: user.balance,
      isVerified: user.isVerified,
      companyName: user.companyName,
      taxId: user.taxId,
      directorName: user.directorName,
      createdAt: user.createdAt,
    },
    apiClients,
  });
});

/**
 * PATCH /users/me
 * Update current user profile
 */
router.patch("/me", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { firstName, lastName, projectName, companyName, taxId, directorName } = req.body;

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (projectName) updateData.projectName = projectName;
    if (user.accountType === "legal_entity") {
      if (companyName) updateData.companyName = companyName;
      if (taxId) updateData.taxId = taxId;
      if (directorName) updateData.directorName = directorName;
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        phoneNumber: updatedUser.phoneNumber,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        projectName: updatedUser.projectName,
        accountType: updatedUser.accountType,
        balance: updatedUser.balance,
        companyName: updatedUser.companyName,
        taxId: updatedUser.taxId,
        directorName: updatedUser.directorName,
      },
    });
  } catch (error) {
    console.error("Error in PATCH /users/me:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

/**
 * POST /users/change-password
 * Change password (requires current password)
 */
router.post("/change-password", authenticateUser, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Current and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: "Password must be at least 8 characters long",
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: "Current password is incorrect",
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in /users/change-password:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;
