/**
 * System API Client for Yalavoch's own website
 * This allows Yalavoch to use its own OTP service for registration/password reset
 */

import crypto from "crypto";
import prisma from "./prisma.js";

let systemClientId: string | null = null;

/**
 * Gets or creates the Yalavoch system API client
 * Used for internal OTP requests (registration, password reset)
 */
export async function getSystemClient(): Promise<{ id: string; name: string }> {
  // Return cached client if available
  if (systemClientId) {
    const cached = await prisma.apiClient.findUnique({
      where: { id: systemClientId },
      select: { id: true, name: true },
    });
    if (cached) return cached;
  }

  // Look for existing system client by name
  const existingClient = await prisma.apiClient.findFirst({
    where: { name: "Yalavoch Platform" },
    select: { id: true, name: true },
  });

  if (existingClient) {
    systemClientId = existingClient.id;
    return existingClient;
  }

  // Create system user if needed
  let systemUser = await prisma.user.findFirst({
    where: { phoneNumber: "+0000000000" },
  });

  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        phoneNumber: "+0000000000",
        passwordHash: crypto.randomBytes(32).toString("hex"),
        firstName: "System",
        lastName: "Account",
        projectName: "Yalavoch Platform",
        accountType: "individual",
        isVerified: true,
        isActive: true,
      },
    });
    console.log("✅ Created Yalavoch system user");
  }

  // Create system API client
  const apiKey = `otp_system_${crypto.randomBytes(32).toString("hex")}`;
  const client = await prisma.apiClient.create({
    data: {
      name: "Yalavoch Platform",
      apiKey,
      userId: systemUser.id,
      isActive: true,
    },
    select: { id: true, name: true },
  });

  systemClientId = client.id;
  console.log("✅ Created Yalavoch system API client");

  return client;
}

