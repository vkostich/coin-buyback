import { NextResponse } from 'next/server';

const COMP_WINDOW = 5;
const COMP_MAX_AGE_DAYS = 365;

function calcFMV(soldRecords, priceGuide) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COMP_MAX_AGE_DAYS);

  const recent = soldRecords
    .filter(r => r.price > 0 && (!r.date || new Date(r.date) >= cutoff))
    .slice(0, COMP_WINDOW);

  if (recent.length === 0) {
    return {
      fmv: priceGuide ? Math.round(priceGuide * 0.80) : null,
      source: 'price_guide_fallback',
      compsUsed: 0,
      compsDetail: []
    };
  }

  const avg = recent.reduce((sum, r) => sum + r.price, 0) / recent.length;

  return {
    fmv: Math.round(avg),
    source: 'auction_comps',
    compsUsed: recent.length,
    compsDetail: recent.map(r => ({
      price: r.price,
      date: r.date,
      house: r.house
    }))
  };
}

function calcOffer(grade, fmv) {
  if (!fmv || fmv <= 0) return null;

  const gradeNum = parseInt(grade?.replace(/\D/g, '') || '0');
  const isDetails = (grade || '').toLowerCase().includes('details');

  if (isDetails) {
    return { offer: 0, eligible: false, reason: 'Details grades are not eligible' };
  }

  let pct;
  if (gradeNum === 70)      pct = 0.72;
  else if (gradeNum === 69) pct = 0.67;
  else if (gradeNum >= 67)  pct = 0.57;
  else if (gradeNum >= 65)  pct = 0.52;
  else if (gradeNum >= 63)  pct = 0.45;
  else if (gradeNum >= 60)  pct = 0.40;
  else                      pct = 0.35;

  const MIN_OFFER = 25;
  const rawOffer = Math.floor(fmv * pct);

  if (rawOffer < MIN_OFFER) {
    return { offer: 0, eligible: false, reason: `Offer below minimum threshold ($${MIN_OFFER})` };
  }

  return {
    offer: rawOffer,
    eligible: true,
    pct: Math.round(pct * 100),
    upfront: Math.round(rawOffer * 0.5),
    onDelivery: Math.round(rawOffer * 0.5)
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { grade, priceGuide, soldRecords } = body;

    if (!grade) {
      return NextResponse.json({ error: 'Grade is required' }, { status: 400 });
    }

    const { fmv, source, compsUsed, compsDetail } = calcFMV(
      soldRecords || [],
      priceGuide || 0
    );

    if (!fmv) {
      return NextResponse.json({
        error: 'Insufficient pricing data to generate offer',
        eligible: false
      }, { status: 422 });
    }

    const offerResult = calcOffer(grade, fmv);

    return NextResponse.json({
      ...offerResult,
      fmv,
      fmvSource: source,
      compsUsed,
      compsDetail,
      priceGuideReference: priceGuide || null
    });

  } catch (err) {
    console.error('Offer engine error:', err);
    return NextResponse.json({ error: 'Offer calculation failed' }, { status: 500 });
  }
}