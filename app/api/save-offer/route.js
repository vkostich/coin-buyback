// app/api/save-offer/route.js
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const supabase = getSupabase();

    // --- BRANCH: updatePhrase ---
    if (body.updatePhrase) {
      const { offerId, phrase } = body;
      if (!offerId || !phrase) {
        return Response.json({ error: 'offerId and phrase required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('offers')
        .update({ verification_phrase: phrase })
        .eq('id', offerId);
      if (error) throw error;
      return Response.json({ success: true });
    }

    // --- BRANCH: updateTracking ---
    if (body.updateTracking) {
      const { offerId, trackingNumber, trackingCarrier } = body;
      if (!offerId || !trackingNumber) {
        return Response.json({ error: 'offerId and trackingNumber required' }, { status: 400 });
      }
      const { error } = await supabase
        .from('offers')
        .update({
          tracking_number: trackingNumber,
          tracking_carrier: trackingCarrier || null,
        })
        .eq('id', offerId);
      if (error) throw error;
      return Response.json({ success: true });
    }

    // --- BRANCH: initial offer save ---
    const { sellerName, sellerEmail, paypalEmail, cardInfo, psaData, offer, shippingOption } = body;

    if (!sellerName || !sellerEmail || !cardInfo || !offer) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Upsert seller
    let seller;
    const { data: existingSeller } = await supabase
      .from('sellers')
      .select('*')
      .eq('email', sellerEmail)
      .single();

    if (existingSeller) {
      if (paypalEmail && paypalEmail !== existingSeller.paypal_email) {
        await supabase
          .from('sellers')
          .update({ paypal_email: paypalEmail })
          .eq('id', existingSeller.id);
      }
      seller = existingSeller;
    } else {
      const { data: newSeller, error: sellerError } = await supabase
        .from('sellers')
        .insert({ name: sellerName, email: sellerEmail, paypal_email: paypalEmail || null })
        .select()
        .single();
      if (sellerError) throw sellerError;
      seller = newSeller;
    }

    // Check for duplicate cert number
    if (psaData?.certNumber) {
      const { data: dupCards } = await supabase
        .from('cards')
        .select('id, psa_cert_number')
        .eq('psa_cert_number', psaData.certNumber);

      if (dupCards && dupCards.length > 0) {
        const cardIds = dupCards.map(c => c.id);
        const { data: activeOffers } = await supabase
          .from('offers')
          .select('id, status')
          .in('card_id', cardIds)
          .not('status', 'in', '("Complete","Rescinded","Expired")');

        if (activeOffers && activeOffers.length > 0) {
          return Response.json({
            error: 'duplicate_cert',
            message: 'This PSA cert number already has an active offer in our system. If you believe this is an error, please contact us.',
          }, { status: 409 });
        }
      }
    }

    // Insert card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert({
        seller_id: seller.id,
        name: cardInfo.name,
        series: cardInfo.series,
        year: cardInfo.year,
        card_number: cardInfo.cardNumber,
        variant: cardInfo.variant,
        condition: cardInfo.condition,
        estimated_grade: cardInfo.estimatedGrade,
        finish: cardInfo.finish || 'Matte',
        finish_source: cardInfo.finishSource || 'Visual',
        psa_cert_number: psaData?.certNumber || null,
        psa_grade: psaData?.grade || null,
        psa_variety: psaData?.variety || null,
        set_name: cardInfo.setName,
        manufacturer: cardInfo.manufacturer,
        notes: cardInfo.notes,
        confidence: cardInfo.confidence,
      })
      .select()
      .single();
    if (cardError) throw cardError;

    // Insert offer
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data: savedOffer, error: offerError } = await supabase
      .from('offers')
      .insert({
        card_id: card.id,
        seller_id: seller.id,
        offer_price: offer.offerPrice,
        fair_market_value: offer.fairMarketValue,
        margin_percent: offer.marginPercent,
        reasoning: offer.reasoning,
        velocity_score: offer.velocityScore,
        scarcity_score: offer.scarcityScore,
        desirability_score: offer.desirabilityScore,
        confidence_level: offer.confidenceLevel,
        shipping_option: shippingOption || null,
        status: 'Accepted',
        verification_status: 'Pending',
        verification_phrase: null,
        payment_status: 'Pending',
        accepted_at: now.toISOString(),
        pending_expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();
    if (offerError) throw offerError;

    // Insert purchase order
    const { data: po, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        seller_id: seller.id,
        total_value: offer.offerPrice,
        status: 'Pending',
        shipping_option: shippingOption,
      })
      .select()
      .single();
    if (poError) throw poError;

    // Link card to PO
    const { error: poItemError } = await supabase
      .from('po_items')
      .insert({
        po_id: po.id,
        card_id: card.id,
        offer_id: savedOffer.id,
        status: 'Pending',
      });
    if (poItemError) throw poItemError;

    return Response.json({
      success: true,
      sellerId: seller.id,
      cardId: card.id,
      offerId: savedOffer.id,
      poId: po.id,
      poNumber: `PO-${po.id.substring(0, 8).toUpperCase()}`,
    });

  } catch (err) {
    console.error('SAVE OFFER ERROR:', err);
    return Response.json({ error: 'Failed to save offer', detail: err.message }, { status: 500 });
  }
}
