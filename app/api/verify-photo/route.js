// app/api/verify-photo/route.js
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function uploadPhoto(supabase, base64, mimeType, offerId, side) {
  try {
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const filename = `verify/${offerId}/${side}.${ext}`;
    const buffer = Buffer.from(base64, "base64");
    const { error } = await supabase.storage
      .from("verification-photos")
      .upload(filename, buffer, { contentType: mimeType, upsert: true });
    if (error) {
      console.error(`Upload error (${side}):`, error);
      return null;
    }
    const { data } = supabase.storage.from("verification-photos").getPublicUrl(filename);
    return data?.publicUrl || null;
  } catch (err) {
    console.error(`Upload failed (${side}):`, err);
    return null;
  }
}

export async function POST(request) {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      backImageBase64,
      backMimeType = "image/jpeg",
      offerId,
      phrase,
      certNumber,
      cardName
    } = await request.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    if (!imageBase64) return Response.json({ error: "No image provided" }, { status: 400 });
    if (!phrase) return Response.json({ error: "No verification phrase provided" }, { status: 400 });

    // Upload photos to Supabase storage
    const supabase = getSupabase();
    let frontUrl = null;
    let backUrl = null;

    if (offerId) {
      frontUrl = await uploadPhoto(supabase, imageBase64, mimeType, offerId, "front");
      if (backImageBase64) {
        backUrl = await uploadPhoto(supabase, backImageBase64, backMimeType, offerId, "back");
      }
    }

    // Build content array for Claude - include both photos if available
    const content = [
      { type: "image", source: { type: "base64", media_type: mimeType, data: imageBase64 } },
    ];

    if (backImageBase64) {
      content.push({ type: "image", source: { type: "base64", media_type: backMimeType, data: backImageBase64 } });
    }

    content.push({
      type: "text",
      text: `You are a fraud detection expert for a trading card buying platform.
${backImageBase64 ? "You have been provided TWO images: the front and back of the graded card slab." : "You have been provided ONE image of the graded card slab."}
REQUIRED VERIFICATION CRITERIA:
1. Verification phrase: "${phrase}" - must be clearly handwritten (not printed/typed/digital) and visible in at least one photo
2. PSA cert number: "${certNumber || 'any visible cert'}" - must be visible on the grading slab label
3. Card: "${cardName || 'a graded trading card'}" - the ENTIRE graded card slab must be visible from top to bottom including the full PSA label at the top and the complete card image below it. Partial slabs are not acceptable.
4. Photos must be genuine real-world photographs
FRAUD DETECTION - check for:
- Digital manipulation or compositing
- Phrase typed/printed rather than handwritten
- Photo-of-a-screen (glare, pixel patterns, moire)
- Inconsistent lighting/shadows
- Phrase doesn't match exactly
Return ONLY valid JSON, no markdown:
{
  "approved": true or false,
  "phraseVisible": true or false,
  "phraseMatches": true or false,
  "phraseHandwritten": true or false,
  "certVisible": true or false,
  "cardPresent": true or false,
  "entireSlabVisible": true or false,
  "entireSlabVisible": true or false,
  "manipulationDetected": true or false,
  "manipulationDetails": "description or null",
  "photoOfScreen": true or false,
  "confidenceScore": 0-100,
  "failReasons": ["reasons if not approved"],
  "notes": "observations"
}`
    });

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content }],
      }),
    });

    const rawText = await res.text();
    if (!res.ok) return Response.json({ error: "AI verification failed", detail: rawText }, { status: 500 });

    const data = JSON.parse(rawText);
    const text = data.content.map(i => i.text || "").join("");
    const result = JSON.parse(text.replace(/```json|```/g, "").trim());

    const approved = result.approved &&
      result.phraseMatches &&
      result.phraseHandwritten &&
      !result.manipulationDetected &&
      !result.photoOfScreen &&
      result.entireSlabVisible !== false &&
      result.confidenceScore >= 70;

    const verification_status = approved ? 'Approved' : 'Flagged';

    if (offerId) {
      const updates = {
        verification_status,
        verification_notes: JSON.stringify(result),
      };
      if (frontUrl) updates.verify_front_url = frontUrl;
      if (backUrl) updates.verify_back_url = backUrl;

      const { error: updateError } = await supabase
        .from('offers')
        .update(updates)
        .eq('id', offerId);
      if (updateError) console.error('Supabase update failed:', updateError);
    }

    return Response.json({
      approved,
      status: verification_status,
      result,
      frontUrl,
      backUrl,
      message: approved
        ? "Verification approved! Your payment is being processed."
        : `Verification failed: ${result.failReasons?.join(", ") || "Please resubmit a clearer photo."}`,
    });
  } catch (err) {
    console.error("VERIFY PHOTO ERROR:", err);
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}
