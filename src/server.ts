import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import otpRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/users.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - required when running behind reverse proxy (nginx, Cloudflare, etc.)
// This ensures express-rate-limit correctly identifies users by their real IP
app.set('trust proxy', 1);

// CORS - allow any origin for API service
app.use(cors());

// Body parsing
app.use(express.json());

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: "Too many requests, please try again later." },
});
app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    success: true,
    service: "Yalavoch - Telegram OTP Service",
    timestamp: new Date().toISOString(),
  });
});

// API Documentation endpoint
app.get("/", (req, res) => {
  res.json({
    service: "Yalavoch - Telegram OTP Verification Service",
    version: "1.0.0",
    endpoints: {
      otp: {
        "POST /otp/send": "Request OTP for a phone number",
        "POST /otp/verify": "Verify OTP code",
        "GET /otp/status/:requestId": "Check OTP request status",
      },
      user: {
        "POST /users/register": "Register a new user account",
        "POST /users/verify-registration": "Verify registration with OTP",
        "POST /users/login": "Login with phone and password",
        "POST /users/forgot-password": "Request password reset OTP",
        "POST /users/reset-password": "Reset password with OTP",
        "GET /users/me": "Get current user profile",
        "PATCH /users/me": "Update current user profile",
      },
      dashboard: {
        "GET /dashboard/stats": "Get dashboard statistics",
        "GET /dashboard/chart": "Get chart data for OTP activity",
        "GET /dashboard/sent-otps": "Get list of sent OTPs",
        "GET /dashboard/reports": "Get monthly reports",
        "POST /dashboard/topup": "Top up balance",
        "GET /dashboard/api-clients": "Get user's API clients",
      },
    },
    authentication: {
      otp: "Include 'X-API-Key' header with your API key",
      user: "Include 'Authorization: Bearer <token>' header with JWT token",
    },
    documentation: "Visit /docs for full API documentation",
  });
});

// OTP routes (for third-party integrations)
app.use("/otp", otpRoutes);

// Admin routes (for managing API clients)
app.use("/admin", adminRoutes);

// User routes (registration, login, profile)
app.use("/users", userRoutes);

// Dashboard routes (stats, reports, etc.)
app.use("/dashboard", dashboardRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Endpoint not found" });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║        🔐 Yalavoch - Telegram OTP Service                 ║
╠═══════════════════════════════════════════════════════════╣
║  API Server:  http://localhost:${PORT}                       ║
║                                                           ║
║  OTP Endpoints:                                           ║
║    POST /otp/send     - Request OTP                       ║
║    POST /otp/verify   - Verify OTP                        ║
║    GET  /otp/status   - Check status                      ║
║                                                           ║
║  User Endpoints:                                          ║
║    POST /users/register       - Register                  ║
║    POST /users/login          - Login                     ║
║    POST /users/forgot-password - Reset password           ║
║                                                           ║
║  Dashboard Endpoints:                                     ║
║    GET  /dashboard/stats      - Statistics                ║
║    GET  /dashboard/sent-otps  - Sent OTPs list            ║
║    GET  /dashboard/reports    - Monthly reports           ║
║                                                           ║
║  Admin:                                                   ║
║    POST /admin/clients - Create API client                ║
║    GET  /admin/clients - List clients                     ║
║    GET  /admin/stats   - Service statistics               ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
