export async function POST(request) {
  try {
    const { imageBase64, mimeType = "image/jpeg", serialNumber } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY in .env.local" }, { status: 500 });
    }

    let certNumber = serialNumber;
    if (!certNumber && imageBase64) {
      console.log("No cert provided — attempting to extract from image...");

      const extractPrompts = [
        `This image shows a PCGS graded coin in a plastic slab.
Look carefully at the PCGS label on the slab — it contains a certification number.
PCGS cert numbers are 7-8 digits long.
PCGS labels typically show the cert number near the barcode.
Return ONLY the digits of the cert number. If not found, return NULL.`,

        `Examine this image very carefully for a PCGS grading slab.
Look at ALL labels, text, barcodes, and fine print anywhere on the PCGS case.
The certification number may appear as:
- 7 or 8 consecutive digits anywhere on the label
- After the text "CERT", "CERT #", "CERT NO", "CERTIFICATION"
- Below a barcode on the PCGS label
- On the bottom or top label of the slab
Return ONLY the cert number digits (7-8 digits). If truly not found, return NULL.`,

        `This is a PCGS graded coin slab. I need you to read the small text on the label.
The PCGS label is usually blue at the top or bottom of the slab.
It contains: coin name, grade (like MS65), year, denomination, and a CERT number.
The cert number is 7-8 digits — look for it carefully.
Even if the image is slightly blurry, try to read the numbers.
Return ONLY the cert number digits. Return NULL only if completely unreadable.`,
      ];

      for (let i = 0; i < extractPrompts.length; i++) {
        try {
          console.log(`Cert extraction attempt ${i + 1}...`);
          const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 100,
              messages: [{ role: "user", content: [
                { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
                { type: "text", text: extractPrompts[i] }
              ]}]
            }),
          });
          const extractData = await extractRes.json();
          const raw = extractData.content?.map(i => i.text || "").join("").trim();
          // Strip everything except digits, then take first 9
          const extracted = raw.replace(/[^\d]/g, "").slice(0, 9);
          console.log(`Attempt ${i + 1} result:`, extracted);
          if (extracted && /^\d{7,9}$/.test(extracted)) {
            certNumber = extracted;
            console.log("✅ Cert number found on attempt", i + 1, ":", certNumber);
            break;
          }
        } catch (e) {
          console.log(`Cert extraction attempt ${i + 1} failed:`, e.message);
        }
      }

      if (!certNumber) {
        console.log("❌ Could not extract cert number from image after 3 attempts.");
      }
    }

    let psaData = null;
    if (certNumber) {
      console.log("Querying PCGS for cert:", certNumber);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://coin-buyback.vercel.app';
        const pcgsRes = await fetch(
          `${baseUrl}/api/pcgs?certNo=${certNumber}`
        );
        if (pcgsRes.ok) {
          const pcgsJson = await pcgsRes.json();
          if (pcgsJson.isValidRequest) {
            psaData = {
              certNo: pcgsJson.certNo,
              coinName: pcgsJson.coinName,
              year: pcgsJson.year,
              denomination: pcgsJson.denomination,
              mintMark: pcgsJson.mintMark,
              grade: pcgsJson.grade,
              designation: pcgsJson.designation,
              variety: pcgsJson.variety,
              priceGuide: pcgsJson.priceGuide,
              population: pcgsJson.population,
              populationHigher: pcgsJson.populationHigher,
              soldRecords: pcgsJson.soldRecords,
            };
            console.log("=== PCGS DATA ===");
            console.log("Coin Name:", psaData.coinName);
            console.log("Grade:", psaData.grade);
            console.log("================");
          }
        }
      } catch (e) {
        console.log("PCGS query failed:", e.message);
      }
    }

    if (imageBase64 && psaData) {
      console.log("Verifying image matches PSA cert...");
      try {
        const matchRes = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 200,
            messages: [{ role: "user", content: [
              { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
              { type: "text", text: `PCGS cert #${psaData.certNo} is for: "${psaData.coinName}", Year: ${psaData.year}, Denomination: ${psaData.denomination}, Grade: ${psaData.grade}. Does the coin in this image match? Return ONLY valid JSON: { "match": true or false, "confidence": "High/Medium/Low", "reason": "brief explanation" }` }
            ]}]
          }),
        });
        const matchData = await matchRes.json();
        const matchText = matchData.content?.map(i => i.text || "").join("").trim();
        const matchResult = JSON.parse(matchText.replace(/```json|```/g, "").trim());
        console.log("Match result:", matchResult);
        if (!matchResult.match && matchResult.confidence !== "Low") {
          return Response.json({
            error: "mismatch",
            message: `The photo does not appear to match cert #${psaData.certNo} (${psaData.coinName}). Please check that you've uploaded the correct coin image.`,
            psaCert: psaData.certNo,
            psaCard: psaData.coinName,
            reason: matchResult.reason,
          }, { status: 422 });
        }
      } catch (e) {
        console.log("Match check failed, continuing:", e.message);
      }
    }

    const varietyStr = (psaData?.variety || psaData?.designation || "").toLowerCase();
    console.log("Variety string:", varietyStr);

    const content = [];
    if (imageBase64) {
      content.push({ type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } });
    }
    content.push({
      type: "text",
      text: `You are the world's foremost expert on PCGS-graded coins with complete knowledge of US and world coinage.

${psaData ? `PCGS CERT DATA (treat as authoritative):
- Coin Name: ${psaData.coinName}
- Year: ${psaData.year}
- Denomination: ${psaData.denomination}
- Mint Mark: ${psaData.mintMark || "None"}
- Grade: ${psaData.grade}
- Designation: ${psaData.designation || ""}
- Variety: ${psaData.variety || ""}
- PCGS Cert: ${psaData.certNo}

Set estimatedGrade to match PCGS grade exactly (e.g. "MS65", "PR70DCAM").` : certNumber ? `PCGS Cert Number: ${certNumber}` : "No PCGS data available."}

SLAB VERIFICATION:
Examine the slab carefully:
- Confirm the label color (PCGS blue = standard, green = Secure Plus, gold = First Strike or special)
- Check for any slab cracking, tampering, or insert switching
- Confirm cert number on slab matches the cert number provided
- Flag any discrepancy between the coin visible and the label description

Analyze this card and return ONLY valid JSON with no markdown or backticks:
{
  "coinName": "e.g. 1921-S Morgan Dollar",
  "year": "e.g. 1921",
  "denomination": "e.g. Morgan Dollar",
  "mintMark": "e.g. S, D, O, CC or None",
  "grade": "e.g. MS65, PR70DCAM",
  "designation": "e.g. DCAM, RD, CAM or empty",
  "variety": "e.g. VAM-4 or empty",
  "gradingService": "PCGS",
  "labelType": "e.g. Blue, Green, Gold",
  "slabIntegrity": "Intact or Compromised",
  "notes": "any observations about the coin or slab",
  "confidence": "High / Medium / Low"
}`,
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content }] }),
    });

    const rawText = await res.text();
    console.log("Anthropic response status:", res.status);
    if (!res.ok) return Response.json({ error: `Anthropic API error ${res.status}`, detail: rawText }, { status: 500 });

    const data = JSON.parse(rawText);
    const text = data.content.map(i => i.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    const cardInfo = JSON.parse(clean);

    console.log("Coin identified:", cardInfo.coinName, "Grade:", cardInfo.grade);

    return Response.json({ ...cardInfo, psaData: psaData || null, extractedCert: certNumber || null, soldRecords: psaData?.soldRecords || [], priceGuide: psaData?.priceGuide || null });

  } catch (err) {
    console.error("IDENTIFY ERROR:", err);
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}