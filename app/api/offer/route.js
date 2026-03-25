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
  if (grade