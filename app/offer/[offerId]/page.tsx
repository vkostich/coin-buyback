"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function ResumePage() {
  const params = useParams();
  const offerId = params?.offerId as string;
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offerId) return;
    fetch(`/api/resume?offerId=${offerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setOffer(data);
        setLoading(false);
      })
      .catch(() => { setError("Could not load offer."); setLoading(false); });
  }, [offerId]);

  const wrap: React.CSSProperties = { fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: "#030712", color: "#fff", padding: "0 0 32px" };

  if (loading) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #ec4899", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
        <p style={{ color: "#6b7280" }}>Loading your offer...</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <p style={{ fontSize: 48, margin: "0 0 12px" }}>😕</p>
        <h2 style={{ margin: "0 0 8px" }}>Offer Not Found</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>{error}</p>
        <a href="/" style={{ display: "inline-block", marginTop: 16, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(to right,#ec4899,#a855f7)", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>Submit a New Card</a>
      </div>
    </div>
  );

  if (offer?.expired) return (
    <div style={{ ...wrap, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
        <p style={{ fontSize: 48, margin: "0 0 12px" }}>⏰</p>
        <h2 style={{ margin: "0 0 8px", color: "#f97316" }}>Offer Expired</h2>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 8 }}>This offer for <strong style={{ color: "#fff" }}>{offer.cardName}</strong> expired on {new Date(offer.expiresAt).toLocaleDateString()}.</p>
        <p style={{ color: "#6b7280", fontSize: 13 }}>You're welcome to submit the card again for a fresh offer.</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, padding: "12px 24px", borderRadius: 10, background: "linear-gradient(to right,#ec4899,#a855f7)", color: "#fff", fontWeight: "bold", textDecoration: "none" }}>Submit Again →</a>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;}`}</style>

      <div style={{ background: "linear-gradient(to right,#4a1942,#1f1035)", borderBottom: "1px solid #2d1b4e", padding: "14px 16px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>🗒️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900 }}>GPK <span style={{ color: "#ec4899" }}>BuyBack</span></h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: 11 }}>Resume Your Offer</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: "24px auto", padding: "0 16px" }}>
        <div style={{ background: "#1e1b4b", border: "1px solid #6366f1", borderRadius: 10, padding: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>👋</span>
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Welcome back! Your offer is still available.</p>
            <p style={{ margin: "3px 0 0", color: "#a5b4fc", fontSize: 12 }}>
              Expires {new Date(offer.expiresAt).toLocaleDateString()} at {new Date(offer.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div style={{ background: "#111827", borderRadius: 12, border: "1px solid rgba(234,179,8,0.4)", padding: 20, marginBottom: 16, textAlign: "center" }}>
          <p style={{ margin: "0 0 4px", color: "#9ca3af", fontSize: 13 }}>Your offer for</p>
          <p style={{ margin: "0 0 8px", color: "#ec4899", fontWeight: 900, fontSize: 18 }}>{offer.cardName}</p>
          <p style={{ margin: "0 0 6px", fontSize: 52, fontWeight: 900, color: "#eab308", lineHeight: 1 }}>${offer.offerPrice}</p>
          <p style={{ margin: "0 0 10px", color: "#6b7280", fontSize: 12 }}>Fair Market Value: <span style={{ color: "#9ca3af" }}>${offer.fairMarketValue}</span></p>
          <span style={{ fontSize: 11, padding: "2px 10px", borderRadius: 9999, background: "#1e1b4b", color: "#a5b4fc" }}>
            {offer.offerPrice < 100 ? "50% upfront · 50% on receipt" : "25% upfront · 75% on receipt"}
          </span>
        </div>

        <div style={{ background: "#111827", borderRadius: 10, border: "1px solid #1f2937", padding: 14, marginBottom: 16, fontSize: 13 }}>
          {[["Card", offer.cardName], ["PSA Grade", offer.psaGrade], ["PSA Cert #", offer.psaCert], ["Offer ID", offerId]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #1f2937" }}>
              <span style={{ color: "#6b7280" }}>{k}</span>
              <span style={{ color: "#fff", fontWeight: 600, fontFamily: k === "Offer ID" ? "monospace" : undefined, fontSize: k === "Offer ID" ? 11 : undefined }}>{v}</span>
            </div>
          ))}
        </div>

        <p style={{ color: "#6b7280", fontSize: 13, textAlign: "center", marginBottom: 16 }}>
          Ready to accept? Click below to go to the full offer page and complete your submission.
        </p>

        <a href={`/?resumeOffer=${offerId}`} style={{ display: "block", textAlign: "center", padding: "14px 0", borderRadius: 10, background: "linear-gradient(to right,#ec4899,#eab308)", color: "#fff", fontWeight: "bold", fontSize: 16, textDecoration: "none" }}>
          Accept This Offer →
        </a>

        <a href="/" style={{ display: "block", textAlign: "center", padding: "10px 0", color: "#6b7280", fontSize: 13, textDecoration: "none", marginTop: 10 }}>
          Start a new submission instead
        </a>
      </div>
    </div>
  );
}
