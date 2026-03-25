"use client";
import { useState, useRef, useCallback, useEffect } from "react";

const TABS = ["Sell", "Buy"];
const SHIP_TO = { name: "Coin BuyBack", address: "XXXX Buyback Lane", city: "City, ST 00000" };

function Spinner() {
  return <div style={{ display:"inline-block", width:20, height:20, border:"2px solid #ec4899", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.7s linear infinite" }} />;
}

function ScoreBar({ label, val }: { label: string; val: number }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
        <span style={{ color:"#9ca3af" }}>{label}</span>
        <span style={{ color:"#fff", fontWeight:"bold" }}>{val}/10</span>
      </div>
      <div style={{ height:6, background:"#374151", borderRadius:9999 }}>
        <div style={{ height:6, width:`${val*10}%`, background:"linear-gradient(to right, #ec4899, #eab308)", borderRadius:9999 }} />
      </div>
    </div>
  );
}

function UploadZone({ onFile, preview, label }: { onFile: (f: File | null) => void; preview: string | null; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const handle = (e: any) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer?.files[0] || e.target.files[0];
    if (f) onFile(f);
  };
  return (
    <div>
      {preview ? (
        <div style={{ position:"relative", textAlign:"center" }}>
          <img src={preview} alt="card" style={{ maxHeight:220, maxWidth:"100%", borderRadius:12, objectFit:"contain", border:"2px solid #ec4899" }} />
          <button onClick={() => onFile(null)} style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.7)", border:"none", color:"#fff", borderRadius:"50%", width:28, height:28, cursor:"pointer", fontSize:14 }}>&#x2715;</button>
        </div>
      ) : (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={handle}
            style={{ border:`2px dashed ${drag?"#ec4899":"#4b5563"}`, borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", background:drag?"rgba(236,72,153,0.1)":"transparent", marginBottom:10 }}
          >
            <img
              src="https://sqqomyxiwvejlhidbjef.supabase.co/storage/v1/object/public/Assets/PSARetro-fotor-bg-remover-20260319222935.png"
              alt="upload"
              style={{ width:60, height:60, objectFit:"contain", display:"block", margin:"0 auto 8px", pointerEvents:"none" }}
            />
            <p style={{ color:"#d1d5db", fontWeight:600, margin:"0 0 4px", fontSize:14 }}>{label || "Drop image or tap to upload"}</p>
            <p style={{ color:"#6b7280", fontSize:12, margin:0 }}>JPG or PNG</p>
          </div>
          <button onClick={() => cameraRef.current?.click()} style={{ width:"100%", padding:"13px 0", borderRadius:10, background:"linear-gradient(to right,#1d4ed8,#7c3aed)", border:"none", color:"#fff", fontWeight:"bold", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            &#128247; Take Photo with Camera
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handle} />
          <input ref={cameraRef} type="file" accept="image/*" style={{ display:"none" }} onChange={handle} />
        </>
      )}
    </div>
  );
}

function BarcodeDisplay({ value }: { value: string }) {
  const bars = value.split("").map(c => c.charCodeAt(0));
  return (
    <div style={{ textAlign:"center", margin:"12px 0" }}>
      <div style={{ display:"inline-flex", gap:1, height:48, alignItems:"flex-end" }}>
        {bars.map((b, i) => (
          <div key={i} style={{ width: i%3===0?3:2, height: 24 + (b % 24), background:"#000", borderRadius:1 }} />
        ))}
      </div>
      <p style={{ margin:"4px 0 0", fontFamily:"monospace", fontSize:13, color:"#000", letterSpacing:2 }}>{value}</p>
    </div>
  );
}
export default function App() {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgBase64, setImgBase64] = useState<string | null>(null);
  const [imgMime, setImgMime] = useState("image/jpeg");
  const [verifyPreview, setVerifyPreview] = useState<string | null>(null);
  const [verifyBase64, setVerifyBase64] = useState<string | null>(null);
  const [verifyMime, setVerifyMime] = useState("image/jpeg");const [verifyBackPreview, setVerifyBackPreview] = useState<string | null>(null);
  const [verifyBackBase64, setVerifyBackBase64] = useState<string | null>(null);
  const [verifyBackMime, setVerifyBackMime] = useState("image/jpeg");
  const [sellerFirstName, setSellerFirstName] = useState("");
  const [sellerLastName, setSellerLastName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalEmailConfirm, setPaypalEmailConfirm] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [cardInfo, setCardInfo] = useState<any>(null);
  const [pcgsData, setPcgsData] = useState<any>(null);
  const [comps, setComps] = useState<any>(null);
  const [offer, setOffer] = useState<any>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [phrase, setPhrase] = useState<string | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [gradedError, setGradedError] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPackingSlip, setShowPackingSlip] = useState(false);

  const handleFile = useCallback((f: File | null) => {
    if (!f) { setPreview(null); setImgBase64(null); return; }
    setGradedError(false); setError(null);
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setPreview(dataUrl);
      setImgBase64(dataUrl.split(",")[1]);
      setImgMime("image/jpeg");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setPreview(URL.createObjectURL(f));
      const reader = new FileReader();
      reader.onload = e => setImgBase64((e.target!.result as string).split(",")[1]);
      reader.readAsDataURL(f);
      setImgMime(f.type || "image/jpeg");
    };
    img.src = url;
  }, []);

  const handleVerifyFile = useCallback((f: File | null) => {
    if (!f) { setVerifyPreview(null); setVerifyBase64(null); return; }
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setVerifyPreview(dataUrl);
      setVerifyBase64(dataUrl.split(",")[1]);
      setVerifyMime("image/jpeg");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setVerifyPreview(URL.createObjectURL(f));
      const reader = new FileReader();
      reader.onload = e => setVerifyBase64((e.target!.result as string).split(",")[1]);
      reader.readAsDataURL(f);
    };
    img.src = url;
  }, []);

  const handleVerifyBackFile = useCallback((f: File | null) => {
    if (!f) { setVerifyBackPreview(null); setVerifyBackBase64(null); setTermsAccepted(false); setShowPackingSlip(false);return; }
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      const MAX = 1600;
      let w = img.width, h = img.height;
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      setVerifyBackPreview(dataUrl);
      setVerifyBackBase64(dataUrl.split(",")[1]);
      setVerifyBackMime("image/jpeg");
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      setVerifyBackPreview(URL.createObjectURL(f));
      const reader = new FileReader();
      reader.onload = e => setVerifyBackBase64((e.target!.result as string).split(",")[1]);
      reader.readAsDataURL(f);
    };
    img.src = url;
  }, []);
  const identifyCard = async () => {
    if (!imgBase64 && !certNumber) { setError("Please upload a photo or enter a cert number."); return; }
    setLoading(true); setError(null); setGradedError(false);
    setLoadingMsg("Scanning card...");
    try {
      const r = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: imgBase64, mimeType: imgMime, serialNumber: certNumber }),
      });
      const card = await r.json();
      if (card.error === "mismatch") { setError("Warning: " + card.message); setLoading(false); setLoadingMsg(""); return; }
      if (card.error) throw new Error(card.error);
      const hasGrade = card.psaData || card.grade || card.coinName;
      if (!hasGrade) { setGradedError(true); setLoading(false); setLoadingMsg(""); return; }
      if (card.psaData) setPcgsData(card.psaData);
      if (card.extractedCert && !certNumber) setCertNumber(card.extractedCert);
      setCardInfo(card);
      setLoadingMsg("Fetching sold comps...");
      const cr = await fetch(`/api/comps?card=${encodeURIComponent(card.name)}&grade=${encodeURIComponent(card.estimatedGrade || "")}&year=${card.year || ""}`);
      const compData = await cr.json();
      setComps(compData);
      setStep(3);
    } catch (err) {
      setError("Could not identify card. Please try a clearer image.");
    }
    setLoading(false); setLoadingMsg("");
  };

  const generateOffer = async () => {
    setLoading(true); setLoadingMsg("Calculating your offer..."); setError(null);
    try {
      const r = await fetch("/api/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardInfo, comps, pcgsData }),
      });
      const o = await r.json();
      if (o.error) throw new Error(o.error);
      setOffer(o);
      setStep(4);
    } catch (err) { setError("Could not generate offer. Please try again."); }
    setLoading(false); setLoadingMsg("");
  };

  const acceptOffer = async () => {
    setLoading(true); setLoadingMsg("Saving your offer...");
    try {
      const res = await fetch("/api/save-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerName, sellerEmail, paypalEmail, cardInfo, pcgsData, offer, shippingOption: offer?.shippingOptions?.[0]?.label || "USPS First Class" }),
      });
      const saved = await res.json();
        if (!res.ok) {
          if (saved.error === 'duplicate_cert') {
            setError('This PSA cert number already has an active offer in our system. Please contact us if you believe this is an error.');
            setLoading(false);
            return;
          }
          throw new Error(saved.detail || 'Failed to save offer');
        }
      if (saved.error) throw new Error(saved.error);
      setOfferId(saved.offerId);
      setSubmissionId(saved.poNumber);

      const words = ["ALPHA","BRAVO","CHARLIE","DELTA","ECHO","FOXTROT","GOLF","HOTEL","INDIA","JULIET","KILO","LIMA","MIKE","NOVEMBER","OSCAR","PAPA","QUEBEC","ROMEO","SIERRA","TANGO","ULTRA","VICTOR","WHISKEY","XRAY","YANKEE","ZULU"];
      const colors = ["RED","BLUE","GREEN","GOLD","SILVER","BLACK","WHITE","ORANGE","PURPLE","BRONZE"];
      const generatedPhrase = `${words[Math.floor(Math.random()*words.length)]}-${colors[Math.floor(Math.random()*colors.length)]}-${Math.floor(1000+Math.random()*9000)}`;
      setPhrase(generatedPhrase);

      await fetch("/api/save-offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatePhrase: true, offerId: saved.offerId, phrase: generatedPhrase }),
      });

      setLoadingMsg("Sending confirmation email...");
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "offer_accepted",
          to: sellerEmail,
          sellerName, sellerEmail, cardInfo, psaData, offer,
          phrase: generatedPhrase,
          submissionId: saved.poNumber,
          shippingOption: offer?.shippingOptions?.[0]?.label,
        }),
      });

      setStep(5);
    } catch (err: any) { setError("Could not save offer: " + err.message); }
    setLoading(false); setLoadingMsg("");
  };

  const submitVerification = async () => {
    if (!verifyBase64) { setError("Please upload your verification photo."); return; }
    setLoading(true); setLoadingMsg("Analyzing photo for fraud..."); setError(null);
    try {
      const r = await fetch("/api/verify-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: verifyBase64,
          mimeType: verifyMime,
          backImageBase64: verifyBackBase64,
          backMimeType: verifyBackMime,
          offerId,
          phrase,
          certNumber: psaData?.certNumber || certNumber,
          cardName: cardInfo?.name,
        }),
      });
      const result = await r.json();
      setVerifyResult(result);

      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: result.approved ? "verification_approved" : "verification_received",
          to: sellerEmail,
          sellerName, cardInfo, psaData, offer,
          submissionId,
          shippingOption: offer?.shippingOptions?.[0]?.label,
        }),
      });

      setStep(6);
    } catch (err: any) { setError("Verification failed: " + err.message); }
    setLoading(false); setLoadingMsg("");
  };

  const reset = () => {
    setStep(1); setPreview(null); setImgBase64(null); setCardInfo(null);
    setPcgsData(null); setComps(null); setOffer(null); setError(null);
    setGradedError(false); setSellerFirstName(""); setSellerLastName(""); setSellerEmail(""); setPaypalEmail(""); setPaypalEmailConfirm(""); setCertNumber("");
    setPhrase(null); setOfferId(null); setSubmissionId(null); setVerifyResult(null);
    setVerifyPreview(null); setVerifyBase64(null);
    setVerifyBackPreview(null); setVerifyBackBase64(null);
  };

  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  const sellerName = `${sellerFirstName} ${sellerLastName}`.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sellerEmail);
  const paypalValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail);
  const paypalMatch = paypalEmail === paypalEmailConfirm;
  const canAccept = !loading && !!sellerFirstName && !!sellerLastName && emailValid && paypalValid && paypalMatch && termsAccepted;

  const wrap: React.CSSProperties = { fontFamily:"'Segoe UI',sans-serif", minHeight:"100vh", background:"#030712", paddingBottom:32 };
  const cardBox: React.CSSProperties = { background:"#111827", borderRadius:12, padding:16, border:"1px solid #1f2937", marginBottom:16 };
  const inp: React.CSSProperties = { width:"100%", background:"#1f2937", border:"1px solid #374151", borderRadius:8, padding:"10px 12px", color:"#fff", fontSize:15, boxSizing:"border-box" };
  const btn = (bg: string, disabled: boolean): React.CSSProperties => ({ width:"100%", padding:"13px 0", borderRadius:10, background:disabled?"#374151":bg, color:"#fff", fontWeight:"bold", fontSize:15, border:"none", cursor:disabled?"not-allowed":"pointer", marginTop:12, opacity:disabled?0.5:1 });
  const inner: React.CSSProperties = { maxWidth:560, margin:"0 auto", padding:"0 16px" };
  const steps = ["Submit","Identify","Price","Offer","Verify","Done"];

  const PackingSlip = () => (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", color:"#000", borderRadius:12, padding:24, maxWidth:400, width:"100%", textAlign:"center" }}>
        <div style={{ borderBottom:"3px solid #000", paddingBottom:12, marginBottom:12 }}>
          <h2 style={{ margin:"0 0 2px", fontSize:22, fontWeight:900 }}>Coin BuyBack</h2>
          <p style={{ margin:0, fontSize:12, color:"#555" }}>Packing Slip &mdash; Include this with your card</p>
        </div>
        <BarcodeDisplay value={submissionId || "N/A"} />
        <div style={{ textAlign:"left", fontSize:13, borderTop:"1px solid #ddd", paddingTop:12, marginTop:4 }}>
          {([["Submission #", submissionId],["Seller", sellerName],["Card", `${cardInfo?.name} ${cardInfo?.cardNumber || ""}`.trim()],["PCGS Cert #", pcgsData?.certNo || certNumber || "N/A"],["PCGS Grade", pcgsData?.grade || cardInfo?.grade],["Offer", `$${offer?.offerPrice}`]] as [string,string][]).map(([k,v]) => (
            <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #eee" }}>
              <span style={{ color:"#555", fontWeight:600 }}>{k}:</span><span style={{ fontWeight:"bold" }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ background:"#f3f4f6", borderRadius:8, padding:12, marginTop:12, textAlign:"left" }}>
          <p style={{ margin:"0 0 4px", fontWeight:700, fontSize:13 }}>Ship To:</p>
          <p style={{ margin:0, fontSize:13, lineHeight:1.8 }}>
            <strong>{SHIP_TO.name}</strong><br />{SHIP_TO.address}<br />{SHIP_TO.city}<br />
            <span style={{ color:"#e11d48", fontSize:11 }}>Attn: {submissionId}</span>
          </p>
        </div>
        <p style={{ margin:"10px 0 0", color:"#ef4444", fontSize:11, fontWeight:600 }}>Write your Submission # on the outside of the package</p>
        <div style={{ display:"flex", gap:10, marginTop:14 }}>
          <button onClick={() => window.print()} style={{ flex:1, padding:"10px 0", borderRadius:8, background:"#111827", color:"#fff", border:"none", fontWeight:"bold", cursor:"pointer", fontSize:13 }}>Print</button>
          <button onClick={() => setShowPackingSlip(false)} style={{ flex:1, padding:"10px 0", borderRadius:8, background:"#6b7280", color:"#fff", border:"none", fontWeight:"bold", cursor:"pointer", fontSize:13 }}>Close</button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{-webkit-tap-highlight-color:transparent;box-sizing:border-box;} input,button{font-family:'Segoe UI',sans-serif;}`}</style>

      {showPackingSlip && <PackingSlip />}
      {/* Header */}
      <div style={{ background:"#000", borderBottom:"1px solid #1a0a2e", padding:"2px 16px", position:"sticky", top:0, zIndex:100, display:"flex", justifyContent:"center" }}>
        <img
          src="https://sqqomyxiwvejlhidbjef.supabase.co/storage/v1/object/public/Assets/PSARetro-fotor-bg-remover-20260319222935.png"
          alt="Coin BuyBack"
          onClick={() => window.location.href="/"}
          style={{ height:240, objectFit:"contain", cursor:"pointer" }}
        />
      </div>

      {/* Nav */}
      <div style={{ borderBottom:"1px solid #1f2937", background:"#030712", position:"sticky", top:244, zIndex:99 }}>
        <div style={{ maxWidth:800, margin:"0 auto", display:"flex" }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ flex:1, padding:"12px 4px", fontSize:13, fontWeight:600, background:"none", border:"none", borderBottom:`2px solid ${tab===i?"#ec4899":"transparent"}`, color:tab===i?"#ec4899":"#6b7280", cursor:"pointer" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"24px 0 0" }}>

        {/* SELL TAB */}
        {tab === 0 && (
          <div style={inner}>

            {/* Progress */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", marginBottom:24, overflowX:"auto", paddingBottom:4 }}>
              {steps.map((s2, i) => (
                <div key={s2} style={{ display:"flex", alignItems:"center" }}>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <div style={{ width:26, height:26, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:"bold", background: step>i+1?"#22c55e":step===i+1?"#ec4899":"#1f2937", color: step>i+1?"#000":"#fff", flexShrink:0 }}>{step>i+1?"✓":i+1}</div>
                    <span style={{ fontSize:9, color:step===i+1?"#ec4899":"#4b5563", whiteSpace:"nowrap" }}>{s2}</span>
                  </div>
                  {i<5 && <div style={{ width:16, height:1, background:"#1f2937", margin:"0 2px", marginBottom:14 }} />}
                </div>
              ))}
            </div>

            {error && <div style={{ background:"#450a0a", border:"1px solid #ef4444", borderRadius:8, padding:12, color:"#fca5a5", marginBottom:16, fontSize:14 }}>{error}</div>}

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <h2 style={{ margin:"0 0 6px", fontSize:20 }}>Submit Your Coin</h2>
                <p style={{ color:"#6b7280", fontSize:13, margin:"0 0 16px" }}>Enter a PCGS cert #, upload a photo, or both. Only PCGS graded coins are eligible.</p>
                <div style={{ marginBottom:16 }}>
                  <label style={{ color:"#9ca3af", fontSize:12, display:"block", marginBottom:6 }}>PCGS Cert #</label>
                  <input style={{ ...inp, fontFamily:"monospace" }} value={certNumber} onChange={e => { setCertNumber(e.target.value); setError(null); setGradedError(false); }} onKeyDown={e => { if (e.key === "Enter") identifyCard(); }} placeholder="e.g. 12345678" />
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
                  <div style={{ flex:1, height:1, background:"#1f2937" }} />
                  <span style={{ color:"#4b5563", fontSize:12 }}>and / or</span>
                  <div style={{ flex:1, height:1, background:"#1f2937" }} />
                </div>
                <UploadZone onFile={handleFile} preview={preview} label="Drop coin image or tap to upload" />
                {gradedError && (
                  <div style={{ background:"#451a03", border:"1px solid #f97316", borderRadius:10, padding:14, marginTop:14, textAlign:"center" }}>
                    <p style={{ margin:"0 0 4px", fontSize:15 }}>&#9888; Ungraded Card Detected</p>
                    <p style={{ margin:0, color:"#fdba74", fontSize:13 }}>We only make offers on PCGS graded coins.</p>
                  </div>
                )}
                <button onClick={identifyCard} disabled={loading || (!imgBase64 && !certNumber)} style={btn("linear-gradient(to right,#9333ea,#ec4899)", loading || (!imgBase64 && !certNumber))}>
                  {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner />{loadingMsg}</span> : "Submit To Identify Coin"}
                </button>
                {!imgBase64 && !certNumber && <p style={{ color:"#4b5563", fontSize:12, textAlign:"center", marginTop:8 }}>Enter a cert # or upload a photo to continue.</p>}
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && cardInfo && (
              <>
                <h2 style={{ margin:"0 0 16px", fontSize:20 }}>Coin Identified</h2>
                <div style={{ ...cardBox, border:"1px solid rgba(236,72,153,0.4)" }}>
                  <div style={{ display:"flex", gap:12 }}>
                    {preview && <img src={preview} alt="card" style={{ width:80, height:110, objectFit:"cover", borderRadius:8, flexShrink:0 }} />}
                    <div style={{ flex:1, minWidth:0 }}>
                      <h3 style={{ margin:"0 0 6px", color:"#ec4899", fontSize:20 }}>{cardInfo.coinName || cardInfo.denomination} {cardInfo.year}</h3>
                      {pcgsData && !pcgsData.error && <div style={{ background:"#14532d", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#86efac", display:"inline-flex", alignItems:"center", gap:4, marginBottom:8 }}>PCGS Grade {pcgsData.grade} Verified</div>}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"4px 12px", fontSize:13 }}>
                        {[["Year",cardInfo.year],["Denomination",cardInfo.denomination],["Mint Mark",cardInfo.mintMark||"None"],["Designation",cardInfo.designation||"—"],["Variety",cardInfo.variety||"—"],["PCGS Grade", pcgsData?.grade || cardInfo.grade]].map(([k,v])=>(
                          <div key={k} style={{ display:"flex", gap:6 }}><span style={{ color:"#6b7280" }}>{k}</span><span style={{ color: k==="PCGS Grade"?"#eab308":"#fff", fontWeight: k==="PCGS Grade"?"bold":"normal" }}>{v}</span></div>
                        ))}
                        <div style={{ display:"flex", gap:6, gridColumn:"1/-1" }}>
                          <span style={{ color:"#6b7280" }}>Label</span>
                          <span style={{ color:"#a78bfa", fontWeight:"bold" }}>{cardInfo.labelType || "Blue"} <span style={{ fontSize:10, color:"#4b5563", fontWeight:"normal" }}>({cardInfo.gradingService || "PCGS"})</span></span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {cardInfo.notes && <p style={{ margin:"10px 0 0", color:"#9ca3af", fontSize:12, borderTop:"1px solid #1f2937", paddingTop:10 }}>{cardInfo.notes}</p>}
                </div>
                <button onClick={generateOffer} disabled={loading} style={btn("linear-gradient(to right,#ff1493,#cc00ff)", loading)}>
                  {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner />{loadingMsg}</span> : "Click Here To Generate Your Buy Offer"}
                </button>
                {comps && (
                  <div style={cardBox}>
                    <p style={{ margin:"0 0 10px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>Recent Sold Comps</p>
                    {comps.comps?.slice(0,5).map((c: any, i: number) => (
                      <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"5px 0", borderBottom:"1px solid #1f2937" }}>
                        <span style={{ color:"#9ca3af" }}>{c.date} &middot; {c.platform}</span>
                        <span style={{ color:"#4ade80", fontWeight:"bold" }}>${c.price}</span>
                      </div>
                    ))}
                    {comps.stats && (
                      <div style={{ display:"flex", gap:12, marginTop:10, fontSize:12 }}>
                        <span style={{ color:"#9ca3af" }}>Avg: <strong style={{ color:"#fff" }}>${comps.stats.average}</strong></span>
                        <span style={{ color:"#9ca3af" }}>High: <strong style={{ color:"#4ade80" }}>${comps.stats.high}</strong></span>
                        <span style={{ color:"#9ca3af" }}>Low: <strong style={{ color:"#f87171" }}>${comps.stats.low}</strong></span>
                      </div>
                    )}
                    {comps.stats?.note && <p style={{ margin:"6px 0 0", color:"#6b7280", fontSize:11 }}>{comps.stats.note}</p>}
                  </div>
                )}
                
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && offer && (
              <>
                <h2 style={{ margin:"0 0 16px", fontSize:20 }}>Your Offer</h2>
                <div style={{ ...cardBox, border:"1px solid rgba(234,179,8,0.4)", textAlign:"center" }}>
                  <p style={{ margin:"0 0 2px", color:"#9ca3af", fontSize:13 }}>{"We'd like to buy your"}</p>
                  <p style={{ margin:"0 0 6px", color:"#ec4899", fontWeight:900, fontSize:17 }}>{cardInfo?.coinName || cardInfo?.denomination} {cardInfo?.year}</p>
                  <p style={{ margin:"0 0 6px", fontSize:52, fontWeight:900, color:"#eab308", lineHeight:1 }}>${offer.offerPrice}</p>
                  <p style={{ margin:"0 0 8px", color:"#6b7280", fontSize:12 }}>Fair Market Value: <span style={{ color:"#9ca3af" }}>${offer.fairMarketValue}</span></p>
                  <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:8 }}>
                    <span style={{ fontSize:11, padding:"2px 10px", borderRadius:9999, background:"#1e1b4b", color:"#a5b4fc" }}>
                      {offer.offerPrice < 100 ? "50% upfront \u00b7 50% on receipt" : "25% upfront \u00b7 75% on receipt"}
                    </span>
                  </div>
                  <span style={{ fontSize:11, padding:"2px 10px", borderRadius:9999, background: offer.confidenceLevel==="High"?"#14532d":offer.confidenceLevel==="Medium"?"#713f12":"#1f2937", color: offer.confidenceLevel==="High"?"#86efac":offer.confidenceLevel==="Medium"?"#fde68a":"#9ca3af" }}>{offer.confidenceLevel} Confidence</span>
                  <p style={{ margin:"10px 0 0", color:"#9ca3af", fontSize:12, lineHeight:1.6, textAlign:"left" }}>{offer.reasoning}</p>
                </div>
                <div style={cardBox}>
                  <p style={{ margin:"0 0 10px", color:"#9ca3af", fontSize:12, fontWeight:600 }}>Pricing Factors</p>
                  <ScoreBar label="Sales Velocity" val={offer.velocityScore} />
                  <ScoreBar label="Scarcity" val={offer.scarcityScore} />
                  <ScoreBar label="Desirability" val={offer.desirabilityScore} />
                </div>
                
                <div style={{ ...cardBox, border:"1px solid rgba(236,72,153,0.3)" }}>
                  <p style={{ margin:"0 0 12px", color:"#9ca3af", fontSize:13, fontWeight:600 }}>Your Info (required to accept)</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                    <div>
                      <label style={{ color:"#9ca3af", fontSize:12 }}>First Name *</label>
                      <input style={{ ...inp, marginTop:4, borderColor:!sellerFirstName?"#ef4444":"#374151" }} value={sellerFirstName} onChange={e=>setSellerFirstName(e.target.value)} placeholder="First name" />
                    </div>
                    <div>
                      <label style={{ color:"#9ca3af", fontSize:12 }}>Last Name *</label>
                      <input style={{ ...inp, marginTop:4, borderColor:!sellerLastName?"#ef4444":"#374151" }} value={sellerLastName} onChange={e=>setSellerLastName(e.target.value)} placeholder="Last name" />
                    </div>
                  </div>
                  <div>
                    <label style={{ color:"#9ca3af", fontSize:12 }}>Email *</label>
                    <input style={{ ...inp, marginTop:4, borderColor:sellerEmail && !emailValid?"#ef4444":"#374151" }} value={sellerEmail} onChange={e=>setSellerEmail(e.target.value)} placeholder="email@example.com" type="email" />
                    {sellerEmail && !emailValid && <p style={{ margin:"4px 0 0", color:"#f87171", fontSize:12 }}>Please enter a valid email address.</p>}
                  </div>
                  {(!sellerFirstName || !sellerLastName || !emailValid) && <p style={{ margin:"10px 0 0", color:"#f87171", fontSize:12 }}>First name, last name, and valid email are required.</p>}
                  <div style={{ borderTop:"1px solid #374151", paddingTop:14, marginTop:10 }}>
                    <p style={{ margin:"0 0 10px", color:"#a5b4fc", fontSize:13, fontWeight:700 }}>PayPal Payment Info</p>
                    <p style={{ margin:"0 0 12px", color:"#6b7280", fontSize:12 }}>{"We'll send payment here via PayPal G&S. Double-check — we can't recover payments sent to the wrong address."}</p>
                    <div style={{ marginBottom:10 }}>
                      <label style={{ color:"#9ca3af", fontSize:12 }}>PayPal Email *</label>
                      <input style={{ ...inp, marginTop:4, borderColor: paypalEmail && !paypalValid ? "#ef4444" : "#374151" }} value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)} placeholder="your@paypal.com" type="email" />
                    </div>
                    <div>
                      <label style={{ color:"#9ca3af", fontSize:12 }}>Confirm PayPal Email *</label>
                      <input style={{ ...inp, marginTop:4, borderColor: paypalEmailConfirm && !paypalMatch ? "#ef4444" : paypalEmailConfirm && paypalMatch ? "#22c55e" : "#374151" }} value={paypalEmailConfirm} onChange={e=>setPaypalEmailConfirm(e.target.value)} placeholder="Re-enter PayPal email" type="email" />
                      {paypalEmailConfirm && !paypalMatch && <p style={{ margin:"5px 0 0", color:"#f87171", fontSize:12 }}>PayPal emails do not match.</p>}
                      {paypalEmailConfirm && paypalMatch && paypalValid && <p style={{ margin:"5px 0 0", color:"#4ade80", fontSize:12 }}>PayPal email confirmed.</p>}
                    </div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div style={{ ...cardBox, border:"1px solid rgba(99,102,241,0.4)", background:"#0f0f1a" }}>
                  <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}>
                    <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
                      style={{ marginTop:3, width:18, height:18, cursor:"pointer", accentColor:"#ec4899" }} />
                    <span style={{ color:"#c7d2fe", fontSize:13, lineHeight:1.6 }}>
                      I agree to ship this coin within <strong style={{ color:"#fff" }}>5 business days</strong> of receiving my upfront payment. I understand that failure to ship within this timeframe may result in my offer being rescinded and upfront payment being recovered via PayPal dispute.
                    </span>
                  </label>
                </div>
                  <button onClick={reset} style={{ ...btn("#1f2937", false), marginTop:0 }}>Decline</button>
                  <button onClick={acceptOffer} disabled={!canAccept} style={{ ...btn("linear-gradient(to right,#00ff41,#00cc33)", !canAccept), marginTop:0 }}>
                    {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner />{loadingMsg}</span> : "Accept Offer & Continue"}
                  </button>
                </div>
              </>
            )}

            {/* STEP 5 */}
            {step === 5 && phrase && (
              <>
                <h2 style={{ margin:"0 0 6px", fontSize:20 }}>Verify Your Coin</h2>
                <p style={{ color:"#6b7280", fontSize:13, margin:"0 0 16px" }}>To protect both parties, we need to verify you physically have this coin.</p>
                <div style={{ background:"#1e1b4b", border:"2px dashed #6366f1", borderRadius:12, padding:20, textAlign:"center", marginBottom:16 }}>
                  <p style={{ margin:"0 0 8px", color:"#a5b4fc", fontSize:13 }}>Write this phrase on paper &mdash; must be handwritten:</p>
                  <p style={{ margin:"0 0 8px", fontSize:26, fontWeight:900, color:"#fff", letterSpacing:4, fontFamily:"monospace" }}>{phrase}</p>
                  <p style={{ margin:0, color:"#6b7280", fontSize:12 }}>The PHRASE and the ENTIRE slab must be visible from top to bottom including the PCGS label. The PCGS cert number must be clearly readable.</p>
                </div>
                <div style={{ ...cardBox }}>
                  <p style={{ margin:"0 0 10px", color:"#9ca3af", fontSize:13, fontWeight:600 }}>Upload Verification Photo</p>
                  <UploadZone onFile={handleVerifyFile} preview={verifyPreview} label="Photo of card + handwritten phrase" />
                </div>
                <div style={{ ...cardBox }}>
                  <p style={{ margin:"0 0 6px", color:"#9ca3af", fontSize:13, fontWeight:600 }}>Back of Card + Phrase</p>
                  <p style={{ margin:"0 0 10px", color:"#6b7280", fontSize:12 }}>Entire back of slab must be in frame with phrase clearly visible next to it.</p>
                  <UploadZone onFile={handleVerifyBackFile} preview={verifyBackPreview} label="Photo of card back + handwritten phrase" />
                </div>
                
                <button onClick={submitVerification} disabled={loading || !verifyBase64 || !verifyBackBase64} style={btn("linear-gradient(to right,#6366f1,#a855f7)", loading || !verifyBase64 || !verifyBackBase64)}>
                  {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><Spinner />{loadingMsg}</span> : "Submit for Verification"}
                </button>
              </>
            )}

            {/* STEP 6 */}
            {step === 6 && verifyResult && (
              <div style={{ textAlign:"center", padding:"24px 0" }}>
                {verifyResult.approved ? (
                  <>
                    <div style={{ fontSize:56, marginBottom:12 }}>&#127881;</div>
                    <h2 style={{ margin:"0 0 8px", color:"#4ade80" }}>Verified!</h2>
                    <p style={{ color:"#9ca3af", marginBottom:20, fontSize:14 }}>Your coin has been verified. Here is a summary of your submission.</p>
                    <div style={{ ...cardBox, textAlign:"left", border:"1px solid rgba(74,222,128,0.3)" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Seller</span><span style={{ color:"#fff" }}>{sellerName}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Coin</span><span style={{ color:"#ec4899", fontWeight:600 }}>{cardInfo?.coinName || cardInfo?.denomination} {cardInfo?.year}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>PCGS Cert #</span><span style={{ color:"#fff", fontFamily:"monospace" }}>{pcgsData?.certNo || certNumber || "N/A"}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>PCGS Grade</span><span style={{ color:"#eab308", fontWeight:"bold" }}>{pcgsData?.grade || cardInfo?.grade}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Submission #</span><span style={{ color:"#fff", fontFamily:"monospace" }}>{submissionId}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Total Offer</span><span style={{ color:"#eab308", fontWeight:900 }}>${offer?.offerPrice}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Upfront Payment</span><span style={{ color:"#4ade80", fontWeight:900 }}>${offer?.offerPrice < 100 ? (offer?.offerPrice * 0.5).toFixed(2) : (offer?.offerPrice * 0.25).toFixed(2)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0", borderBottom:"1px solid #1f2937" }}><span style={{ color:"#6b7280" }}>Remaining Balance</span><span style={{ color:"#fff" }}>${offer?.offerPrice < 100 ? (offer?.offerPrice * 0.5).toFixed(2) : (offer?.offerPrice * 0.75).toFixed(2)}</span></div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, padding:"7px 0" }}><span style={{ color:"#6b7280" }}>Payment Method</span><span style={{ color:"#fff" }}>PayPal G&amp;S</span></div>
                    </div>
                    <div style={{ ...cardBox, background:"#1e1b4b", border:"1px solid #6366f1" }}>
                      <p style={{ margin:"0 0 8px", color:"#a5b4fc", fontSize:13, fontWeight:600 }}>How Payments Work</p>
                      <p style={{ margin:"0 0 6px", color:"#c7d2fe", fontSize:13 }}>&bull; <strong>Upfront payment</strong> will be sent to your PayPal within 1-2 business days once our team reviews your submission.</p>
                      <p style={{ margin:"0 0 6px", color:"#c7d2fe", fontSize:13 }}>&bull; <strong>Remaining balance</strong> is sent within 24-48 hours of us receiving and inspecting your card.</p>
                      <p style={{ margin:0, color:"#c7d2fe", fontSize:13 }}>&bull; All payments sent via <strong>PayPal Goods &amp; Services</strong> for your protection.</p>
                    </div>
                    <div style={{ ...cardBox, background:"#0a2a1a", border:"1px solid #166534" }}>
                      <p style={{ margin:"0 0 8px", color:"#4ade80", fontSize:13, fontWeight:600 }}>Next Steps</p>
                      <p style={{ margin:"0 0 6px", color:"#86efac", fontSize:13 }}>1. Watch for your upfront PayPal payment &mdash; arriving soon.</p>
                      <p style={{ margin:"0 0 6px", color:"#86efac", fontSize:13 }}>2. Once received, package your coin securely and ship to us.</p>
                      <p style={{ margin:0, color:"#86efac", fontSize:13 }}>3. Enter your tracking number below so we can monitor delivery.</p>
                    </div>
                    <div style={{ ...cardBox, background:"#1e1b4b", border:"1px solid #6366f1" }}>
                      <p style={{ margin:"0 0 8px", color:"#a5b4fc", fontSize:13, fontWeight:700 }}>Submit Tracking Number</p>
                      <p style={{ margin:"0 0 10px", color:"#c7d2fe", fontSize:13 }}>Once shipped, enter your tracking number so we can monitor delivery.</p>
                      <a href={`/track/${submissionId}`} style={{ display:"block", textAlign:"center", padding:"12px 0", borderRadius:10, background:"linear-gradient(to right,#6366f1,#a855f7)", color:"#fff", fontWeight:"bold", fontSize:14, textDecoration:"none" }}>Enter Tracking Number &rarr;</a>
                    </div>
                    <div style={{ ...cardBox, border:"1px solid rgba(99,102,241,0.4)" }}>
                      <p style={{ margin:"0 0 8px", color:"#a5b4fc", fontSize:13, fontWeight:700 }}>Ship Your Coin To:</p>
                      <p style={{ margin:"0 0 4px", color:"#fff", fontSize:15, fontWeight:700 }}>Coin BuyBack</p>
                      <p style={{ margin:"0 0 4px", color:"#c7d2fe", fontSize:14 }}>XXXX Buyback Lane</p>
                      <p style={{ margin:"0 0 8px", color:"#c7d2fe", fontSize:14 }}>City, ST 00000</p>
                      <p style={{ margin:0, color:"#f97316", fontSize:12, fontWeight:600 }}>Write <strong>{submissionId}</strong> on the outside of your package</p>
                    </div>
                    <div style={{ ...cardBox, background:"#0a2a1a", border:"1px solid #166534" }}>
                      <p style={{ margin:"0 0 8px", color:"#4ade80", fontSize:13, fontWeight:600 }}>Packing Slip</p>
                      <p style={{ margin:"0 0 10px", color:"#86efac", fontSize:13 }}>Include a packing slip in your package so we can identify your coin instantly.</p>
                      <button onClick={() => setShowPackingSlip(true)} style={{ ...btn("linear-gradient(to right,#059669,#0d9488)", false), marginTop:0 }}>View / Print Packing Slip</button>
                    </div>
                    <p style={{ color:"#6b7280", fontSize:13, textAlign:"center" }}>Questions? Email us at <strong style={{ color:"#fff" }}>vkostich@hotmail.com</strong></p>
                    <button onClick={reset} style={btn("#1f2937", false)}>Submit Another Coin</button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize:56, marginBottom:12 }}>&#9888;</div>
                    <h2 style={{ margin:"0 0 8px", color:"#f97316" }}>Verification Failed</h2>
                    <p style={{ color:"#9ca3af", marginBottom:16, fontSize:14 }}>We could not verify your photo. Please try again.</p>
                    <div style={{ ...cardBox, border:"1px solid rgba(249,115,22,0.3)", textAlign:"left" }}>
                      {verifyResult.result?.failReasons?.map((r: string, i: number) => (
                        <p key={i} style={{ margin:"4px 0", color:"#fdba74", fontSize:13 }}>&bull; {r}</p>
                      ))}
                    </div>
                    <button onClick={() => { setStep(5); setVerifyPreview(null); setVerifyBase64(null); setVerifyResult(null); setError(null); }} style={btn("linear-gradient(to right,#6366f1,#a855f7)", false)}>
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* BUY TAB */}
        {tab === 1 && (
          <div style={inner}>
            <h2 style={{ margin:"0 0 6px", fontSize:20 }}>Buy Coins</h2>
            <p style={{ color:"#6b7280", fontSize:13, margin:"0 0 20px" }}>Browse our current inventory of PCGS graded coins.</p>
            <div style={{ ...cardBox, textAlign:"center", padding:40 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>&#127183;</div>
              <p style={{ color:"#9ca3af", fontSize:14, margin:0 }}>Inventory listings coming soon.</p>
              <p style={{ color:"#4b5563", fontSize:12, marginTop:8 }}>Check back or contact us at <strong style={{ color:"#fff" }}>vkostich@hotmail.com</strong></p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

