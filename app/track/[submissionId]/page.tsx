"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const CARRIERS = [
  "USPS",
  "UPS",
  "FedEx",
  "DHL",
  "Other",
];

function Spinner() {
  return <div style={{ display:"inline-block", width:20, height:20, border:"2px solid #6366f1", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Pending:   { bg:"#1c1917", color:"#a8a29e" },
    Approved:  { bg:"#14532d", color:"#86efac" },
    Flagged:   { bg:"#450a0a", color:"#fca5a5" },
    Shipped:   { bg:"#1e3a5f", color:"#93c5fd" },
    Received:  { bg:"#1e1b4b", color:"#a5b4fc" },
    Paid:      { bg:"#14532d", color:"#86efac" },
  };
  const c = colors[status] || { bg:"#1f2937", color:"#9ca3af" };
  return (
    <span style={{ padding:"2px 10px", borderRadius:9999, fontSize:12, fontWeight:600, background:c.bg, color:c.color }}>
      {status}
    </span>
  );
}

export default function TrackPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carrier, setCarrier] = useState("USPS");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    fetch(`/api/track?poNumber=${encodeURIComponent(submissionId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); }
        else {
          setSubmission(data);
          if (data.trackingNumber) setTrackingNumber(data.trackingNumber);
          if (data.trackingCarrier) setCarrier(data.trackingCarrier);
        }
      })
      .catch(() => setError("Could not load submission."))
      .finally(() => setLoading(false));
  }, [submissionId]);

  const submitTracking = async () => {
    if (!trackingNumber.trim()) { setSaveError("Please enter a tracking number."); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/save-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updateTracking: true,
          offerId: submission.offerId,
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: carrier,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaved(true);
      setSubmission((prev: any) => ({ ...prev, trackingNumber: trackingNumber.trim(), trackingCarrier: carrier }));
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "tracking_submitted",
          to: submission.sellerEmail,
          sellerName: submission.sellerName,
          sellerEmail: submission.sellerEmail,
          paypalEmail: submission.paypalEmail,
          submissionId,
          trackingNumber: trackingNumber.trim(),
          trackingCarrier: carrier,
          cardInfo: { name: submission.card, cardNumber: submission.cardNumber },
          psaData: { grade: submission.psaGrade, certNumber: submission.psaCert },
          offer: { offerPrice: submission.offerPrice },
        }),
      });
    } catch (err: any) {
      setSaveError("Failed to save tracking: " + err.message);
    }
    setSaving(false);
  };

  const wrap: React.CSSProperties = { fontFamily:"'Segoe UI',sans-serif", minHeight:"100vh", background:"#030712", color:"#fff", paddingBottom:40 };
  const cardBox: React.CSSProperties = { background:"#111827", borderRadius:12, padding:16, border:"1px solid #1f2937", marginBottom:16 };
  const inp: React.CSSProperties = { width:"100%", background:"#1f2937", border:"1px solid #374151", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:15, boxSizing:"border-box" };
  const inner: React.CSSProperties = { maxWidth:520, margin:"0 auto", padding:"0 16px" };

  return (
    <div style={wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;} input,select,button{font-family:'Segoe UI',sans-serif;}`}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(to right,#4a1942,#1f1035,#030712)", borderBottom:"1px solid #2d1b4e", padding:"14px 16px", marginBottom:28 }}>
        <div style={{ maxWidth:520, margin:"0 auto", display:"flex", alignItems:"center", gap:10 }}>
          <a href="/" style={{ textDecoration:"none" }}>
            <span style={{ fontSize:26 }}>🗒️</span>
          </a>
          <div>
            <h1 style={{ margin:0, fontSize:18, fontWeight:900, lineHeight:1.2 }}>GPK <span style={{ color:"#ec4899" }}>BuyBack</span></h1>
            <p style={{ margin:0, color:"#6b7280", fontSize:11 }}>Shipment Tracking</p>
          </div>
        </div>
      </div>

      <div style={inner}>

        {loading && (
          <div style={{ textAlign:"center", padding:40 }}>
            <Spinner />
            <p style={{ color:"#6b7280", marginTop:12 }}>Loading submission...</p>
          </div>
        )}

        {error && (
          <div style={{ background:"#450a0a", border:"1px solid #ef4444", borderRadius:12, padding:20, textAlign:"center" }}>
            <p style={{ fontSize:32, margin:"0 0 8px" }}>🔍</p>
            <h2 style={{ margin:"0 0 8px", color:"#f87171" }}>Submission Not Found</h2>
            <p style={{ color:"#fca5a5", fontSize:14, margin:"0 0 16px" }}>{error}</p>
            <a href="/" style={{ color:"#ec4899", fontSize:14 }}>← Back to GPK BuyBack</a>
          </div>
        )}

        {submission && !loading && (
          <>
            {/* Submission summary */}
            <div style={{ textAlign:"center", marginBottom:20 }}>
              <p style={{ margin:"0 0 4px", color:"#6b7280", fontSize:13 }}>Submission</p>
              <h2 style={{ margin:"0 0 4px", fontSize:22, fontFamily:"monospace", color:"#a5b4fc" }}>{submissionId}</h2>
              <p style={{ margin:0, color:"#9ca3af", fontSize:14 }}>Hi <strong style={{ color:"#fff" }}>{submission.sellerName}</strong> 👋</p>
            </div>

            <div style={cardBox}>
              <p style={{ margin:"0 0 10px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>📇 Card Details</p>
              {([
                ["Card", submission.card],
                ["PSA Grade", submission.psaGrade],
                ["PSA Cert #", submission.psaCert],
                ["Offer", `$${submission.offerPrice}`],
              ] as [string,string][]).map(([k,v]) => v && (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"6px 0", borderBottom:"1px solid #1f2937" }}>
                  <span style={{ color:"#6b7280" }}>{k}</span>
                  <span style={{ color:"#fff", fontWeight:600 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={cardBox}>
              <p style={{ margin:"0 0 12px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>📊 Status</p>
              {([
                ["Verification", submission.verificationStatus],
                ["Payment", submission.paymentStatus],
                ["Tracking", submission.trackingNumber ? "Submitted" : "Awaiting"],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:13, padding:"7px 0", borderBottom:"1px solid #1f2937" }}>
                  <span style={{ color:"#6b7280" }}>{k}</span>
                  <StatusBadge status={v} />
                </div>
              ))}
            </div>

            {/* Existing tracking */}
            {submission.trackingNumber && (
              <div style={{ ...cardBox, background:"#0a2a1a", border:"1px solid #166534" }}>
                <p style={{ margin:"0 0 8px", color:"#4ade80", fontSize:13, fontWeight:700 }}>✅ Tracking Submitted</p>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:14 }}>
                  <span style={{ color:"#6b7280" }}>Carrier</span>
                  <span style={{ color:"#fff", fontWeight:600 }}>{submission.trackingCarrier}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, marginTop:6 }}>
                  <span style={{ color:"#6b7280" }}>Tracking #</span>
                  <span style={{ color:"#fff", fontWeight:600, fontFamily:"monospace" }}>{submission.trackingNumber}</span>
                </div>
                <p style={{ margin:"10px 0 0", color:"#86efac", fontSize:12 }}>You can update your tracking number below if needed.</p>
              </div>
            )}

            {/* Tracking form */}
            {!saved ? (
              <div style={{ ...cardBox, border:"1px solid rgba(99,102,241,0.4)" }}>
                <p style={{ margin:"0 0 4px", color:"#a5b4fc", fontSize:14, fontWeight:700 }}>📬 {submission.trackingNumber ? "Update" : "Enter"} Tracking Number</p>
                <p style={{ margin:"0 0 14px", color:"#6b7280", fontSize:13 }}>Once you've shipped your card, enter the tracking number below so we can monitor delivery.</p>

                <div style={{ marginBottom:10 }}>
                  <label style={{ color:"#9ca3af", fontSize:12, display:"block", marginBottom:6 }}>Carrier</label>
                  <select
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    style={{ ...inp, appearance:"none" }}
                  >
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ color:"#9ca3af", fontSize:12, display:"block", marginBottom:6 }}>Tracking Number</label>
                  <input
                    style={{ ...inp, fontFamily:"monospace", letterSpacing:1 }}
                    value={trackingNumber}
                    onChange={e => { setTrackingNumber(e.target.value); setSaveError(null); setSaved(false); }}
                    placeholder="e.g. 9400111899223456789012"
                  />
                </div>

                {saveError && <p style={{ margin:"0 0 10px", color:"#f87171", fontSize:13 }}>⚠️ {saveError}</p>}

                <button
                  onClick={submitTracking}
                  disabled={saving || !trackingNumber.trim()}
                  style={{ width:"100%", padding:"13px 0", borderRadius:10, background: saving || !trackingNumber.trim() ? "#374151" : "linear-gradient(to right,#6366f1,#a855f7)", color:"#fff", fontWeight:"bold", fontSize:15, border:"none", cursor: saving || !trackingNumber.trim() ? "not-allowed" : "pointer", opacity: saving || !trackingNumber.trim() ? 0.5 : 1 }}
                >
                  {saving ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner /> Saving...</span> : "📦 Submit Tracking Number"}
                </button>
              </div>
            ) : (
              <div style={{ ...cardBox, background:"#0a2a1a", border:"1px solid #166534", textAlign:"center" }}>
                <p style={{ fontSize:40, margin:"0 0 8px" }}>🎉</p>
                <h3 style={{ margin:"0 0 6px", color:"#4ade80" }}>Tracking Submitted!</h3>
                <p style={{ margin:"0 0 4px", color:"#86efac", fontSize:14 }}>{carrier}: <strong style={{ fontFamily:"monospace" }}>{trackingNumber}</strong></p>
                <p style={{ margin:"10px 0 0", color:"#6b7280", fontSize:13 }}>We'll monitor your shipment and send your remaining payment within 24-48 hours of receiving your card.</p>
                <button onClick={() => setSaved(false)} style={{ marginTop:14, padding:"8px 20px", borderRadius:8, background:"#1f2937", color:"#9ca3af", border:"none", cursor:"pointer", fontSize:13 }}>Update Tracking</button>
              </div>
            )}

            {/* Shipping reminder */}
            {!submission.trackingNumber && (
              <div style={{ ...cardBox, background:"#1c1917", border:"1px solid #44403c" }}>
                <p style={{ margin:"0 0 8px", color:"#d6d3d1", fontSize:13, fontWeight:600 }}>📦 Shipping Reminder</p>
                <p style={{ margin:"0 0 6px", color:"#a8a29e", fontSize:13 }}>Ship your card using: <strong style={{ color:"#fff" }}>{submission.shippingOption || "USPS First Class"}</strong></p>
                <p style={{ margin:0, color:"#f97316", fontSize:12, fontWeight:600 }}>⚠️ Write <strong>{submissionId}</strong> on the outside of your package</p>
              </div>
            )}

            <div style={{ textAlign:"center", marginTop:8 }}>
              <a href="/" style={{ color:"#6b7280", fontSize:13, textDecoration:"none" }}>← Submit another card</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
