export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cardName = searchParams.get("card");
  const grade = searchParams.get("grade");
  const year = searchParams.get("year");

  if (!cardName) {
    return Response.json({ error: "No card name provided" }, { status: 400 });
  }

  try {
    // Build search query
    const query = [
      "Garbage Pail Kids",
      cardName,
      year || "",
      grade || "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const encodedQuery = encodeURIComponent(query);

    // eBay Browse API - sold items
    const ebayRes = await fetch(
      `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodedQuery}&filter=soldItems&sort=endTimeNewest&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${process.env.EBAY_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
        },
      }
    );

    if (!ebayRes.ok) {
      // Fall back to simulated data if eBay not connected yet
      return Response.json(getSimulatedComps(cardName, grade));
    }

    const ebayData = await ebayRes.json();
    const items = ebayData.itemSummaries || [];

    const comps = items.map((item) => ({
      title: item.title,
      price: parseFloat(item.price?.value || 0),
      currency: item.price?.currency || "USD",
      date: item.itemEndDate || null,
      platform: "eBay",
      condition: item.condition || "Unknown",
      url: item.itemWebUrl,
    }));

    // Calculate stats
    const prices = comps.map((c) => c.price).filter((p) => p > 0);
    const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const high = prices.length ? Math.max(...prices) : 0;
    const low = prices.length ? Math.min(...prices) : 0;

    return Response.json({
      query,
      comps,
      stats: {
        count: prices.length,
        average: parseFloat(avg.toFixed(2)),
        high,
        low,
      },
    });
  } catch (err) {
    // Fall back to simulated data on any error
    return Response.json(getSimulatedComps(cardName, grade));
  }
}

function getSimulatedComps(cardName, grade) {
  const base = 80 + Math.floor(Math.random() * 80);
  const comps = Array.from({ length: 6 }, (_, i) => {
    const daysAgo = (i + 1) * 12;
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      title: `Garbage Pail Kids ${cardName} ${grade || "Raw"}`,
      price: base - i * 4 + Math.floor(Math.random() * 10),
      currency: "USD",
      date: d.toISOString().split("T")[0],
      platform: i % 2 === 0 ? "eBay" : "ALT",
      condition: grade || "Ungraded",
      url: "#",
    };
  });

  const prices = comps.map((c) => c.price);
  return {
    query: `Garbage Pail Kids ${cardName}`,
    comps,
    stats: {
      count: prices.length,
      average: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
      high: Math.max(...prices),
      low: Math.min(...prices),
      note: "Simulated data — connect eBay API for live comps",
    },
  };
}