import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ApiDocs.module.css';

type ActiveSection = 'overview' | 'auth' | 'send' | 'verify' | 'status' | 'errors' | 'examples';

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'auth', label: 'Authentication' },
    { id: 'send', label: 'Send OTP' },
    { id: 'verify', label: 'Verify OTP' },
    { id: 'status', label: 'Check Status' },
    { id: 'errors', label: 'Error Handling' },
    { id: 'examples', label: 'Examples' },
  ];

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logo}>
            <img src="/yalavoch-logo.png" alt="Yalavoch" className={styles.logoImg} />
            <span className={styles.logoText}>Yalavoch</span>
          </Link>
          
          <div className={styles.headerActions}>
            <Link to="/login" className={styles.btnSecondary}>Log In</Link>
            <Link to="/register" className={styles.btnPrimary}>Get API Key</Link>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Sidebar Navigation */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarTitle}>API Reference</div>
          {sections.map((section) => (
            <button
              key={section.id}
              className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
              onClick={() => setActiveSection(section.id as ActiveSection)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        {/* Main Content */}
        <main className={styles.content}>
          {/* Overview */}
          {activeSection === 'overview' && (
            <section className={styles.section}>
              <h1>Yalavoch API Documentation</h1>
              <p className={styles.intro}>
                Yalavoch provides a simple REST API for sending and verifying OTP codes via Telegram.
                It's a cost-effective alternative to SMS-based verification that works seamlessly with your existing infrastructure.
              </p>

              <div className={styles.infoCard}>
                <h3>Base URL</h3>
                <code className={styles.baseUrl}>https://api.alavo.uz</code>
              </div>

              <h2>Quick Start</h2>
              <div className={styles.steps}>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>1</span>
                  <div className={styles.stepContent}>
                    <h4>Get Your API Key</h4>
                    <p>Register for an account and create your first API key from the dashboard.</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>2</span>
                  <div className={styles.stepContent}>
                    <h4>Send OTP Request</h4>
                    <p>Call POST /otp/send with the user's phone number to initiate verification.</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>3</span>
                  <div className={styles.stepContent}>
                    <h4>User Receives Code</h4>
                    <p>User gets a 6-digit code via our Telegram bot (instantly if already registered).</p>
                  </div>
                </div>
                <div className={styles.step}>
                  <span className={styles.stepNumber}>4</span>
                  <div className={styles.stepContent}>
                    <h4>Verify the Code</h4>
                    <p>Call POST /otp/verify to confirm the code and complete verification.</p>
                  </div>
                </div>
              </div>

              <div className={styles.featureGrid}>
                <div className={styles.feature}>
                  <h4>🚀 Instant Delivery</h4>
                  <p>OTPs delivered in under 1 second via Telegram</p>
                </div>
                <div className={styles.feature}>
                  <h4>💰 Cost Effective</h4>
                  <p>No SMS charges - uses Telegram infrastructure</p>
                </div>
                <div className={styles.feature}>
                  <h4>🔒 Secure</h4>
                  <p>End-to-end encrypted via Telegram</p>
                </div>
                <div className={styles.feature}>
                  <h4>📊 Analytics</h4>
                  <p>Real-time dashboard with usage stats</p>
                </div>
              </div>
            </section>
          )}

          {/* Authentication */}
          {activeSection === 'auth' && (
            <section className={styles.section}>
              <h1>Authentication</h1>
              <p>All API requests require authentication using an API key.</p>

              <h2>API Key Header</h2>
              <p>Include your API key in the <code>X-API-Key</code> header with every request:</p>
              
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>HTTP Header</span>
                  <button onClick={() => copyCode('X-API-Key: otp_your_api_key_here', 'auth')}>
                    {copiedCode === 'auth' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code>{`X-API-Key: otp_your_api_key_here`}</code></pre>
              </div>

              <div className={styles.warningBox}>
                <strong>⚠️ Keep Your API Key Secure</strong>
                <p>Never expose your API key in client-side code. Always make API calls from your backend server.</p>
              </div>

              <h2>Getting Your API Key</h2>
              <ol className={styles.list}>
                <li>Log in to your <Link to="/dashboard">Yalavoch Dashboard</Link></li>
                <li>Navigate to <strong>Profile → API Keys</strong></li>
                <li>Click <strong>Create New API Key</strong></li>
                <li>Copy and securely store your new API key</li>
              </ol>
            </section>
          )}

          {/* Send OTP */}
          {activeSection === 'send' && (
            <section className={styles.section}>
              <h1>Send OTP</h1>
              <p>Request an OTP verification code for a phone number.</p>

              <div className={styles.endpoint}>
                <span className={styles.method}>POST</span>
                <code>/otp/send</code>
              </div>

              <h2>Request Body</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON</span>
                  <button onClick={() => copyCode('{\n  "phoneNumber": "+998901234567"\n}', 'send-req')}>
                    {copiedCode === 'send-req' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code>{`{
  "phoneNumber": "+998901234567"
}`}</code></pre>
              </div>

              <h3>Parameters</h3>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>phoneNumber</code></td>
                    <td>string</td>
                    <td>Yes</td>
                    <td>Phone number in E.164 format (e.g., +998901234567)</td>
                  </tr>
                </tbody>
              </table>

              <h2>Response</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON Response (200 OK)</span>
                </div>
                <pre><code>{`{
  "success": true,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+998901234567",
  "expiresAt": "2025-01-03T12:05:00.000Z",
  "botLink": "https://t.me/YalavochBot",
  "otpSent": false,
  "message": "Direct user to open the Telegram bot and share their contact."
}`}</code></pre>
              </div>

              <div className={styles.infoBox}>
                <strong>💡 Pro Tip</strong>
                <p>If <code>otpSent</code> is <code>true</code>, the user already has Telegram linked and received the OTP instantly. 
                   No need to redirect them to the bot!</p>
              </div>
            </section>
          )}

          {/* Verify OTP */}
          {activeSection === 'verify' && (
            <section className={styles.section}>
              <h1>Verify OTP</h1>
              <p>Verify the OTP code entered by the user.</p>

              <div className={styles.endpoint}>
                <span className={styles.method}>POST</span>
                <code>/otp/verify</code>
              </div>

              <h2>Request Body</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON (with requestId)</span>
                  <button onClick={() => copyCode('{\n  "requestId": "550e8400-e29b-41d4-a716-446655440000",\n  "code": "123456"\n}', 'verify-req')}>
                    {copiedCode === 'verify-req' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code>{`{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "code": "123456"
}`}</code></pre>
              </div>

              <p>Or verify using phone number:</p>

              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON (with phoneNumber)</span>
                </div>
                <pre><code>{`{
  "phoneNumber": "+998901234567",
  "code": "123456"
}`}</code></pre>
              </div>

              <h3>Parameters</h3>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th>Parameter</th>
                    <th>Type</th>
                    <th>Required</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>requestId</code></td>
                    <td>string</td>
                    <td>Either</td>
                    <td>The request ID from /otp/send response</td>
                  </tr>
                  <tr>
                    <td><code>phoneNumber</code></td>
                    <td>string</td>
                    <td>Either</td>
                    <td>Phone number in E.164 format</td>
                  </tr>
                  <tr>
                    <td><code>code</code></td>
                    <td>string</td>
                    <td>Yes</td>
                    <td>6-digit OTP code entered by user</td>
                  </tr>
                </tbody>
              </table>

              <h2>Success Response</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON Response (200 OK)</span>
                </div>
                <pre><code>{`{
  "success": true,
  "phoneNumber": "+998901234567",
  "verifiedAt": "2025-01-03T12:03:00.000Z",
  "message": "Phone number verified successfully"
}`}</code></pre>
              </div>
            </section>
          )}

          {/* Check Status */}
          {activeSection === 'status' && (
            <section className={styles.section}>
              <h1>Check Status</h1>
              <p>Check the current status of an OTP request. Useful for polling during the Telegram flow.</p>

              <div className={styles.endpoint}>
                <span className={styles.methodGet}>GET</span>
                <code>/otp/status/:requestId</code>
              </div>

              <h2>Response</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JSON Response (200 OK)</span>
                </div>
                <pre><code>{`{
  "success": true,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "phoneNumber": "+998901234567",
  "status": "code_sent",
  "expiresAt": "2025-01-03T12:05:00.000Z",
  "verifiedAt": null
}`}</code></pre>
              </div>

              <h3>Status Values</h3>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>pending</code></td>
                    <td>Waiting for user to open Telegram bot and share contact</td>
                  </tr>
                  <tr>
                    <td><code>code_sent</code></td>
                    <td>OTP code sent to user, waiting for verification</td>
                  </tr>
                  <tr>
                    <td><code>verified</code></td>
                    <td>Successfully verified</td>
                  </tr>
                  <tr>
                    <td><code>expired</code></td>
                    <td>Request expired (5 minute timeout)</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}

          {/* Error Handling */}
          {activeSection === 'errors' && (
            <section className={styles.section}>
              <h1>Error Handling</h1>
              <p>The API uses standard HTTP status codes and returns JSON error responses.</p>

              <h2>Error Response Format</h2>
              <div className={styles.codeBlock}>
                <pre><code>{`{
  "success": false,
  "error": "Error description here"
}`}</code></pre>
              </div>

              <h2>HTTP Status Codes</h2>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><code>200</code></td>
                    <td>Success</td>
                  </tr>
                  <tr>
                    <td><code>400</code></td>
                    <td>Bad Request - Invalid parameters or expired OTP</td>
                  </tr>
                  <tr>
                    <td><code>401</code></td>
                    <td>Unauthorized - Invalid or missing API key</td>
                  </tr>
                  <tr>
                    <td><code>404</code></td>
                    <td>Not Found - Request ID not found</td>
                  </tr>
                  <tr>
                    <td><code>429</code></td>
                    <td>Too Many Requests - Rate limit exceeded</td>
                  </tr>
                  <tr>
                    <td><code>500</code></td>
                    <td>Internal Server Error</td>
                  </tr>
                </tbody>
              </table>

              <h2>Common Errors</h2>
              <div className={styles.errorList}>
                <div className={styles.errorItem}>
                  <code>"Invalid OTP code"</code>
                  <p>The code entered by the user doesn't match</p>
                </div>
                <div className={styles.errorItem}>
                  <code>"OTP code has expired"</code>
                  <p>The 5-minute window has passed</p>
                </div>
                <div className={styles.errorItem}>
                  <code>"Rate limit exceeded"</code>
                  <p>Too many requests for this phone number (max 100/hour)</p>
                </div>
              </div>
            </section>
          )}

          {/* Examples */}
          {activeSection === 'examples' && (
            <section className={styles.section}>
              <h1>Integration Examples</h1>
              <p>Complete examples for integrating Yalavoch into your application.</p>

              <h2>Node.js / JavaScript</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>JavaScript</span>
                  <button onClick={() => copyCode(`const API_KEY = 'otp_your_api_key';
const BASE_URL = 'https://api.alavo.uz';

// Send OTP
async function sendOTP(phoneNumber) {
  const response = await fetch(\`\${BASE_URL}/otp/send\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ phoneNumber }),
  });
  return response.json();
}

// Verify OTP
async function verifyOTP(requestId, code) {
  const response = await fetch(\`\${BASE_URL}/otp/verify\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ requestId, code }),
  });
  return response.json();
}

// Usage
const { requestId, botLink, otpSent } = await sendOTP('+998901234567');

// If otpSent is false, direct user to botLink
// Then wait for user to enter the code

const result = await verifyOTP(requestId, userEnteredCode);
if (result.success) {
  console.log('Phone verified!', result.phoneNumber);
}`, 'js-example')}>
                    {copiedCode === 'js-example' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code>{`const API_KEY = 'otp_your_api_key';
const BASE_URL = 'https://api.alavo.uz';

// Send OTP
async function sendOTP(phoneNumber) {
  const response = await fetch(\`\${BASE_URL}/otp/send\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ phoneNumber }),
  });
  return response.json();
}

// Verify OTP
async function verifyOTP(requestId, code) {
  const response = await fetch(\`\${BASE_URL}/otp/verify\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ requestId, code }),
  });
  return response.json();
}

// Usage
const { requestId, botLink, otpSent } = await sendOTP('+998901234567');

// If otpSent is false, direct user to botLink
// Then wait for user to enter the code

const result = await verifyOTP(requestId, userEnteredCode);
if (result.success) {
  console.log('Phone verified!', result.phoneNumber);
}`}</code></pre>
              </div>

              <h2>Python</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>Python</span>
                  <button onClick={() => copyCode(`import requests

API_KEY = 'otp_your_api_key'
BASE_URL = 'https://api.alavo.uz'

def send_otp(phone_number):
    response = requests.post(
        f'{BASE_URL}/otp/send',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        json={'phoneNumber': phone_number}
    )
    return response.json()

def verify_otp(request_id, code):
    response = requests.post(
        f'{BASE_URL}/otp/verify',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        json={'requestId': request_id, 'code': code}
    )
    return response.json()

# Usage
result = send_otp('+998901234567')
request_id = result['requestId']

# Get code from user
verification = verify_otp(request_id, user_code)
if verification['success']:
    print(f"Verified: {verification['phoneNumber']}")`, 'py-example')}>
                    {copiedCode === 'py-example' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre><code>{`import requests

API_KEY = 'otp_your_api_key'
BASE_URL = 'https://api.alavo.uz'

def send_otp(phone_number):
    response = requests.post(
        f'{BASE_URL}/otp/send',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        json={'phoneNumber': phone_number}
    )
    return response.json()

def verify_otp(request_id, code):
    response = requests.post(
        f'{BASE_URL}/otp/verify',
        headers={
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
        },
        json={'requestId': request_id, 'code': code}
    )
    return response.json()

# Usage
result = send_otp('+998901234567')
request_id = result['requestId']

# Get code from user
verification = verify_otp(request_id, user_code)
if verification['success']:
    print(f"Verified: {verification['phoneNumber']}")`}</code></pre>
              </div>

              <h2>cURL</h2>
              <div className={styles.codeBlock}>
                <div className={styles.codeHeader}>
                  <span>cURL</span>
                </div>
                <pre><code>{`# Send OTP
curl -X POST https://api.alavo.uz/otp/send \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: otp_your_api_key" \\
  -d '{"phoneNumber": "+998901234567"}'

# Verify OTP
curl -X POST https://api.alavo.uz/otp/verify \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: otp_your_api_key" \\
  -d '{"requestId": "your-request-id", "code": "123456"}'`}</code></pre>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

