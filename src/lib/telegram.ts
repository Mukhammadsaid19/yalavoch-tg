/**
 * Telegram Bot API utility for sending messages from the server
 * Used for proactive OTP delivery to registered users
 */

import https from "https";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

interface SendMessageResult {
  success: boolean;
  error?: string;
}

/**
 * Send a message to a Telegram user via chat ID
 */
export async function sendTelegramMessage(
  chatId: bigint | string,
  text: string,
  parseMode: "Markdown" | "HTML" = "Markdown"
): Promise<SendMessageResult> {
  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not configured");
    return { success: false, error: "Bot token not configured" };
  }

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      chat_id: chatId.toString(),
      text,
      parse_mode: parseMode,
    });

    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.ok) {
            resolve({ success: true });
          } else {
            console.error("Telegram API error:", parsed.description);
            resolve({ success: false, error: parsed.description });
          }
        } catch {
          console.error("Failed to parse Telegram response");
          resolve({ success: false, error: "Failed to parse response" });
        }
      });
    });

    req.on("error", (error) => {
      console.error("Error sending Telegram message:", error);
      resolve({ success: false, error: "Failed to send message" });
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Send OTP code to a user via Telegram
 */
export async function sendOtpMessage(
  chatId: bigint | string,
  otpCode: string,
  clientName: string,
  expiresInMinutes: number
): Promise<SendMessageResult> {
  const message =
    "🔐 *New Verification Code*\n\n" +
    `Service: *${clientName}*\n\n` +
    `Your code: \`${otpCode}\`\n\n` +
    `⏱ Expires in ${expiresInMinutes} minute${expiresInMinutes !== 1 ? "s" : ""}\n\n` +
    "_Enter this code in the app/website to verify._";

  return sendTelegramMessage(chatId, message);
}

