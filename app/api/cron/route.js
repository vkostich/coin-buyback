// app/api/cron/route.js
// Runs daily at 2pm UTC via Vercel Cron
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN = process.env.ADMIN_EMAIL;

function daysSince(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function baseStyle() {
  return `
    body { margin:0; padding:0; background:#0a0a0a; font-family:'Segoe UI',sans-serif; color:#fff; }
    .wrap { max-width:600px; margin:0 auto; background:#111827; border-radius:12px; overflow:hidden; }
    .header { background:linear-gradient(to right,#4a1942,#1f1035); padding:24px; text-align:center; }
    .header h1 { margin:0; font-size:24px; } .header h1 span { color:#ec4899; }
    .header p { margin:6px 0 0; color:#9ca3af; font-size:13px; }
    .body { padding:28px 24px; }
    .card { background:#1f2937; border-radius:10px; padding:16px; margin-bottom:16px; }
    .card h3 { margin:0 0 12px; font-size:15px; color:#9ca3af; }
    .btn { display:inline-block; padding:14px 28px; border-radius:10px; font-weight:bold; font-size:15px; text-decoration:none; color:#fff; margin:8px 4px; }
    .btn-pink { background:linear-gradient(to right,#ec4899,#a855f7); }
    .btn-red { background:#dc2626; }
    .footer { padding:16px 24px; text-align:center; color:#4b5563; font-size:12px; border-top:1px solid #1f2937; }
  `;
}

function header() {
  return `<div class="header"><h1>PSA <span>BuyBack</span></h1><p>Instant Offers. Fast Cash.</p></div>`;
}

function footer(submissionId) {
  return `<div class="footer"><p>Submission #${submissionId} &middot; Questions? Reply to this email.</p><p>PSA BuyBack &middot; &copy; ${new Date().getFullYear()}</p></div>`;
}

function trackingButton(submissionId) {
  return `
    <div style="text-align:center;margin:24px 0">
      <a href="${process.env.NEXT_PUBLIC_URL || 'https://gpk-buyback.vercel.app'}/track/${submissionId}" class="btn btn-pink">
        &para; Enter Tracking Number &rarr;
      </a>
    </div>`;
}

// DAY 2 — Friendly reminder
async function sendDay2Email({ to, sellerName, submissionId, cardName }) {
  const resend = getResend();
  const html = `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
    <div class="wrap">
      ${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#6366f1">Just a Quick Reminder!</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
          Hi ${sellerName}! We noticed you haven't entered a tracking number yet for your <strong style="color:#ec4899">${cardName}</strong>.
          No worries &mdash; just a friendly heads up that you have <strong style="color:#fff">3 days left</strong> to ship your card.
        </p>
        <div class="card" style="border:1px solid #6366f140">
          <p style="margin:0;color:#a5b4fc;font-size:14px">
            Once you ship, just pop your tracking number into the site and you're all set. We'll take it from there!
          </p>
        </div>
        ${trackingButton(submissionId)}
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return resend.emails.send({ from: FROM, to, subject: `📦 Friendly Reminder: Enter Your Tracking Number | ${submissionId}`, html });
}

// DAY 3 — Urgent
async function sendDay3Email({ to, sellerName, submissionId, cardName }) {
  const resend = getResend();
  const html = `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
    <div class="wrap">
      ${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#f97316">Action Required: Ship Your Card</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
          Hi ${sellerName}, we still haven't received a tracking number for your <strong style="color:#ec4899">${cardName}</strong>.
          You agreed to ship within 5 business days &mdash; <strong style="color:#f97316">you now have 2 days remaining</strong>.
        </p>
        <div class="card" style="background:#451a03;border:1px solid #f9731640">
          <p style="margin:0;color:#fdba74;font-size:14px">
            Please ship your card today and enter your tracking number immediately. If we do not receive tracking by Day 5,
            your offer will be rescinded and any upfront payment may be subject to a PayPal dispute.
          </p>
        </div>
        ${trackingButton(submissionId)}
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return resend.emails.send({ from: FROM, to, subject: `⚠️ Action Required: 2 Days Left to Ship | ${submissionId}`, html });
}

// DAY 5 — Final warning before rescind
async function sendDay5Email({ to, sellerName, submissionId, cardName }) {
  const resend = getResend();
  const html = `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
    <div class="wrap">
      ${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#dc2626">Final Notice: Your Offer is Being Rescinded</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">
          Hi ${sellerName}, we have not received a tracking number for your <strong style="color:#ec4899">${cardName}</strong>
          within the agreed 5 business day window.
        </p>
        <div class="card" style="background:#450a0a;border:1px solid #dc2626">
          <p style="margin:0;color:#fca5a5;font-size:14px">
            <strong>Your offer has been rescinded.</strong> If an upfront payment was sent to you, a PayPal dispute has been initiated
            to recover those funds. If you believe this is an error or have already shipped, please reply to this email immediately
            with your tracking number.
          </p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${process.env.NEXT_PUBLIC_URL || 'https://gpk-buyback.vercel.app'}" class="btn btn-pink">Submit a New Offer</a>
        </div>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return resend.emails.send({ from: FROM, to, subject: `❌ Offer Rescinded: No Tracking Received | ${submissionId}`, html });
}

async function sendAdminRescindEmail({ submissionId, cardName, sellerName, sellerEmail, paypalEmail, upfrontAmount }) {
  const resend = getResend();
  const html = `<!DOCTYPE html><html><head><style>${baseStyle()}</style></head><body>
    <div class="wrap">
      ${header()}
      <div class="body">
        <div class="card" style="background:#450a0a;border:1px solid #dc2626">
          <p style="color:#fca5a5;margin:0">&#10060; Offer auto-rescinded &mdash; no tracking after 5 days</p>
        </div>
        <div class="card">
          <h3>&#128203; Submission</h3>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #374151">Submission #</td><td style="color:#fff;font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid #374151;text-align:right">${submissionId}</td></tr>
            <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #374151">Card</td><td style="color:#fff;font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid #374151;text-align:right">${cardName}</td></tr>
            <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #374151">Seller</td><td style="color:#fff;font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid #374151;text-align:right">${sellerName}</td></tr>
            <tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #374151">Email</td><td style="color:#fff;font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid #374151;text-align:right">${sellerEmail}</td></tr>
            ${paypalEmail ? `<tr><td style="color:#6b7280;font-size:14px;padding:6px 0;border-bottom:1px solid #374151">PayPal</td><td style="color:#fff;font-weight:600;font-size:14px;padding:6px 0;border-bottom:1px solid #374151;text-align:right">${paypalEmail}</td></tr>` : ''}
            ${upfrontAmount ? `<tr><td style="color:#6b7280;font-size:14px;padding:6px 0">Upfront Paid</td><td style="color:#f87171;font-weight:600;font-size:14px;padding:6px 0;text-align:right">$${upfrontAmount} &mdash; initiate refund</td></tr>` : ''}
          </table>
        </div>
        ${upfrontAmount ? `
        <div style="text-align:center;margin:20px 0">
          <a href="https://www.paypal.com/myaccount/activities/" class="btn btn-red">&#128184; Issue Refund in PayPal</a>
        </div>` : ''}
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return resend.emails.send({ from: FROM, to: ADMIN, subject: `❌ Auto-Rescinded: ${submissionId} — ${cardName}`, html });
}

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  try {
    const { data: offers, error } = await supabase
      .from('offers')
      .select(`
        id, offer_price, accepted_at, followup_count, payment_status, rescinded_at,
        verification_status, tracking_number,
        sellers ( name, email, paypal_email ),
        cards ( name, card_number ),
        po_items ( purchase_orders ( id ) )
      `)
      .eq('status', 'Accepted')
      .eq('verification_status', 'Approved')
      .is('tracking_number', null)
      .is('rescinded_at', null);

    if (error) throw error;

    const results = { followups: 0, rescinded: 0, skipped: 0 };

    for (const offer of offers || []) {
      const days = daysSince(offer.accepted_at || offer.created_at);
      const seller = Array.isArray(offer.sellers) ? offer.sellers[0] : offer.sellers;
      const card = Array.isArray(offer.cards) ? offer.cards[0] : offer.cards;
      const poItem = offer.po_items?.[0];
      const po = Array.isArray(poItem?.purchase_orders) ? poItem.purchase_orders[0] : poItem?.purchase_orders;
      const submissionId = po ? `PO-${po.id.split('-')[0].toUpperCase()}` : offer.id.substring(0, 8).toUpperCase();
      const cardName = card ? `${card.name} ${card.card_number || ''}`.trim() : 'Unknown Card';
      const upfront = offer.offer_price < 100
        ? (offer.offer_price * 0.5).toFixed(2)
        : (offer.offer_price * 0.25).toFixed(2);
      const upfrontPaid = offer.payment_status === 'Upfront Sent' || offer.payment_status === 'Received - Awaiting Final Payment';
      const followupCount = offer.followup_count || 0;

      // DAY 5+ — Rescind
      if (days >= 5) {
        await supabase.from('offers').update({
          rescinded_at: new Date().toISOString(),
          status: 'Rescinded',
        }).eq('id', offer.id);

        await sendDay5Email({
          to: seller?.email,
          sellerName: seller?.name,
          submissionId,
          cardName,
        });

        await sendAdminRescindEmail({
          submissionId,
          cardName,
          sellerName: seller?.name,
          sellerEmail: seller?.email,
          paypalEmail: seller?.paypal_email,
          upfrontAmount: upfrontPaid ? upfront : null,
        });

        results.rescinded++;
        continue;
      }

      // DAY 3 — Urgent reminder (only send once)
      if (days >= 3 && followupCount < 2) {
        await sendDay3Email({
          to: seller?.email,
          sellerName: seller?.name,
          submissionId,
          cardName,
        });

        await supabase.from('offers').update({ followup_count: 2 }).eq('id', offer.id);
        results.followups++;
        continue;
      }

      // DAY 2 — Friendly reminder (only send once)
      if (days >= 2 && followupCount < 1) {
        await sendDay2Email({
          to: seller?.email,
          sellerName: seller?.name,
          submissionId,
          cardName,
        });

        await supabase.from('offers').update({ followup_count: 1 }).eq('id', offer.id);
        results.followups++;
        continue;
      }

      results.skipped++;
    }

    console.log('CRON RESULTS:', results);
    return Response.json({ success: true, ...results, checked: offers?.length || 0 });

  } catch (err) {
    console.error('CRON ERROR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
