import { NextResponse } from 'next/server';

const PCGS_BASE = 'https://api.pcgs.com/publicapi';

async function pcgsFetch(path) {
  const res = await fetch(`${PCGS_BASE}${path}`, {
    headers: { Authorization: `bearer ${process.env.PCGS_API_TOKEN}` }
  });
  if (!res.ok) throw new Error(`PCGS API error: ${res.status}`);
  return res.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const certNo = searchParams.get('certNo')?.replace(/\D/g, '');

  if (!certNo || certNo.length < 7) {
    return NextResponse.json({ error: 'Invalid cert number' }, { status: 400 });
  }

  try {
    const data = await pcgsFetch(
      `/coindetail/GetCoinFactsByCertNo/${certNo}?retrieveAllData=true`
    );

    if (!data.IsValidRequest || data.ServerMessage === 'No data found') {
      return NextResponse.json({ error: 'Cert not found' }, { status: 404 });
    }

    const soldRecords = (data.AuctionList || [])
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