/**
 * POST /api/webhooks/stripe
 *
 * Stripe webhook handler.  Updates the Supabase `subscriptions` table
 * when a checkout completes, subscription renews, or is cancelled.
 *
 * Configure in Stripe Dashboard → Webhooks:
 *   URL: https://utahwindfinder.com/api/webhooks/stripe
 *   Events: checkout.session.completed, customer.subscription.updated,
 *           customer.subscription.deleted
 */
import Stripe from 'stripe';
import { getSupabase } from '../lib/supabase.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return res.status(500).json({ error: 'STRIPE_WEBHOOK_SECRET not configured' });

  let event;
  try {
    // Vercel may provide req.body as a Buffer when bodyParser is off,
    // or it may stream chunks.  Handle both.
    const body = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? Buffer.from(req.body)
        : await readRawBody(req);

    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Invalid signature: ${err.message}` });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        if (!userId) break;

        const { error: upsertErr } = await supabase.from('subscriptions').upsert({
          user_id: userId,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          tier: 'pro',
          status: 'active',
          current_period_end: null,
        }, { onConflict: 'user_id' });
        if (upsertErr) {
          console.error('checkout upsert failed:', upsertErr);
          return res.status(500).json({ error: 'DB write failed — Stripe will retry' });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const { data: row, error: lookupErr } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (lookupErr || !row) break;

        const isActive = sub.status === 'active' || sub.status === 'trialing';
        const { error: updateErr } = await supabase.from('subscriptions').update({
          tier: isActive ? 'pro' : 'free',
          status: sub.status,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString()
            : null,
        }).eq('user_id', row.user_id);
        if (updateErr) {
          console.error('subscription update failed:', updateErr);
          return res.status(500).json({ error: 'DB write failed — Stripe will retry' });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const { data: row, error: lookupErr } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', sub.customer)
          .single();
        if (lookupErr || !row) break;

        const { error: delErr } = await supabase.from('subscriptions').update({
          tier: 'free',
          status: 'cancelled',
        }).eq('user_id', row.user_id);
        if (delErr) {
          console.error('subscription delete failed:', delErr);
          return res.status(500).json({ error: 'DB write failed — Stripe will retry' });
        }
        break;
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
