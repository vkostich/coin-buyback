"use client";
import { useState, useEffect } from "react";

const ADMIN_PASSWORD = "gpkadmin2026";

function Spinner() {
  return <div style={{ display:"inline-block", width:18, height:18, border:"2px solid #ec4899", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "#374151", Accepted: "#1e3a5f", Expired: "#451a03", Rescinded: "#450a0a",
    Approved: "#14532d", Flagged: "#451a03", "Upfront Sent": "#1e1b4b", Complete: "#14532d",
  };
  const textColors: Record<string, string> = {
    Pending: "#9ca3af", Accepted: "#93c5fd", Expired: "#fdba74", Rescinded: "#fca5a5",
    Approved: "#86efac", Flagged: "#fdba74", "Upfront Sent": "#a5b4fc", Complete: "#86efac",
  };
  return (
    <span style={{ background: colors[status] || "#374151", color: textColors[status] || "#9ca3af", padding:"2px 8px", borderRadius:9999, fontSize:11, fontWeight:600 }}>
      {status}
    </span>
  );
}

export default function AdminDash() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      const json = await res.json();
      if (json.data) setSubmissions(json.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (authed) loadSubmissions();
  }, [authed]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) { setAuthed(true); setPwError(false); }
    else setPwError(true);
  };

  const updateOffer = async (offerId: string, updates: Record<string, any>) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId, updates }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Updated successfully");
        await loadSubmissions();
        if (selected?.id === offerId) setSelected((prev: any) => ({ ...prev, ...updates }));
      } else {
        showToast("Error: " + json.error);
      }
    } catch (err: any) {
      showToast("Error: " + err.message);
    }
    setActionLoading(false);
  };

  const approveVerification = async (offer: any) => {
    await updateOffer(offer.id, { verification_status: "Approved" });
    const seller = Array.isArray(offer.sellers) ? offer.sellers[0] : offer.sellers;
    const card = Array.isArray(offer.cards) ? offer.cards[0] : offer.cards;
    await fetch("/api/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "verification_approved",
        to: seller?.email,
        sellerName: seller?.name,
        sellerEmail: seller?.email,
        paypalEmail: seller?.paypal_email,
        cardInfo: { name: card?.name, cardNumber: card?.card_number },
        psaData: { grade: card?.psa_grade, certNumber: card?.psa_cert_number },
        offer: { offerPrice: offer.offer_price },
        submissionId: offer.id.split("-")[0].toUpperCase(),
          phrase: offer.verification_phrase,
      }),
    });
    showToast("Verification approved & email sent");
  };

  const flagVerification = async (offerId: string) => {
    await updateOffer(offerId, { verification_status: "Flagged" });
  };

  const markUpfrontSent = async (offer: any) => {
    await updateOffer(offer.id, { payment_status: "Upfront Sent" });
    const upfront = offer.offer_price < 100 ? (offer.offer_price * 0.5).toFixed(2) : (offer.offer_price * 0.25).toFixed(2);
    showToast(`Marked upfront $${upfront} as sent`);
  };

  const markComplete = async (offerId: string) => {
    await updateOffer(offerId, { payment_status: "Complete", status: "Complete" });
  };

  const filtered = submissions.filter(s => {
    if (filter === "all") return true;
    if (filter === "pending_verification") return s.verification_status === "Pending";
    if (filter === "approved") return s.verification_status === "Approved";
    if (filter === "flagged") return s.verification_status === "Flagged";
    if (filter === "awaiting_payment") return s.verification_status === "Approved" && s.payment_status !== "Complete";
    return true;
  });

  if (!authed) {
    return (
      <div style={{ minHeight:"100vh", background:"#030712", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',sans-serif" }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ background:"#111827", borderRadius:12, padding:32, width:320, border:"1px solid #1f2937" }}>
          <h1 style={{ margin:"0 0 4px", fontSize:22, fontWeight:900, color:"#fff" }}>PSA <span style={{ color:"#ec4899" }}>Admin</span></h1>
          <p style={{ margin:"0 0 24px", color:"#6b7280", fontSize:13 }}>Enter your admin password</p>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} placeholder="Password"
            style={{ width:"100%", background:"#1f2937", border:`1px solid ${pwError?"#ef4444":"#374151"}`, borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:15, boxSizing:"border-box", marginBottom:12 }} />
          {pwError && <p style={{ margin:"0 0 12px", color:"#f87171", fontSize:12 }}>Incorrect password</p>}
          <button onClick={handleLogin} style={{ width:"100%", padding:"12px 0", borderRadius:10, background:"linear-gradient(to right,#9333ea,#ec4899)", color:"#fff", fontWeight:"bold", fontSize:15, border:"none", cursor:"pointer" }}>Login</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#030712", fontFamily:"'Segoe UI',sans-serif", color:"#fff" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{ position:"fixed", top:16, right:16, background:"#14532d", border:"1px solid #4ade80", borderRadius:8, padding:"10px 16px", color:"#4ade80", fontSize:14, fontWeight:600, zIndex:999 }}>
          {toast}
        </div>
      )}

      <div style={{ background:"linear-gradient(to right,#4a1942,#1f1035)", padding:"16px 24px", borderBottom:"1px solid #2d1b4e", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:900 }}>PSA <span style={{ color:"#ec4899" }}>BuyBack</span> Admin</h1>
          <p style={{ margin:0, color:"#6b7280", fontSize:12 }}>{submissions.length} total submissions</p>
        </div>
        <button onClick={loadSubmissions} style={{ background:"#1f2937", border:"1px solid #374151", borderRadius:8, padding:"8px 16px", color:"#fff", cursor:"pointer", fontSize:13 }}>
          {loading ? <Spinner /> : "Refresh"}
        </button>
      </div>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:24 }}>
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {[["all","All"],["pending_verification","Needs Verification"],["approved","Verified"],["flagged","Flagged"],["awaiting_payment","Awaiting Payment"]].map(([val,label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{ padding:"6px 14px", borderRadius:9999, fontSize:12, fontWeight:600, border:"none", cursor:"pointer", background:filter===val?"#ec4899":"#1f2937", color:filter===val?"#fff":"#9ca3af" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 1fr":"1fr", gap:16 }}>
          <div>
            {loading && <div style={{ textAlign:"center", padding:40 }}><Spinner /></div>}
            {!loading && filtered.length === 0 && (
              <div style={{ background:"#111827", borderRadius:12, padding:40, textAlign:"center", color:"#6b7280" }}>No submissions found</div>
            )}
            {filtered.map((s: any) => {
              const seller = Array.isArray(s.sellers) ? s.sellers[0] : s.sellers;
              const card = Array.isArray(s.cards) ? s.cards[0] : s.cards;
              const isSelected = selected?.id === s.id;
              return (
                <div key={s.id} onClick={() => setSelected(isSelected ? null : s)}
                  style={{ background:isSelected?"#1f2937":"#111827", borderRadius:12, padding:16, marginBottom:12, border:`1px solid ${isSelected?"#ec4899":"#1f2937"}`, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <p style={{ margin:"0 0 2px", fontWeight:700, color:"#ec4899", fontSize:15 }}>{card?.name} {card?.card_number}</p>
                      <p style={{ margin:0, color:"#9ca3af", fontSize:12 }}>{seller?.name} &middot; {seller?.email}</p>
                    </div>
                    <p style={{ margin:0, color:"#eab308", fontWeight:900, fontSize:18 }}>${s.offer_price}</p>
                  </div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    <StatusBadge status={s.status} />
                    <StatusBadge status={s.verification_status} />
                    <StatusBadge status={s.payment_status} />
                    {s.tracking_number && <span style={{ background:"#1e3a5f", color:"#93c5fd", padding:"2px 8px", borderRadius:9999, fontSize:11, fontWeight:600 }}>Tracking: {s.tracking_number}</span>}
                  </div>
                  <p style={{ margin:"8px 0 0", color:"#4b5563", fontSize:11 }}>PO-{s.id.split("-")[0].toUpperCase()} &middot; {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
              );
            })}
          </div>

          {selected && (() => {
            const seller = Array.isArray(selected.sellers) ? selected.sellers[0] : selected.sellers;
            const card = Array.isArray(selected.cards) ? selected.cards[0] : selected.cards;
            const upfront = selected.offer_price < 100 ? (selected.offer_price * 0.5).toFixed(2) : (selected.offer_price * 0.25).toFixed(2);
            const paypalLink = `https://www.paypal.com/paypalme/vkostich/${upfront}`;
            return (
              <div style={{ background:"#111827", borderRadius:12, padding:20, border:"1px solid #1f2937", alignSelf:"start", position:"sticky", top:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                  <h2 style={{ margin:0, fontSize:17, color:"#ec4899" }}>{card?.name} {card?.card_number}</h2>
                  <button onClick={() => setSelected(null)} style={{ background:"none", border:"none", color:"#6b7280", cursor:"pointer", fontSize:18 }}>&#x2715;</button>
                </div>

                <div style={{ background:"#1f2937", borderRadius:8, padding:12, marginBottom:12 }}>
                  <p style={{ margin:"0 0 8px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>SELLER</p>
                  {[["Name", seller?.name],["Email", seller?.email],["PayPal", seller?.paypal_email || "N/A"],["Submission #", `PO-${selected.id.split("-")[0].toUpperCase()}`]].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom:"1px solid #374151" }}>
                      <span style={{ color:"#6b7280" }}>{k}</span><span style={{ color:"#fff", fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background:"#1f2937", borderRadius:8, padding:12, marginBottom:12 }}>
                  <p style={{ margin:"0 0 8px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>CARD</p>
                  {[["PSA Grade", card?.psa_grade],["PSA Cert #", card?.psa_cert_number],["Finish", card?.finish],["Offer", `$${selected.offer_price}`],["Upfront", `$${upfront}`]].map(([k,v]) => (
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"4px 0", borderBottom:"1px solid #374151" }}>
                      <span style={{ color:"#6b7280" }}>{k}</span><span style={{ color:"#fff", fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {selected.verification_phrase && (
                  <div style={{ background:"#1e1b4b", borderRadius:8, padding:12, marginBottom:12, textAlign:"center" }}>
                    <p style={{ margin:"0 0 4px", color:"#a5b4fc", fontSize:11 }}>VERIFICATION PHRASE</p>
                    <p style={{ margin:0, fontSize:18, fontWeight:900, letterSpacing:3, fontFamily:"monospace", color:"#fff" }}>{selected.verification_phrase}</p>
                  </div>
                )}

                {(selected.verify_front_url || selected.verify_back_url) && (
                  <div style={{ background:"#1f2937", borderRadius:8, padding:12, marginBottom:12 }}>
                    <p style={{ margin:"0 0 10px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>VERIFICATION PHOTOS</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                      {selected.verify_front_url && (
                        <div>
                          <p style={{ margin:"0 0 4px", color:"#6b7280", fontSize:11 }}>FRONT</p>
                          <a href={selected.verify_front_url} target="_blank" rel="noreferrer">
                            <img src={selected.verify_front_url} alt="front" style={{ width:"100%", borderRadius:6, objectFit:"cover", maxHeight:120, border:"1px solid #374151" }} />
                          </a>
                        </div>
                      )}
                      {selected.verify_back_url && (
                        <div>
                          <p style={{ margin:"0 0 4px", color:"#6b7280", fontSize:11 }}>BACK</p>
                          <a href={selected.verify_back_url} target="_blank" rel="noreferrer">
                            <img src={selected.verify_back_url} alt="back" style={{ width:"100%", borderRadius:6, objectFit:"cover", maxHeight:120, border:"1px solid #374151" }} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}"Analyzing photos..."

                {selected.tracking_number && (
                  <div style={{ background:"#1e3a5f", borderRadius:8, padding:12, marginBottom:12 }}>
                    <p style={{ margin:"0 0 4px", color:"#93c5fd", fontSize:11, fontWeight:600 }}>TRACKING</p>
                    <p style={{ margin:0, color:"#fff", fontFamily:"monospace", fontSize:13 }}>{selected.tracking_carrier}: {selected.tracking_number}</p>
                  </div>
                )}

                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {selected.verification_status === "Pending" && (
                    <>
                      <button onClick={() => approveVerification(selected)} disabled={actionLoading}
                        style={{ padding:"11px 0", borderRadius:8, background:"linear-gradient(to right,#059669,#0d9488)", color:"#fff", fontWeight:"bold", border:"none", cursor:"pointer", fontSize:14 }}>
                        {actionLoading ? <Spinner /> : "Approve Verification"}
                      </button>
                      <button onClick={() => flagVerification(selected.id)} disabled={actionLoading}
                        style={{ padding:"11px 0", borderRadius:8, background:"#7c2d12", color:"#fff", fontWeight:"bold", border:"none", cursor:"pointer", fontSize:14 }}>
                        Flag / Reject
                      </button>
                    </>
                  )}
                  {selected.verification_status === "Approved" && selected.payment_status === "Pending" && (
                    <>
                      <a href={paypalLink} target="_blank" rel="noreferrer"
                        style={{ display:"block", textAlign:"center", padding:"11px 0", borderRadius:8, background:"linear-gradient(to right,#1d4ed8,#6366f1)", color:"#fff", fontWeight:"bold", fontSize:14, textDecoration:"none" }}>
                        Send ${upfront} via PayPal
                      </a>
                      <button onClick={() => markUpfrontSent(selected)} disabled={actionLoading}
                        style={{ padding:"11px 0", borderRadius:8, background:"#1f2937", color:"#4ade80", fontWeight:"bold", border:"1px solid #4ade80", cursor:"pointer", fontSize:14 }}>
                        Mark Upfront Sent
                      </button>
                    </>
                  )}
                  {selected.payment_status === "Upfront Sent" && (
                    <>
                      <a href={`https://www.paypal.com/paypalme/vkostich/${(selected.offer_price < 100 ? (selected.offer_price * 0.5) : (selected.offer_price * 0.75)).toFixed(2)}`} target="_blank" rel="noreferrer"
                        style={{ display:"block", textAlign:"center", padding:"11px 0", borderRadius:8, background:"linear-gradient(to right,#1d4ed8,#6366f1)", color:"#fff", fontWeight:"bold", fontSize:14, textDecoration:"none" }}>
                        Send ${selected.offer_price < 100 ? (selected.offer_price * 0.5).toFixed(2) : (selected.offer_price * 0.75).toFixed(2)} Final Payment via PayPal
                      </a>
                      <button onClick={() => markComplete(selected.id)} disabled={actionLoading}
                        style={{ padding:"11px 0", borderRadius:8, background:"linear-gradient(to right,#059669,#4ade80)", color:"#fff", fontWeight:"bold", border:"none", cursor:"pointer", fontSize:14 }}>
                        Mark Complete (Final Payment Sent)
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
