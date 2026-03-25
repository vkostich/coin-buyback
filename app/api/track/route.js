// app/api/track/route.js
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const poNumber = searchParams.get('poNumber');

    if (!poNumber) {
      return Response.json({ error: 'poNumber required' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: pos, error } = await supabase
      .from('purchase_orders')
      .select(`
        id, status, shipping_option, created_at,
        sellers ( name, email, paypal_email ),
        po_items (
          offers ( id, offer_price, verification_status, payment_status, tracking_number, tracking_carrier, shipping_option ),
          cards ( name, card_number, psa_grade, psa_cert_number, finish )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const filtered = (pos || []).filter(p =>
      p.id.split('-')[0].toUpperCase() === poNumber.replace('PO-', '')
    );

    if (filtered.length === 0) {
      return Response.json({ error: 'Submission not found' }, { status: 404 });
    }

    const po = filtered[0];
    const item = po.po_items?.[0];
    const offer = Array.isArray(item?.offers) ? item.offers[0] : item?.offers;
    const card = Array.isArray(item?.cards) ? item.cards[0] : item?.cards;
    const seller = Array.isArray(po.sellers) ? po.sellers[0] : po.sellers;

    return Response.json({
      found: true,
      poNumber,
      offerId: offer?.id,
      sellerName: seller?.name,
      sellerEmail: seller?.email,
      paypalEmail: seller?.paypal_email,
      cardNumber: card?.card_number,
      card: card ? `${card.name} ${card.card_number || ''}`.trim() : null,
      psaGrade: card?.psa_grade,
      psaCert: card?.psa_cert_number,
      offerPrice: offer?.offer_price,
      verificationStatus: offer?.verification_status,
      paymentStatus: offer?.payment_status,
      shippingOption: offer?.shipping_option || po.shipping_option,
      trackingNumber: offer?.tracking_number,
      trackingCarrier: offer?.tracking_carrier,
      createdAt: po.created_at,
    });

  } catch (err) {
    console.error('TRACK GET ERROR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

