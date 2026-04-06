/**
 * POST /api/subscribe
 *
 * Creates a Stripe Checkout session for the Pro subscription.
 * Requires authentication.  Returns { url } which the client
 * redirects to for payment.
 *
 * GET /api/subscribe?action=portal
 *   Returns a Stripe Customer Portal URL for managing the subscription.
 */
import Stripe from 'stripe';
import { verifyAuth, getSupabase } from './lib/supabase.js';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const auth = await verifyAuth(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  try {
    if (req.method === 'POST') return await createCheckout(req, res, auth.user);
    if (req.method === 'GET' && req.query.action === 'portal') {
      return await createPortal(req, res, auth.user);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[subscribe]', err);
    return res.status(500).json({ error: err.message });
  }
}

async function createCheckout(req, res, user) {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;
  if (!priceId) return res.status(500).json({ error: 'STRIPE_PRO_PRICE_ID not configured' });

  // Determine origin for success/cancel URLs - try origin header, then referer, then fallback
  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || 'https://liftforecast.com';

  // Get or create Stripe customer
  const customerId = await getOrCreateCustomer(stripe, user);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/?subscription=success`,
    cancel_url: `${origin}/?subscription=cancelled`,
    metadata: { supabase_user_id: user.id },
  });

  return res.status(200).json({ url: session.url });
}

async function createPortal(req, res, user) {
  const stripe = getStripe();
  // Determine origin for return URL - try origin header, then referer, then fallback
  const origin = req.headers.origin || req.headers.referer?.split('/').slice(0, 3).join('/') || 'https://liftforecast.com';

  const customerId = await getOrCreateCustomer(stripe, user);

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: origin,
  });

  return res.status(200).json({ url: session.url });
}

async function getOrCreateCustomer(stripe, user) {
  const supabase = getSupabase();

  // Check if we already have a Stripe customer ID stored
  const { data } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (data?.stripe_customer_id) return data.stripe_customer_id;

  // Create a new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { supabase_user_id: user.id },
  });

  // Store the mapping
  await supabase
    .from('subscriptions')
    .upsert({
      user_id: user.id,
      stripe_customer_id: customer.id,
      tier: 'free',
      status: 'inactive',
    }, { onConflict: 'user_id' });

  return customer.id;
}
