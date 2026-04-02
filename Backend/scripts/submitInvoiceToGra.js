#!/usr/bin/env node
/**
 * Log in and submit an invoice to GRA via the backend proxy (same as the app).
 *
 * Prerequisites:
 * - Backend running (e.g. npm run dev in Backend/)
 * - User account with GRA Company Reference + Security Key saved (Settings → Company)
 * - MongoDB invoice _id for a tax invoice owned by that user
 *
 * Usage:
 *   API_URL=http://localhost:8000 EMAIL=you@example.com PASSWORD=secret \
 *     node scripts/submitInvoiceToGra.js <invoiceMongoId>
 *
 * Build payload only (no GRA call):
 *   ... node scripts/submitInvoiceToGra.js <invoiceMongoId> --debug-payload
 */

const API_URL = (process.env.API_URL || "http://localhost:8000").replace(/\/$/, "");
const email = process.env.EMAIL || process.env.INVOICY_EMAIL;
const password = process.env.PASSWORD || process.env.INVOICY_PASSWORD;

const argv = process.argv.slice(2);
const debugPayload = argv.includes("--debug-payload");
const invoiceId = argv.find((a) => !a.startsWith("--"));

async function main() {
  if (!email || !password || !invoiceId) {
    console.error(`
Usage:
  API_URL=http://localhost:8000 EMAIL=your@email.com PASSWORD=yourpassword \\
    node scripts/submitInvoiceToGra.js <invoiceMongoId> [--debug-payload]

--debug-payload  Return the JSON body that would be sent to GRA (does not call GRA).
`);
    process.exit(1);
  }

  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginData = await loginRes.json().catch(() => ({}));
  if (!loginRes.ok) {
    console.error("Login failed:", loginRes.status, loginData);
    process.exit(1);
  }
  const token = loginData.token;
  if (!token) {
    console.error("Login response had no token:", loginData);
    process.exit(1);
  }

  const payload = { invoiceId };
  if (debugPayload) payload.debugPayload = true;

  const subRes = await fetch(`${API_URL}/api/gra/submit-invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const subData = await subRes.json().catch(() => ({}));
  console.log(JSON.stringify(subData, null, 2));
  process.exit(subRes.ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
