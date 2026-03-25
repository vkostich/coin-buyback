export async function POST(request) {
  try {
    const { cardInfo, comps, psaData } = await request.json();

    if (!cardInfo) {
      return Response.json({ error: "No card info provided" }, { status: 400 });
    }

    const prompt = `You are an expert Garbage Pail Kids card buyer for a professional buying platform. Your job is to generate a fair but profitable buy offer.

CARD DETAILS:
${JSON.stringify(cardInfo, null, 2)}

${psaData ? `PSA CERTIFICATION DATA:\n${JSON.stringify(psaData, null, 2)}` : "No PSA data available - raw/ungraded card."}

RECENT SOLD COMPS:
${JSON.stringify(comps, null, 2)}

PRICING INSTRUCTIONS:
- Analyze the comp data carefully (recency, condition match, platform)
- Factor in: sales velocity, scarcity of this card/grade, current market desirability
- Your offer should be 60-75% of fair market value (we need margin to resell profitably)
- For PSA 9-10: premium cards, be competitive (70-75% of FMV)
- For PSA 7-8: solid cards, standard margin (65-70% of FMV)
- For raw/ungraded: account for grading cost ~$50-100, be conservative (55-65% of FMV)
- Series 1-3 cards command premium vs later series
- Consider population report if available (lower pop = higher scarcity premium)

Return ONLY valid JSON with no markdown or backticks:
{
  "offerPrice": 125,
  "fairMarketValue": 175,
  "marginPercent": 71,
  "reasoning": "2-3 sentence explanation of how you arrived at this price",
  "velocityScore": 7,
  "scarcityScore": 8,
  "desirabilityScore": 9,
  "conditionPremium": 10,
  "confidenceLevel": "High",
  "priceRange": { "low": 110, "high": 140 },
  "keyFactors": ["factor 1", "factor 2", "factor 3"],
  "shippingOptions": [
    { "label": "USPS First Class", "cost": 4.99, "ourCost": 3.49, "profit": 1.50 },
    { "label": "USPS Priority Mail", "cost": 8.99, "ourCost": 6.99, "profit": 2.00 },
    { "label": "UPS Ground", "cost": 11.99, "ourCost": 9.49, "profit": 2.50 }
  ]
}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      return Response.json({ error: "Claude API error", detail: err }, { status: 500 });
    }

    const data = await res.json();
    const text = data.content.map((i) => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const offer = JSON.parse(clean);

    return Response.json(offer);
  } catch (err) {
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}
