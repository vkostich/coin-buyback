// app/api/inventory/route.js
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}
function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN = process.env.ADMIN_EMAIL;

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('inventory')
      .select('*')
      .eq('status', 'Available')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return Response.json({ listings: data || [] });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { inventoryId, buyerName, buyerEmail, offerPrice, message } = body;

    // Save inquiry
    const { error } = await getSupabase()
      .from('buyer_inquiries')
      .insert([{ inventory_id: inventoryId, buyer_name: buyerName, buyer_email: buyerEmail, offer_price: offerPrice, message }]);

    if (error) throw error;

    // Get listing details
    const { data: listing } = await getSupabase()
      .from('inventory')
      .select('name, card_number, psa_grade, asking_price')
      .eq('id', inventoryId)
      .single();

    // Email admin
    const html = `<!DOCTYPE html><html><body style="background:#0a0a0a;font-family:'Segoe UI',sans-serif;color:#fff;margin:0;padding:0">
      <div style="max-width:560px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(to right,#4a1942,#1f1035);padding:20px;text-align:center">
          <h1 style="margin:0;font-size:22px">GPK <span style="color:#ec4899">BuyBack</span></h1>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:13px">New Buyer Inquiry</p>
        </div>
        <div style="padding:24px">
          <div style="background:#1e3a5f;border-radius:8px;padding:12px;margin-bottom:16px">
            <p style="margin:0;color:#93c5fd">💬 New offer received on a listing!</p>
          </div>
          <div style="background:#1f2937;border-radius:8px;padding:14px">
            ${[['Card', `${listing?.name} ${listing?.card_number || ''}`.trim()], ['PSA Grade', `PSA ${listing?.psa_grade}`], ['Asking Price', `$${listing?.asking_price}`], ['Buyer Offer', `$${offerPrice}`], ['Buyer Name', buyerName], ['Buyer Email', buyerEmail], ['Message', message || '—']].map(([k, v]) => `
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #374151;font-size:14px">
              <span style="color:#6b7280">${k}</span><span style="color:#fff;font-weight:600">${v}</span>
            </div>`).join('')}
          </div>
          <div style="text-align:center;margin-top:20px">
            <a href="mailto:${buyerEmail}" style="display:inline-block;padding:12px 24px;border-radius:10px;background:linear-gradient(to right,#ec4899,#a855f7);color:#fff;font-weight:bold;text-decoration:none;font-size:14px">Reply to Buyer</a>
          </div>
        </div>
      </div>
    </body></html>`;

    await getResend().emails.send({
      from: FROM,
      to: ADMIN,
      subject: `💬 New Offer: ${listing?.name} ${listing?.card_number || ''} — $${offerPrice}`,
      html,
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
