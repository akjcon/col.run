/**
 * Setup Strava Webhook Subscription
 *
 * One-time script to register a webhook subscription with the Strava API.
 *
 * Usage:
 *   npx tsx scripts/setup-strava-webhook.ts <callback_url>
 *
 * Example:
 *   npx tsx scripts/setup-strava-webhook.ts https://abc123.ngrok.io/api/v2/strava/webhook
 *
 * Requires env vars: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_WEBHOOK_VERIFY_TOKEN
 */

const STRAVA_API = "https://www.strava.com/api/v3";

async function main() {
  const callbackUrl = process.argv[2];

  if (!callbackUrl) {
    console.error("Usage: npx tsx scripts/setup-strava-webhook.ts <callback_url>");
    console.error("Example: npx tsx scripts/setup-strava-webhook.ts https://abc123.ngrok.io/api/v2/strava/webhook");
    process.exit(1);
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN || "col-run-strava";

  if (!clientId || !clientSecret) {
    console.error("Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variables");
    process.exit(1);
  }

  console.log("Registering Strava webhook subscription...");
  console.log(`  Callback URL: ${callbackUrl}`);
  console.log(`  Verify Token: ${verifyToken}`);

  // Check for existing subscriptions first
  const listRes = await fetch(
    `${STRAVA_API}/push_subscriptions?client_id=${clientId}&client_secret=${clientSecret}`
  );

  if (listRes.ok) {
    const existing = await listRes.json();
    if (existing.length > 0) {
      console.log("\nExisting subscriptions found:");
      for (const sub of existing) {
        console.log(`  ID: ${sub.id}, Callback: ${sub.callback_url}`);
      }
      console.log("\nTo delete an existing subscription:");
      console.log(
        `  curl -X DELETE "${STRAVA_API}/push_subscriptions/${existing[0].id}?client_id=${clientId}&client_secret=${clientSecret}"`
      );
      console.log("\nDelete existing subscription before creating a new one.");
      return;
    }
  }

  // Create new subscription
  const res = await fetch(`${STRAVA_API}/push_subscriptions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      callback_url: callbackUrl,
      verify_token: verifyToken,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`Failed to create subscription: ${res.status} ${error}`);
    process.exit(1);
  }

  const subscription = await res.json();
  console.log(`\nSubscription created successfully!`);
  console.log(`  Subscription ID: ${subscription.id}`);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
