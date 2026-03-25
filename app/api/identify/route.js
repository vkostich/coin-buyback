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
        `This image shows a PSA graded trading card in a plastic slab. 
Look carefully at the PSA label on the slab — it contains a certification number.
PSA cert numbers are 7-9 digits long (older slabs 7-8 digits, newer slabs 9 digits).
PSA labels typically show "CERT #" followed by the number.
Return ONLY the digits of the cert number. If not found, return NULL.`,

        `Examine this image very carefully for a PSA grading slab.
Look at ALL labels, text, barcodes, and fine print anywhere on the PSA case.
The certification number may appear as:
- 7, 8, or 9 consecutive digits anywhere on the label
- After the text "CERT", "CERT #", "CERT NO", "CERTIFICATION"
- Below a barcode on the PSA label
- On the bottom or top label of the slab
Return ONLY the cert number digits (7-9 digits). If truly not found, return NULL.`,

        `This is a PSA graded trading card slab. I need you to read the small text on the label.
The PSA label is usually red/white at the top or bottom of the slab.
It contains: card name, grade (like PSA 10), year, set name, and a CERT number.
The cert number is 7-9 digits — look for it carefully.
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
      console.log("Querying PSA for cert:", certNumber);
      try {
        const psaRes = await fetch(
          `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
          { headers: { Authorization: `bearer ${process.env.PSA_API_TOKEN}` } }
        );
        if (psaRes.ok) {
          const psaJson = await psaRes.json();
          const cert = psaJson.PSACert;
          if (cert) {
            psaData = {
              certNumber: cert.CertNumber,
              cardName: cert.Subject,
              year: cert.Year,
              brand: cert.Brand,
              series: cert.CardSet,
              cardNumber: cert.CardNumber,
              variety: cert.Variety,
              grade: cert.CardGrade,
              gradeDescription: cert.GradeDescription,
              populationHigher: cert.PopulationHigher,
              totalPopulation: cert.TotalPopulation,
            };
            console.log("=== PSA DATA ===");
            console.log("Card Name:", psaData.cardName);
            console.log("Grade:", psaData.grade);
            console.log("Variety:", psaData.variety);
            console.log("Full PSACert:", JSON.stringify(cert, null, 2));
            console.log("===============");
          }
        }
      } catch (e) {
        console.log("PSA query failed:", e.message);
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
              { type: "text", text: `PSA cert #${psaData.certNumber} is for: "${psaData.cardName}", Year: ${psaData.year}, Set: ${psaData.series}, Card #: ${psaData.cardNumber}, Grade: ${psaData.grade}. Does the card in this image match? Return ONLY valid JSON: { "match": true or false, "confidence": "High/Medium/Low", "reason": "brief explanation" }` }
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
            message: `The photo does not appear to match cert #${psaData.certNumber} (${psaData.cardName}). Please check that you've uploaded the correct card image.`,
            psaCert: psaData.certNumber,
            psaCard: psaData.cardName,
            reason: matchResult.reason,
          }, { status: 422 });
        }
      } catch (e) {
        console.log("Match check failed, continuing:", e.message);
      }
    }

    const varietyStr = (psaData?.variety || psaData?.gradeDescription || "").toLowerCase();
    const isGlossy = varietyStr.includes("gloss") || varietyStr.includes("os-g") || varietyStr.includes("glossy");
    console.log("Variety string:", varietyStr);
    console.log("Is glossy (from PSA):", isGlossy);

    const content = [];
    if (imageBase64) {
      content.push({ type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } });
    }
    content.push({
      type: "text",
      text: `You are the world's foremost Garbage Pail Kids card expert with complete knowledge of every GPK card ever made.

${psaData ? `PSA CERT DATA (treat as authoritative):
- Card Name: ${psaData.cardName}
- Year: ${psaData.year}
- Set: ${psaData.series}
- Card Number: ${psaData.cardNumber}
- Grade: ${psaData.grade}
- Grade Description: ${psaData.gradeDescription || ""}
- Variety: ${psaData.variety || "Standard"}
- PSA Cert: ${psaData.certNumber}

Use the PSA grade description for the condition field (e.g. PSA 10 = "Gem Mint", PSA 9 = "Mint", PSA 8 = "Near Mint-Mint", PSA 7 = "Near Mint", PSA 6 = "Excellent-Mint", PSA 5 = "Excellent", PSA 4 = "Very Good-Excellent", PSA 3 = "Very Good", PSA 2 = "Good", PSA 1 = "Poor").
Set estimatedGrade to match PSA grade exactly (e.g. "PSA 10").` : certNumber ? `PSA Cert Number: ${certNumber}` : "No PSA data available."}

FINISH DETERMINATION (very important):
${isGlossy
  ? '*** PSA HAS EXPLICITLY CERTIFIED THIS AS GLOSSY. Set finish to "Glossy" and finishSource to "PSA". Do NOT override this with visual inspection. ***'
  : psaData
    ? 'PSA data is present but does NOT indicate glossy — set finish to "Matte" and finishSource to "PSA".'
    : `No PSA data. Examine the card surface carefully:
- GLOSSY cards: shiny, reflective surface, light reflects off the surface like a mirror, colors appear vivid and saturated
- MATTE cards: flat, non-reflective, dull surface, colors appear more subdued
- Look for light reflections, sheen, or shine on the card surface
- When in doubt, lean toward Glossy if there is ANY reflectivity visible
Set finishSource to "Visual".`
}

Analyze this card and return ONLY valid JSON with no markdown or backticks:
{
  "name": "character name",
  "series": "e.g. Series 1",
  "year": "e.g. 1985",
  "cardNumber": "e.g. 8a",
  "variant": "a or b",
  "condition": "Mint / Near Mint / Excellent / Very Good / Good / Poor",
  "estimatedGrade": "e.g. PSA 8",
  "finish": "Glossy or Matte",
  "finishSource": "PSA or Visual",
  "setName": "official set name",
  "manufacturer": "Topps",
  "notes": "observations about the card",
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

    console.log("Final finish:", cardInfo.finish, "source:", cardInfo.finishSource);

    return Response.json({ ...cardInfo, psaData: psaData || null, extractedCert: certNumber || null });

  } catch (err) {
    console.error("IDENTIFY ERROR:", err);
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}