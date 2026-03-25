import { NextResponse } from 'next/server';

const PCGS_BASE = 'https://api.pcgs.com/publicapi';

async function pcgsFetch(path) {
  const res = await fetch(`${PCGS_BASE}${path}`, {
    headers: { Authorization: `bearer ${process.env.PCGS_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`PCGS API error: ${res.status}`);
  return res.json();
}

function parseGradeNumber(grade) {
  const match = grade?.match(/(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const certNo = searchParams.get('certNo')?.replace(/\D/g, '');

  if (!certNo || certNo.length < 7) {
    return NextResponse.json({ error: 'Invalid cert number' }, { status: 400 });
  }

  try {
    // Call 1: coin identity + cert-specific auction list
    const data = await pcgsFetch(
      `/coindetail/GetCoinFactsByCertNo/${certNo}?retrieveAllData=true`
    );

    if (!data.IsValidRequest || data.ServerMessage === 'No data found') {
      return NextResponse.json({ error: 'Cert not found' }, { status: 404 });
    }

    // Build sold records from cert-specific auctions
    let soldRecords = (data.AuctionList || [])
      .filter(a => a.Price > 0)
      .map(a => ({
        price: a.Price,
        date: a.Date,
        house: a.Auctioneer,
        saleName: a.SaleName,
        isCAC: a.IsCAC,
        url: a.AuctionLotUrl
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Call 2: if no cert-specific auctions, fall back to grade-level APR
    if (soldRecords.length === 0 && data.PCGSNo) {
      const gradeNum = parseGradeNumber(data.Grade);
      const isPlusGrade = data.Grade?.includes('+');

      if (gradeNum) {
        try {
          const aprData = await pcgsFetch(
            `/coindetail/GetAPRByGrade?PCGSNo=${data.PCGSNo}&GradeNo=${gradeNum}&PlusGrade=${isPlusGrade}&NumberOfRecords=10`
          );

          if (aprData.IsValidRequest && aprData.Auctions?.length > 0) {
            soldRecords = aprData.Auctions
              .filter(a => a.Price > 0)
              .map(a => ({
                price: a.Price,
                date: a.Date,
                house: a.Auctioneer,
                saleName: a.SaleName,
                isCAC: a.IsCAC,
                url: a.AuctionLotUrl,
                source: 'grade_level'
              }))
              .sort((a, b) => new Date(b.date) - new Date(a.date));
          }
        } catch (e) {
          console.log('APR by grade fallback failed:', e.message);
        }
      }
    }

    return NextResponse.json({
      certNo: data.CertNo,
      coinName: data.Name,
      year: data.Year,
      denomination: data.Denomination,
      mintMark: data.MintMark,
      grade: data.Grade,
      designation: data.Designation,
      variety: data.MajorVariety || data.MinorVariety || data.DieVariety,
      pcgsNumber: data.PCGSNo,
      priceGuide: data.PriceGuideValue,
      population: data.Population,
      populationHigher: data.PopHigher,
      seriesName: data.SeriesName,
      imageObverse: data.Images?.[0]?.Fullsize,
      imageReverse: data.Images?.[1]?.Fullsize,
      soldRecords,
      isValidRequest: true
    });

  } catch (err) {
    console.error('PCGS API error:', err);
    return NextResponse.json({ error: 'PCGS lookup failed' }, { status: 500 });
  }
}