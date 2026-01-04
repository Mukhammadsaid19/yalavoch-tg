import "dotenv/config";
import { Bot, Keyboard, Context } from "grammy";
import prisma from "./lib/prisma.js";
import { normalizePhoneNumber, generateOtpCode, isExpired } from "./lib/utils.js";

// Validate bot token
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("TELEGRAM_BOT_TOKEN environment variable is required");
}

// Initialize bot
const bot = new Bot(BOT_TOKEN);

// Export bot for use in other modules (e.g., sending proactive OTP messages)
export { bot };

/**
 * /start command handler
 * Shows welcome message with contact sharing button
 */
bot.command("start", async (ctx: Context) => {
  // Create keyboard with contact request button
  const keyboard = new Keyboard()
    .requestContact("📱 Share My Phone Number")
    .resized()
    .oneTime();

  await ctx.reply(
    "👋 *Welcome to the OTP Verification Bot!*\n\n" +
      "A service has requested to verify your phone number.\n\n" +
      "Tap the button below to share your contact and receive your verification code.\n\n" +
      "🔒 Your phone number is only used for verification.",
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

/**
 * Contact message handler
 * Receives the verified phone number from Telegram and generates OTP
 */
bot.on("message:contact", async (ctx) => {
  const contact = ctx.message.contact;

  // Security check: Only accept contact if it belongs to the sender
  if (contact.user_id !== ctx.from?.id) {
    await ctx.reply(
      "⚠️ *Security Notice*\n\n" +
        "Please share your own contact, not someone else's.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  // Get and normalize the phone number
  let phoneNumber = contact.phone_number;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  if (!normalizedPhone) {
    await ctx.reply(
      "❌ *Error*\n\n" +
        "Could not process your phone number. Please try again.",
      { parse_mode: "Markdown" }
    );
    return;
  }

  console.log(`📱 Contact received: ${normalizedPhone}`);

  try {
    // Save or update the user's Telegram info for future proactive OTP delivery
    await prisma.telegramUser.upsert({
      where: { phoneNumber: normalizedPhone },
      update: {
        chatId: BigInt(ctx.chat.id),
        firstName: contact.first_name || null,
        lastName: contact.last_name || null,
        username: ctx.from?.username || null,
      },
      create: {
        chatId: BigInt(ctx.chat.id),
        phoneNumber: normalizedPhone,
        firstName: contact.first_name || null,
        lastName: contact.last_name || null,
        username: ctx.from?.username || null,
      },
    });
    console.log(`✅ Telegram user saved/updated for ${normalizedPhone}`);

    // Find the most recent unexpired OTP request for this phone number (from any client)
    const otpRequest = await prisma.otpRequest.findFirst({
      where: {
        phoneNumber: normalizedPhone,
        status: "pending",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
      include: {
        client: {
          select: { name: true },
        },
      },
    });

    if (!otpRequest) {
      await ctx.reply(
        "✅ *Phone Number Registered!*\n\n" +
          "Your phone number has been linked to this bot.\n\n" +
          "📲 *Next time*, you'll receive OTP codes automatically here — no need to share your contact again!\n\n" +
          "_No pending verification request found at this time._",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Check if expired (double-check)
    if (isExpired(otpRequest.expiresAt)) {
      await prisma.otpRequest.update({
        where: { id: otpRequest.id },
        data: { status: "expired" },
      });

      await ctx.reply(
        "⏰ *Request Expired*\n\n" +
          "Your verification request has expired.\n\n" +
          "Please go back and request a new verification code.",
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Generate OTP code
    const otpCode = generateOtpCode();

    // Update the OTP request with the generated code
    await prisma.otpRequest.update({
      where: { id: otpRequest.id },
      data: { 
        otpCode,
        status: "code_sent",
      },
    });

    // Calculate remaining time
    const remainingMs = otpRequest.expiresAt.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / 60000);

    // Use serviceName if available, otherwise fall back to client name
    const serviceName = otpRequest.serviceName || otpRequest.client.name;

    // Send OTP to user
    await ctx.reply(
      "✅ *Your Verification Code*\n\n" +
        `Service: *${serviceName}*\n\n` +
        `🔐 Code: \`${otpCode}\`\n\n` +
        `⏱ Expires in ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}\n\n` +
        "Enter this code in the app/website to complete verification.",
      { parse_mode: "Markdown" }
    );

    console.log(`✅ OTP sent for ${normalizedPhone} (Service: ${serviceName})`);
  } catch (error) {
    console.error("Error processing contact:", error);
    await ctx.reply(
      "❌ *Error*\n\n" +
        "Something went wrong while processing your request.\n\n" +
        "Please try again later.",
      { parse_mode: "Markdown" }
    );
  }
});

/**
 * Help command
 */
bot.command("help", async (ctx) => {
  await ctx.reply(
    "ℹ️ *How This Works*\n\n" +
      "1️⃣ A website or app requests to verify your phone\n" +
      "2️⃣ They send you here to get a code\n" +
      "3️⃣ Tap /start and share your contact\n" +
      "4️⃣ Enter the code you receive back in the app\n\n" +
      "🔒 This bot only verifies your phone number.\n" +
      "We don't store or share your information.",
    { parse_mode: "Markdown" }
  );
});

/**
 * Handle any other messages
 */
bot.on("message", async (ctx) => {
  await ctx.reply(
    "👋 To verify your phone number, tap /start and share your contact.",
    { parse_mode: "Markdown" }
  );
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start the bot
console.log("🤖 Starting Telegram OTP Bot...");
bot.start({
  onStart: (botInfo) => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║        🤖 Telegram OTP Bot Running                        ║
╠═══════════════════════════════════════════════════════════╣
║  Bot Username: @${botInfo.username.padEnd(40)}║
║  Status: Online and ready to send OTPs                    ║
╚═══════════════════════════════════════════════════════════╝
    `);
  },
});
