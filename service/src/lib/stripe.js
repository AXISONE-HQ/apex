import Stripe from "stripe";
import { logger } from "./logger.js";

const STRIPE_API_VERSION = "2024-06-20";

let stripeClient;

function ensureSecretKey() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return secret;
}

export function getStripeClient() {
  if (!stripeClient) {
    const secretKey = ensureSecretKey();
    stripeClient = new Stripe(secretKey, {
      apiVersion: STRIPE_API_VERSION,
      appInfo: {
        name: "Apex",
      },
    });
  }
  return stripeClient;
}

export async function createCheckoutSession({
  orgId,
  invoiceId,
  amountCents,
  currency = "cad",
  clubStripeAccountId,
  successUrl,
  cancelUrl,
  description = "Club fee",
}) {
  if (!orgId) throw new Error("orgId is required");
  if (!invoiceId) throw new Error("invoiceId is required");
  if (!amountCents || amountCents <= 0) throw new Error("amountCents must be > 0");
  if (!successUrl || !cancelUrl) throw new Error("successUrl and cancelUrl are required");

  const stripe = getStripeClient();
  const sessionParams = {
    mode: "payment",
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: undefined,
    client_reference_id: invoiceId,
    payment_intent_data: {
      metadata: {
        invoice_id: invoiceId,
        org_id: orgId,
      },
    },
    line_items: [
      {
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: description,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoice_id: invoiceId,
      org_id: orgId,
    },
  };

  const requestOptions = clubStripeAccountId ? { stripeAccount: clubStripeAccountId } : undefined;
  return stripe.checkout.sessions.create(sessionParams, requestOptions);
}

export function constructWebhookEvent(rawBody, signature, webhookSecret = process.env.STRIPE_WEBHOOK_SECRET) {
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }
  if (!signature) {
    throw new Error("Missing Stripe-Signature header");
  }
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}

export async function createConnectAccount({ orgId, email }) {
  if (!orgId) throw new Error("orgId is required to create a Stripe Connect account");
  const stripe = getStripeClient();
  return stripe.accounts.create({
    type: "express",
    email: email && email.toLowerCase(),
    metadata: {
      org_id: orgId,
    },
  });
}

export async function createAccountLink({ stripeAccountId, returnUrl, refreshUrl }) {
  if (!stripeAccountId) throw new Error("stripeAccountId is required");
  if (!returnUrl || !refreshUrl) throw new Error("returnUrl and refreshUrl are required");
  const stripe = getStripeClient();
  try {
    return await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    });
  } catch (err) {
    logger.error({ err }, "Failed to create Stripe account link");
    throw err;
  }
}
