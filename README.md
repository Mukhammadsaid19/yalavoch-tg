# Yalavoch - Telegram OTP Service

A secure, cost-effective phone verification service using Telegram. Businesses can integrate this API to verify their users' phone numbers via Telegram instead of expensive SMS.

## 🎯 Features

- **Landing Page** - Beautiful marketing page with Sign Up / Log In
- **User Registration** - Phone-based registration with OTP verification
- **Dashboard** - Analytics, sent OTPs, reports, and profile management
- **API Documentation** - Interactive docs with code examples
- **Individual & Business Accounts** - Support for both account types
- **Balance & Payments** - Top-up system for API usage

## 🔄 Verification Flow

```
┌─────────────────────┐
│  Third-Party App    │  (Your customer's website/app)
│  (Their Backend)    │
└──────────┬──────────┘
           │ API calls with API Key
           ▼
┌─────────────────────┐         ┌─────────────────────┐
│   YALAVOCH API      │◀───────▶│   TELEGRAM BOT      │
│   (Express Server)  │         │   (Sends OTP codes) │
└──────────┬──────────┘         └─────────────────────┘
           │
           ▼
┌─────────────────────┐
│    PostgreSQL       │
└─────────────────────┘
```

1. **Third-party app** calls `POST /otp/send` with user's phone number
2. **Your API** creates a pending verification request
3. **Third-party app** directs user to your Telegram bot
4. **User** opens bot, taps Start, shares contact
5. **Bot** sends 6-digit OTP code to user
6. **User** enters code in third-party app
7. **Third-party app** calls `POST /otp/verify` to confirm
8. ✅ Phone verified!

## 🚀 Quick Start

### Prerequisites

- Node.js 16+
- PostgreSQL database
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

### 1. Install Dependencies

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your values:
# - DATABASE_URL
# - TELEGRAM_BOT_TOKEN
# - BOT_USERNAME
# - ADMIN_SECRET
# - JWT_SECRET
```

### 3. Setup Database

```bash
npm run db:generate
npm run db:push
```

### 4. Run All Services

```bash
# Terminal 1: API Server
npm run dev

# Terminal 2: Telegram Bot
npm run dev:bot

# Terminal 3: Frontend
cd frontend && npm run dev
```

Visit http://localhost:5173 to see the landing page.

---

## 📡 API Reference

### Authentication

All `/otp/*` endpoints require the `X-API-Key` header:

```
X-API-Key: otp_xxxxxxxxxxxxxxxx
```

User endpoints require JWT Bearer token:

```
Authorization: Bearer <jwt_token>
```

---

### POST /otp/send

Request OTP verification for a phone number.

**Request:**
```json
{
  "phoneNumber": "+998901234567"
}
```

**Response:**
```json
{
  "success": true,
  "requestId": "uuid-here",
  "phoneNumber": "+998901234567",
  "expiresAt": "2025-01-02T12:05:00.000Z",
  "botLink": "https://t.me/YalavochBot",
  "otpSent": false,
  "message": "Direct user to open the Telegram bot and share their contact."
}
```

---

### POST /otp/verify

Verify the OTP code entered by user.

**Request:**
```json
{
  "requestId": "uuid-here",
  "code": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "phoneNumber": "+998901234567",
  "verifiedAt": "2025-01-02T12:03:00.000Z",
  "message": "Phone number verified successfully"
}
```

---

### GET /otp/status/:requestId

Check the status of an OTP request.

**Status values:**
- `pending` - Waiting for user to open Telegram bot
- `code_sent` - OTP sent, waiting for verification
- `verified` - Successfully verified
- `expired` - Request expired

---

## 👤 User Endpoints

### POST /users/register

Register a new user account.

**Request:**
```json
{
  "phoneNumber": "+998901234567",
  "projectName": "My App",
  "firstName": "John",
  "lastName": "Doe",
  "password": "securepassword",
  "accountType": "individual",
  "acceptTerms": true
}
```

### POST /users/login

Login with phone and password.

**Request:**
```json
{
  "phoneNumber": "+998901234567",
  "password": "securepassword"
}
```

### POST /users/forgot-password

Request password reset OTP.

### POST /users/reset-password

Reset password with OTP code.

---

## 📊 Dashboard Endpoints

All require `Authorization: Bearer <token>` header.

- `GET /dashboard/stats` - Get usage statistics
- `GET /dashboard/chart` - Get chart data
- `GET /dashboard/sent-otps` - List sent OTPs with filters
- `GET /dashboard/reports` - Monthly reports
- `POST /dashboard/topup` - Top up balance
- `GET /dashboard/api-clients` - List API clients
- `POST /dashboard/api-clients` - Create new API client

---

## 🔒 Security Features

| Feature | Description |
|---------|-------------|
| **API Key Auth** | Each client has a unique API key |
| **JWT Auth** | Secure user session management |
| **Rate Limiting** | Max 100 OTP requests per phone per hour per client |
| **5-min Expiry** | OTP codes expire after 5 minutes |
| **E.164 Format** | Phone numbers normalized for consistent matching |
| **Contact Verification** | Bot only accepts contacts from the message sender |
| **Password Hashing** | bcrypt with 12 rounds |

---

## 📁 Project Structure

```
yalavoch/
├── prisma/
│   └── schema.prisma       # Database models
├── src/
│   ├── server.ts           # Express API server
│   ├── bot.ts              # Telegram bot (grammY)
│   ├── routes/
│   │   ├── auth.ts         # OTP endpoints
│   │   ├── admin.ts        # Admin endpoints
│   │   ├── users.ts        # User auth endpoints
│   │   └── dashboard.ts    # Dashboard endpoints
│   └── lib/
│       ├── prisma.ts       # Database client
│       └── utils.ts        # Utilities
├── frontend/               # React landing page & dashboard
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Shared components
│   │   └── App.tsx         # Router setup
│   └── index.html
├── package.json
└── env.example
```

---

## 🧪 Integration Example

```javascript
// 1. Request OTP
const response = await fetch('https://api.yalavoch.uz/otp/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'otp_your_api_key_here'
  },
  body: JSON.stringify({ phoneNumber: '+998901234567' })
});

const { requestId, botLink, otpSent } = await response.json();

// 2. If otpSent is false, direct user to Telegram bot
// Show: "Open {botLink} and share your contact to receive your code"

// 3. User enters code, then verify
const verify = await fetch('https://api.yalavoch.uz/otp/verify', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'otp_your_api_key_here'
  },
  body: JSON.stringify({ requestId, code: userEnteredCode })
});

const result = await verify.json();
if (result.success) {
  // Phone number verified! Log user in or complete registration
}
```

---

## 📝 License

MIT
