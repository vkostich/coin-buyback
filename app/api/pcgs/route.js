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
    const [coinData, auctionData] = await Promise.all([
      pcgsFetch(`/coinFacts/GetCoinFactsByCertNo/${certNo}`),
      pcgsFetch(`/auctionprices/GetAuctionResultsByCertNo/${certNo}`)
    ]);

    if (!coinData.IsValidRequest || coinData.ServerMessage === 'No data found') {
      return NextResponse.json({ error: 'Cert not found' }, { status: 404 });
    }

    const auctions = Array.isArray(auctionData)
      ? auctionData
      : auctionData?.Results || auctionData?.AuctionResults || [];

    const soldRecords = auctions
      .filter(a => a.SalePrice || a.Price || a.RealisedPrice)
      .map(a => ({
        price: parseFloat(a.SalePrice || a.Price || a.RealisedPrice || 0),
        date: a.SaleDate || a.Date || a.AuctionDate || null,
        house: a.AuctionHouse || a.Firm || a.AuctionFirm || 'Unknown'
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return NextResponse.json({
      certNo: coinData.CertNo,
      coinName: coinData.CoinName,
      year: coinData.Year,
      denomination: coinData.Denomination,
      mintMark: coinData.MintMark,
      grade: coinData.Grade,
      designation: coinData.Designation,
      variety: coinData.Variety,
      pcgsNumber: coinData.PCGSNo,
      priceGuide: coinData.PriceGuideValue,
      population: coinData.Population,
      populationHigher: coinData.PopulationHigher,
      imageObverse: coinData.IssueImageFront,
      imageReverse: coinData.IssueImageBack,
      soldRecords,
      isValidRequest: true
    });

  } catch (err) {
    console.error('PCGS API error:', err);
    return NextResponse.json({ error: 'PCGS lookup failed' }, { status: 500 });
  }
}