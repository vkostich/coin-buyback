


import { useState, useEffect } from "react";
import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

function makeClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "#eab308", Accepted: "#6366f1", Approved: "#22c55e",
  Failed: "#ef4444", Rescinded: "#6b7280", Expired: "#4b5563",
  Completed: "#10b981", Awaiting: "#f97316", Paid: "#22c55e",
  Submitted: "#6366f1", New: "#ec4899", Contacted: "#6366f1",
  Closed: "#4b5563", Available: "#22c55e",
};

function Badge({ label }: { label: string }) {
  const color = STATUS_COLORS[label] || "#6b7280";
  return <span style={{ background: color + "22", color, border: `1px solid ${color}66`, borderRadius: 9999, padding: "2px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</span>;
}

function Spinner() {
  return <div style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #ec4899", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />;
}

function daysSince(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function DaysCell({ accepted_at, tracking_number }: { accepted_at: string; tracking_number: string | null }) {
  if (!accepted_at || tracking_number) return <span style={{ color: "#4b5563" }}>—</span>;
  const days = daysSince(accepted_at);
  const color = days >= 8 ? "#ef4444" : days >= 4 ? "#f97316" : "#eab308";
  return <span style={{ color, fontWeight: 700 }}>{days}d</span>;
}

export default function AdminDash() {
  const [client] = useState<SupabaseClient>(() => makeClient());
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("All");
  const [photoModal, setPhotoModal] = useState<string | null>(null);
  const [invTab, setInvTab] = useState<"submissions" | "inventory">("submissions");
  const [inventory, setInventory] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);
  const [showAddListing, setShowAddListing] = useState(false);
  const [newListing, setNewListing] = useState({ name: "", card_number: "", series: "", year: "", variant: "", finish: "Matte", psa_grade: "", psa_cert_number: "", asking_price: "", notes: "", front_photo_url: "", back_photo_url: "" });
  const [addingListing, setAddingListing] = useState(false);

  useEffect(() => {
    client.auth.getSession().then((res: any) => setSession(res.data.session));
    client.auth.onAuthStateChange((_e: any, s: any) => setSession(s));
  }, [client]);

  useEffect(() => { if (session) fetchSubmissions(); }, [session]);

  const login = async () => {
    setLoginLoading(true); setLoginError("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
    setLoginLoading(false);
  };

  const logout = () => client.auth.signOut();

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data } = await client.from("purchase_orders").select(`
      id, status, shipping_option, created_at,
      sellers ( name, email, paypal_email ),
      po_items (
        offers ( id, offer_price, verification_status, payment_status, tracking_number, tracking_carrier, shipping_option, accepted_at, followup_count, rescinded_at, verification_photo_url, back_photo_url ),
        cards ( name, card_number, psa_grade, psa_cert_number, finish )
      )
    `).order("created_at", { ascending: false });
    setSubmissions(data || []);
    setLoading(false);
  };

  const fetchInventory = async () => {
    setInvLoading(true);
    const [{ data: inv }, { data: inq }] = await Promise.all([
      client.from("inventory").select("*").order("created_at", { ascending: false }),
      client.from("buyer_inquiries").select("*, inventory(name, card_number)").order("created_at", { ascending: false }),
    ]);
    setInventory(inv || []);
    setInquiries(inq || []);
    setInvLoading(false);
  };

  const addListing = async () => {
    setAddingListing(true);
    await client.from("inventory").insert([{ ...newListing, asking_price: parseFloat(newListing.asking_price) }]);
    setShowAddListing(false);
    setNewListing({ name: "", card_number: "", series: "", year: "", variant: "", finish: "Matte", psa_grade: "", psa_cert_number: "", asking_price: "", notes: "", front_photo_url: "", back_photo_url: "" });
    fetchInventory();
    setAddingListing(false);
  };

  const markPaymentSent = async (offerId: string, stage: "upfront" | "final") => {
    await client.from("offers").update({ payment_status: stage === "final" ? "Completed" : "Upfront Sent" }).eq("id", offerId);
    fetchSubmissions();
  };

  const markReceived = async (offerId: string) => {
    await client.from("offers").update({ payment_status: "Received - Awaiting Final Payment" }).eq("id", offerId);
    fetchSubmissions();
  };

  const updateInquiryStatus = async (id: string, status: string) => {
    await client.from("buyer_inquiries").update({ status }).eq("id", id);
    fetchInventory();
  };

  const wrap: React.CSSProperties = { fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: "#030712", color: "#fff" };
  const inp: React.CSSProperties = { width: "100%", background: "#1f2937", border: "1px solid #374151", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 14, boxSizing: "border-box" };
  const cardBox: React.CSSProperties = { background: "#111827", borderRadius: 10, border: "1px solid #1f2937", padding: 16, marginBottom: 12 };

  if (!session) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: "#111827", borderRadius: 14, padding: 32, width: "100%", maxWidth: 380, border: "1px solid #1f2937" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 900 }}>GPK <span style={{ color: "#ec4899" }}>Admin</span></h1>
          <p style={{ color: "#6b7280", margin: 0, fontSize: 13 }}>Dashboard Access</p>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Email</label>
          <input style={{ ...inp, marginTop: 4 }} value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="admin@email.com" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#9ca3af", fontSize: 12 }}>Password</label>
          <input style={{ ...inp, marginTop: 4 }} value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="••••••••" onKeyDown={e => e.key === "Enter" && login()} />
        </div>
        {loginError && <p style={{ color: "#f87171", fontSize: 13, margin: "0 0 12px" }}>⚠️ {loginError}</p>}
        <button onClick={login} disabled={loginLoading} style={{ width: "100%", padding: "12px 0", borderRadius: 10, background: "linear-gradient(to right,#ec4899,#a855f7)", border: "none", color: "#fff", fontWeight: "bold", fontSize: 15, cursor: "pointer" }}>
          {loginLoading ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </div>
  );

  const flat = submissions.map(po => {
    const item = po.po_items?.[0];
    const offer = Array.isArray(item?.offers) ? item.offers[0] : item?.offers;
    const card = Array.isArray(item?.cards) ? item.cards[0] : item?.cards;
    const seller = Array.isArray(po.sellers) ? po.sellers[0] : po.sellers;
    return { po, offer, card, seller, poNumber: `PO-${po.id.split("-")[0].toUpperCase()}` };
  });

  const STATUS_FILTERS = ["All", "Needs Review", "Awaiting Payment", "Awaiting Tracking", "In Transit", "Completed", "Rescinded"];

  const filtered = flat.filter(({ offer }) => {
    if (filter === "All") return true;
    if (filter === "Needs Review") return offer?.verification_status === "Pending" || offer?.verification_status === "Failed";
    if (filter === "Awaiting Payment") return offer?.verification_status === "Approved" && offer?.payment_status === "Pending";
    if (filter === "Awaiting Tracking") return offer?.verification_status === "Approved" && !offer?.tracking_number;
    if (filter === "In Transit") return !!offer?.tracking_number && offer?.payment_status !== "Completed";
    if (filter === "Completed") return offer?.payment_status === "Completed";
    if (filter === "Rescinded") return !!offer?.rescinded_at;
    return true;
  });

  return (
    <div style={wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;}`}</style>

      {photoModal && (
        <div onClick={() => setPhotoModal(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.92)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <img src={photoModal} alt="verification" style={{ maxHeight: "90vh", maxWidth: "90vw", borderRadius: 12, objectFit: "contain" }} />
          <button onClick={() => setPhotoModal(null)} style={{ position: "fixed", top: 16, right: 16, background: "#1f2937", border: "none", color: "#fff", borderRadius: "50%", width: 36, height: 36, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
      )}

      <div style={{ background: "linear-gradient(to right,#4a1942,#1f1035)", borderBottom: "1px solid #2d1b4e", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🗒️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>GPK <span style={{ color: "#ec4899" }}>Admin</span></h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 11 }}>{session.user.email}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchSubmissions} style={{ background: "#1f2937", border: "1px solid #374151", color: "#9ca3af", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>↻ Refresh</button>
          <button onClick={logout} style={{ background: "none", border: "1px solid #374151", color: "#9ca3af", padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #1f2937", display: "flex" }}>
        {(["submissions", "inventory"] as const).map(t => (
          <button key={t} onClick={() => { setInvTab(t); if (t === "inventory" && inventory.length === 0) fetchInventory(); }} style={{ padding: "11px 20px", background: "none", border: "none", borderBottom: `2px solid ${invTab === t ? "#ec4899" : "transparent"}`, color: invTab === t ? "#ec4899" : "#6b7280", cursor: "pointer", fontWeight: 600, fontSize: 14, textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>

      {invTab === "submissions" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
            {STATUS_FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 14px", borderRadius: 9999, border: `1px solid ${filter === f ? "#ec4899" : "#374151"}`, background: filter === f ? "rgba(236,72,153,0.15)" : "transparent", color: filter === f ? "#ec4899" : "#6b7280", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>
                {f}{f === "All" ? ` (${flat.length})` : ""}
              </button>
            ))}
          </div>

          {loading && <div style={{ textAlign: "center", padding: 40 }}><Spinner /></div>}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  {["PO #", "Date", "Seller", "Card", "Grade", "Offer", "Verification", "Payment", "Tracking", "Days", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", color: "#6b7280", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ po, offer, card, seller, poNumber }) => (
                  <tr key={po.id} style={{ borderBottom: "1px solid #111827", cursor: "pointer" }} onClick={() => setSelected((prev: any) => prev?.po?.id === po.id ? null : { po, offer, card, seller, poNumber })}>
                    <td style={{ padding: "10px 12px", color: "#a5b4fc", fontFamily: "monospace", fontWeight: 700 }}>{poNumber}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(po.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px" }}><div style={{ fontWeight: 600 }}>{seller?.name}</div><div style={{ color: "#6b7280", fontSize: 11 }}>{seller?.email}</div></td>
                    <td style={{ padding: "10px 12px" }}>{card?.name} {card?.card_number}</td>
                    <td style={{ padding: "10px 12px", color: "#eab308", fontWeight: 700 }}>PSA {card?.psa_grade}</td>
                    <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 700 }}>${offer?.offer_price}</td>
                    <td style={{ padding: "10px 12px" }}><Badge label={offer?.verification_status || "Pending"} /></td>
                    <td style={{ padding: "10px 12px" }}><Badge label={offer?.payment_status || "Pending"} /></td>
                    <td style={{ padding: "10px 12px" }}>{offer?.tracking_number ? <span style={{ color: "#a5b4fc", fontFamily: "monospace", fontSize: 11 }}>{offer.tracking_carrier}: {offer.tracking_number}</span> : <Badge label="Awaiting" />}</td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}><DaysCell accepted_at={offer?.accepted_at} tracking_number={offer?.tracking_number} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                        {offer?.verification_photo_url && <button onClick={() => setPhotoModal(offer.verification_photo_url)} style={{ background: "#1f2937", border: "none", color: "#a5b4fc", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>📸 Front</button>}
                        {offer?.back_photo_url && <button onClick={() => setPhotoModal(offer.back_photo_url)} style={{ background: "#1f2937", border: "none", color: "#a5b4fc", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>📸 Back</button>}
                        {offer?.verification_status === "Approved" && offer?.payment_status === "Pending" && (
                          <button onClick={() => markPaymentSent(offer.id, "upfront")} style={{ background: "#166534", border: "none", color: "#4ade80", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>💸 Upfront</button>
                        )}
                        {offer?.payment_status === "Upfront Sent" && offer?.tracking_number && (
                          <button onClick={() => markReceived(offer.id)} style={{ background: "#1e3a5f", border: "none", color: "#93c5fd", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>📦 Received</button>
                        )}
                        {offer?.payment_status === "Received - Awaiting Final Payment" && (
                          <button onClick={() => markPaymentSent(offer.id, "final")} style={{ background: "#166534", border: "none", color: "#4ade80", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>✅ Complete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && !loading && <p style={{ color: "#4b5563", textAlign: "center", padding: 32 }}>No submissions match this filter.</p>}
          </div>

          {selected && (
            <div style={{ position: "fixed", right: 0, top: 0, bottom: 0, width: 360, background: "#111827", borderLeft: "1px solid #1f2937", overflowY: "auto", zIndex: 200, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, color: "#ec4899" }}>{selected.poNumber}</h3>
                <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 20 }}>✕</button>
              </div>
              {([
                ["Seller", selected.seller?.name],
                ["Email", selected.seller?.email],
                ["PayPal", selected.seller?.paypal_email],
                ["Card", `${selected.card?.name} ${selected.card?.card_number || ""}`.trim()],
                ["PSA Cert #", selected.card?.psa_cert_number],
                ["Grade", `PSA ${selected.card?.psa_grade}`],
                ["Finish", selected.card?.finish],
                ["Offer", `$${selected.offer?.offer_price}`],
                ["Verification", selected.offer?.verification_status],
                ["Payment", selected.offer?.payment_status],
                ["Tracking", selected.offer?.tracking_number ? `${selected.offer.tracking_carrier}: ${selected.offer.tracking_number}` : "None"],
                ["Days Since Accepted", selected.offer?.accepted_at && !selected.offer?.tracking_number ? `${daysSince(selected.offer.accepted_at)} days` : "—"],
                ["Follow-up Emails", String(selected.offer?.followup_count || 0)],
                ["Submitted", new Date(selected.po.created_at).toLocaleString()],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1f2937", fontSize: 13, gap: 8 }}>
                  <span style={{ color: "#6b7280", flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "#fff", fontWeight: 600, textAlign: "right", wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
              {selected.offer?.verification_photo_url && (
                <div style={{ marginTop: 16 }}>
                  <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 6px" }}>📸 Front Verification Photo</p>
                  <img src={selected.offer.verification_photo_url} alt="verify front" style={{ width: "100%", borderRadius: 8, cursor: "pointer" }} onClick={() => setPhotoModal(selected.offer.verification_photo_url)} />
                </div>
              )}
              {selected.offer?.back_photo_url && (
                <div style={{ marginTop: 12 }}>
                  <p style={{ color: "#9ca3af", fontSize: 12, margin: "0 0 6px" }}>📸 Back Verification Photo</p>
                  <img src={selected.offer.back_photo_url} alt="verify back" style={{ width: "100%", borderRadius: 8, cursor: "pointer" }} onClick={() => setPhotoModal(selected.offer.back_photo_url)} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {invTab === "inventory" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ margin: 0 }}>Inventory Listings</h2>
            <button onClick={() => setShowAddListing(true)} style={{ background: "linear-gradient(to right,#ec4899,#a855f7)", border: "none", color: "#fff", padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+ Add Listing</button>
          </div>

          {showAddListing && (
            <div style={{ ...cardBox, border: "1px solid rgba(236,72,153,0.4)", marginBottom: 20 }}>
              <h3 style={{ margin: "0 0 14px", color: "#ec4899" }}>New Listing</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {([
                  ["name", "Card Name *"], ["card_number", "Card #"], ["series", "Series"],
                  ["year", "Year"], ["variant", "Variant"], ["psa_grade", "PSA Grade"],
                  ["psa_cert_number", "PSA Cert #"], ["asking_price", "Asking Price ($)"],
                  ["front_photo_url", "Front Photo URL"], ["back_photo_url", "Back Photo URL"],
                ] as [keyof typeof newListing, string][]).map(([k, label]) => (
                  <div key={k} style={{ gridColumn: k === "front_photo_url" || k === "back_photo_url" ? "1/-1" : undefined }}>
                    <label style={{ color: "#9ca3af", fontSize: 12 }}>{label}</label>
                    <input style={{ ...inp, marginTop: 4 }} value={newListing[k]} onChange={e => setNewListing(p => ({ ...p, [k]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label style={{ color: "#9ca3af", fontSize: 12 }}>Finish</label>
                  <select style={{ ...inp, marginTop: 4 }} value={newListing.finish} onChange={e => setNewListing(p => ({ ...p, finish: e.target.value }))}>
                    <option>Matte</option><option>Glossy</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ color: "#9ca3af", fontSize: 12 }}>Notes</label>
                  <textarea style={{ ...inp, marginTop: 4, minHeight: 60, resize: "vertical" }} value={newListing.notes} onChange={e => setNewListing(p => ({ ...p, notes: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={() => setShowAddListing(false)} style={{ flex: 1, padding: "10px 0", borderRadius: 8, background: "#1f2937", border: "none", color: "#9ca3af", cursor: "pointer", fontWeight: 600 }}>Cancel</button>
                <button onClick={addListing} disabled={addingListing || !newListing.name} style={{ flex: 2, padding: "10px 0", borderRadius: 8, background: "linear-gradient(to right,#ec4899,#a855f7)", border: "none", color: "#fff", cursor: "pointer", fontWeight: 700 }}>
                  {addingListing ? "Adding..." : "Add Listing"}
                </button>
              </div>
            </div>
          )}

          {invLoading && <div style={{ textAlign: "center", padding: 40 }}><Spinner /></div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, marginBottom: 32 }}>
            {inventory.map(item => (
              <div key={item.id} style={cardBox}>
                {item.front_photo_url && <img src={item.front_photo_url} alt={item.name} style={{ width: "100%", borderRadius: 8, objectFit: "cover", aspectRatio: "3/4", marginBottom: 10 }} />}
                <h3 style={{ margin: "0 0 4px", color: "#ec4899", fontSize: 15 }}>{item.name} {item.card_number}</h3>
                <p style={{ margin: "0 0 8px", color: "#6b7280", fontSize: 12 }}>{item.series} · PSA {item.psa_grade} · {item.finish}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#eab308", fontWeight: 900, fontSize: 18 }}>${item.asking_price}</span>
                  <Badge label={item.status} />
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ margin: "0 0 14px" }}>Buyer Inquiries</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  {["Date", "Card", "Buyer", "Email", "Offer", "Message", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", color: "#6b7280", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inquiries.map(inq => (
                  <tr key={inq.id} style={{ borderBottom: "1px solid #111827" }}>
                    <td style={{ padding: "10px 12px", color: "#6b7280", whiteSpace: "nowrap" }}>{new Date(inq.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "10px 12px" }}>{inq.inventory?.name} {inq.inventory?.card_number}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>{inq.buyer_name}</td>
                    <td style={{ padding: "10px 12px", color: "#6b7280" }}>{inq.buyer_email}</td>
                    <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 700 }}>${inq.offer_price}</td>
                    <td style={{ padding: "10px 12px", color: "#9ca3af", maxWidth: 200 }}>{inq.message || "—"}</td>
                    <td style={{ padding: "10px 12px" }}><Badge label={inq.status} /></td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        {inq.status === "New" && <button onClick={() => updateInquiryStatus(inq.id, "Contacted")} style={{ background: "#1e3a5f", border: "none", color: "#93c5fd", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Contacted</button>}
                        {inq.status !== "Closed" && <button onClick={() => updateInquiryStatus(inq.id, "Closed")} style={{ background: "#1f2937", border: "none", color: "#6b7280", padding: "4px 8px", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>Close</button>}
                      </div>
                    </td>
                  </tr>
                ))}
                {inquiries.length === 0 && !invLoading && (
                  <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#4b5563" }}>No inquiries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
