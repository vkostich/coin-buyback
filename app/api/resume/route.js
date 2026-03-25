// app/api/resume/route.js
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const offerId = searchParams.get('offerId');
    if (!offerId) return Response.json({ error: 'offerId required' }, { status: 400 });

    const supabase = getSupabase();

    const { data: offer, error } = await supabase
      .from('offers')
      .select(`
        id, offer_price, fair_market_value, pending_expires_at, status, created_at,
        cards ( name, card_number, psa_grade, psa_cert_number )
      `)
      .eq('id', offerId)
      .eq('status', 'Pending')
      .single();

    if (error || !offer) return Response.json({ error: 'Offer not found or already accepted.' }, { status: 404 });

    const expired = offer.pending_expires_at && new Date(offer.pending_expires_at) < new Date();
    const card = Array.isArray(offer.cards) ? offer.cards[0] : offer.cards;

    if (expired) {
      await supabase.from('offers').update({ status: 'Expired' }).eq('id', offerId);
      return Response.json({
        expired: true,
        cardName: `${card?.name} ${card?.card_number || ''}`.trim(),
        expiresAt: offer.pending_expires_at,
      });
    }

    return Response.json({
      offerId: offer.id,
      offerPrice: offer.offer_price,
      fairMarketValue: offer.fair_market_value,
      expiresAt: offer.pending_expires_at,
      cardName: `${card?.name} ${card?.card_number || ''}`.trim(),
      psaGrade: `PSA ${card?.psa_grade}`,
      psaCert: card?.psa_cert_number,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
