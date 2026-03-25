import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("offers")
    .select(`
      id, offer_price, status, verification_status, payment_status,
      accepted_at, verification_phrase, verification_notes,
      tracking_number, tracking_carrier, created_at,
      verify_front_url, verify_back_url,
      sellers ( name, email, paypal_email ),
      cards ( name, card_number, psa_grade, psa_cert_number, finish, series, year )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ data });
}

export async function POST(request) {
  const body = await request.json();
  const { offerId, updates } = body;
  const supabase = getSupabase();
  const { error } = await supabase.from("offers").update(updates).eq("id", offerId);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ success: true });
}
