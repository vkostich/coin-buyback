import { Resend } from 'resend';

function getResend() { return new Resend(process.env.RESEND_API_KEY); }
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const ADMIN = process.env.ADMIN_EMAIL;
const PAYPAL_BUSINESS = process.env.PAYPAL_BUSINESS_EMAIL || 'vkostich@hotmail.com';

export function generatePhrase() {
  const words = ['ALPHA','BRAVO','CHARLIE','DELTA','ECHO','FOXTROT','GOLF','HOTEL','INDIA','JULIET','KILO','LIMA','MIKE','NOVEMBER','OSCAR','PAPA','QUEBEC','ROMEO','SIERRA','TANGO','ULTRA','VICTOR','WHISKEY','XRAY','YANKEE','ZULU'];
  const colors = ['RED','BLUE','GREEN','GOLD','SILVER','BLACK','WHITE','ORANGE','PURPLE','BRONZE'];
  return `${words[Math.floor(Math.random()*words.length)]}-${colors[Math.floor(Math.random()*colors.length)]}-${Math.floor(1000+Math.random()*9000)}`;
}

function paypalLink(amount, submissionId, cardName, psaGrade, certNumber) {
  const note = encodeURIComponent(`PSA BuyBack ${submissionId} - ${cardName} PSA ${psaGrade} Cert#${certNumber}`);
  return `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(PAYPAL_BUSINESS)}&amount=${amount}&currency_code=USD&item_name=${note}`;
}

function baseStyle() {
  return `
    body { margin:0; padding:0; background:#0a0a0a; font-family:'Segoe UI',Arial,sans-serif; color:#ffffff; }
    .wrap { max-width:600px; margin:0 auto; background:#111827; border-radius:12px; overflow:hidden; }
    .header { background:linear-gradient(to right,#4a1942,#1f1035); padding:24px; text-align:center; }
    .header h1 { margin:0; font-size:24px; color:#ffffff; }
    .header h1 span { color:#ec4899; }
    .header p { margin:6px 0 0; color:#9ca3af; font-size:13px; }
    .body { padding:28px 24px; }
    .section { background:#1f2937; border-radius:10px; padding:16px; margin-bottom:16px; }
    .section h3 { margin:0 0 12px; font-size:15px; color:#9ca3af; }
    .row-table { width:100%; border-collapse:collapse; }
    .row-table tr { border-bottom:1px solid #374151; }
    .row-table tr:last-child { border-bottom:none; }
    .row-table td { padding:8px 4px; font-size:14px; vertical-align:top; }
    .row-label { color:#6b7280; width:45%; }
    .row-value { color:#ffffff; font-weight:600; text-align:right; }
    .row-value.pink { color:#ec4899; }
    .row-value.yellow { color:#eab308; }
    .row-value.green { color:#4ade80; }
    .phrase-box { background:#1e1b4b; border:2px dashed #6366f1; border-radius:10px; padding:20px; text-align:center; margin:20px 0; }
    .phrase-box p { margin:0 0 8px; color:#a5b4fc; font-size:13px; }
    .phrase-code { font-size:28px; font-weight:900; color:#ffffff; letter-spacing:4px; font-family:monospace,Courier; }
    .btn { display:inline-block; padding:14px 28px; border-radius:10px; font-weight:bold; font-size:15px; text-decoration:none; color:#ffffff; margin:8px 4px; }
    .btn-pink { background:linear-gradient(to right,#ec4899,#a855f7); }
    .btn-green { background:#059669; }
    .btn-blue { background:linear-gradient(to right,#1d4ed8,#6366f1); }
    .alert { border-radius:8px; padding:14px; margin-bottom:16px; }
    .footer { padding:16px 24px; text-align:center; color:#4b5563; font-size:12px; border-top:1px solid #1f2937; }
    .steps-table { width:100%; border-collapse:collapse; }
    .steps-table td { padding:6px 4px; vertical-align:top; font-size:14px; color:#d1d5db; line-height:1.5; }
    .step-num { background:#ec4899; color:#ffffff; border-radius:50%; width:24px; height:24px; text-align:center; font-weight:bold; font-size:13px; line-height:24px; display:inline-block; }
  `;
}

function header() {
  return `<div class="header"><h1>PSA <span>BuyBack</span></h1><p>Instant Offers. Fast Cash.</p></div>`;
}

function footer(submissionId) {
  return `<div class="footer"><p>Submission #${submissionId} &middot; Questions? Reply to this email.</p><p>PSA BuyBack &middot; &copy; ${new Date().getFullYear()}</p></div>`;
}

function rowTable(rows) {
  return `
    <table class="row-table" cellpadding="0" cellspacing="0">
      ${rows.map(([label, value, cls]) => `
        <tr>
          <td class="row-label">${label}</td>
          <td class="row-value ${cls||''}">${value || 'N/A'}</td>
        </tr>
      `).join('')}
    </table>
  `;
}

function cardDetailsSection(cardInfo, psaData, offer) {
  const upfront = offer.offerPrice < 100 ? (offer.offerPrice * 0.5).toFixed(2) : (offer.offerPrice * 0.5).toFixed(2);
  const remaining = (offer.offerPrice - parseFloat(upfront)).toFixed(2);
  return `
    <div class="section">
      <h3>&#128203; Card Details</h3>
      ${rowTable([
        ['Card', `${cardInfo.name} ${cardInfo.cardNumber || ''}`, 'pink'],
        ['Finish', `${cardInfo.finish || 'Matte'} (${psaData ? 'PSA' : cardInfo.finishSource || 'Visual'})`, ''],
        ...(psaData ? [
          ['PSA Cert #', psaData.certNumber, ''],
          ['PSA Grade', psaData.grade, 'yellow'],
        ] : []),
        ['Offer Price', `$${offer.offerPrice}`, 'yellow'],
        ['Upfront Payment', `$${upfront}`, 'green'],
        ['Final Payment (on tracking)', `$${remaining}`, ''],
      ])}
    </div>`;
}

async function sendPendingOfferEmail({ to, sellerName, cardInfo, psaData, offer, offerId }) {
  const url = `${process.env.NEXT_PUBLIC_URL || 'https://gpk-buyback.vercel.app'}/offer/${offerId}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#eab308">&#128176; Your Offer is Ready</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName || 'there'}, your offer for <strong style="color:#ec4899">${cardInfo?.name}</strong> is waiting for you.</p>
        <div class="section" style="text-align:center;border:1px solid rgba(234,179,8,0.4)">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px">Your Offer</p>
          <p style="margin:0;font-size:48px;font-weight:900;color:#eab308;line-height:1">$${offer?.offerPrice}</p>
          <p style="margin:8px 0 0;color:#6b7280;font-size:12px">Expires in 3 days</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${url}" class="btn btn-pink">View &amp; Accept Offer &rarr;</a>
        </div>
      </div>
      ${footer(offerId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#128176; Your PSA BuyBack Offer: $${offer?.offerPrice} for ${cardInfo?.name}`, html });
}

async function sendPendingOfferFollowupEmail({ to, sellerName, cardInfo, offer, offerId, daysLeft }) {
  const url = `${process.env.NEXT_PUBLIC_URL || 'https://gpk-buyback.vercel.app'}/offer/${offerId}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#f97316">&#9200; Your Offer Expires Soon</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName || 'there'}, your offer for <strong style="color:#ec4899">${cardInfo?.name}</strong> expires in <strong style="color:#f97316">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</strong>.</p>
        <div class="section" style="text-align:center;border:1px solid rgba(249,115,22,0.4)">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:13px">Your Offer</p>
          <p style="margin:0;font-size:48px;font-weight:900;color:#eab308;line-height:1">$${offer?.offerPrice}</p>
          <p style="margin:8px 0 0;color:#f97316;font-size:13px;font-weight:700">&#9888; ${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining</p>
        </div>
        <div style="text-align:center;margin:24px 0">
          <a href="${url}" class="btn btn-pink">Accept Before It Expires &rarr;</a>
        </div>
      </div>
      ${footer(offerId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#9200; Offer Expiring in ${daysLeft} Day${daysLeft !== 1 ? 's' : ''}: $${offer?.offerPrice} for ${cardInfo?.name}`, html });
}

async function sendOfferAcceptedEmail({ to, sellerName, cardInfo, psaData, offer, phrase, submissionId }) {
  const upfront = (offer.offerPrice * 0.5).toFixed(2);
  const remaining = (offer.offerPrice * 0.5).toFixed(2);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px">Hi ${sellerName}! &#127881;</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Your offer has been accepted. Before we process payment, we need to verify you have the card in your possession.</p>
        ${cardDetailsSection(cardInfo, psaData, offer)}
        <div class="phrase-box">
          <p>&#9999; Write this phrase on paper and photograph it next to your graded card:</p>
          <div class="phrase-code">${phrase}</div>
          <p style="margin-top:8px;font-size:12px;color:#6b7280">The PSA cert number must be visible on the slab in the photo.</p>
        </div>
        <div class="section">
          <h3>&#128203; How Payments Work</h3>
          <table class="steps-table" cellpadding="0" cellspacing="0">
            ${[
              `Upload verification photos &rarr; we send <strong style="color:#4ade80">$${upfront} upfront</strong> via PayPal immediately.`,
              `Ship your card and upload tracking &rarr; we send <strong style="color:#4ade80">$${remaining} final payment</strong> via PayPal within 24 hours.`,
            ].map((s, i) => `<tr><td style="width:32px;padding-top:8px"><span class="step-num">${i+1}</span></td><td style="padding:8px 0 8px 8px">${s}</td></tr>`).join('')}
          </table>
        </div>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#9989; Offer Accepted - Upload Verification Photo | Submission #${submissionId}`, html });
}

async function sendVerificationReceivedEmail({ to, sellerName, submissionId }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px">Photo Received! &#128248;</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName}, we have received your verification photo and it is being reviewed now.</p>
        <p style="color:#6b7280;font-size:13px;text-align:center">We will email you as soon as your verification is approved.</p>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#128248; Verification Photo Received | Submission #${submissionId}`, html });
}

async function sendVerificationApprovedEmail({ to, sellerName, cardInfo, psaData, offer, submissionId, shippingOption }) {
  const upfront = (offer.offerPrice * 0.5).toFixed(2);
  const remaining = (offer.offerPrice * 0.5).toFixed(2);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px">You are Verified! &#127881;</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName}, your verification has been approved and your upfront payment is on its way!</p>
        <div class="section" style="border:1px solid rgba(74,222,128,0.3)">
          <h3 style="color:#4ade80">&#128184; Payment Details</h3>
          ${rowTable([
            ['Upfront Payment', `$${upfront}`, 'green'],
            ['Final Payment', `$${remaining} — sent when you upload tracking`, ''],
            ['Total Offer', `$${offer.offerPrice}`, 'yellow'],
          ])}
        </div>
        ${cardDetailsSection(cardInfo, psaData, offer)}
        <div class="section">
          <h3>&#128230; Next Steps</h3>
          <table class="steps-table" cellpadding="0" cellspacing="0">
            ${[
              `Your upfront payment of <strong style="color:#4ade80">$${upfront}</strong> is being sent to your PayPal now.`,
              'Package your graded card securely.',
              `Ship using: <strong>${shippingOption || 'USPS First Class'}</strong> and write <strong>${submissionId}</strong> on the outside.`,
              `Upload your tracking number on the website &rarr; your final payment of <strong style="color:#4ade80">$${remaining}</strong> will be sent within 24 hours.`,
            ].map((s, i) => `<tr><td style="width:32px;padding-top:8px"><span class="step-num">${i+1}</span></td><td style="padding:8px 0 8px 8px">${s}</td></tr>`).join('')}
          </table>
        </div>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#128184; Upfront Payment Sent + Shipping Instructions | Submission #${submissionId}`, html });
}

async function sendTrackingSubmittedSellerEmail({ to, sellerName, submissionId, trackingNumber, trackingCarrier, cardInfo, offer }) {
  const remaining = (offer.offerPrice * 0.5).toFixed(2);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px;color:#4ade80">Tracking Received! &#128230;</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName}, we have received your tracking information for <strong style="color:#ec4899">${cardInfo?.name}</strong>.</p>
        <div class="section" style="border:1px solid rgba(74,222,128,0.3)">
          <h3 style="color:#4ade80">&#128184; Final Payment</h3>
          ${rowTable([
            ['Amount', `$${remaining}`, 'green'],
            ['Status', 'Being processed — within 24 hours', ''],
          ])}
        </div>
        <div class="section">
          <h3>&#128230; Tracking Submitted</h3>
          ${rowTable([
            ['Carrier', trackingCarrier, ''],
            ['Tracking #', trackingNumber, ''],
            ['Submission #', submissionId, ''],
          ])}
        </div>
        <p style="color:#6b7280;font-size:12px;text-align:center">Please note: final payment is contingent on the card arriving in the condition matching the PSA label. If the card arrives damaged or significantly different than described, PSA BuyBack reserves the right to open a PayPal dispute.</p>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#128230; Tracking Received - Final Payment Processing | Submission #${submissionId}`, html });
}

async function sendTrackingSubmittedAdminEmail({ sellerName, sellerEmail, paypalEmail, submissionId, trackingNumber, trackingCarrier, cardInfo, psaData, offer }) {
  const remaining = (offer?.offerPrice * 0.5).toFixed(2);
  const pLink = paypalLink(remaining, submissionId, cardInfo?.name, psaData?.grade, psaData?.certNumber);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <div class="alert" style="background:#14532d;border:1px solid #4ade80">
          <p style="margin:0;color:#4ade80;font-weight:bold">&#128230; Tracking Submitted &mdash; Send Final Payment Now</p>
        </div>
        <div class="section">
          <h3>&#128100; Seller</h3>
          ${rowTable([
            ['Name', sellerName, ''],
            ['Email', sellerEmail, ''],
            ['PayPal', paypalEmail || 'N/A', ''],
            ['Submission #', submissionId, ''],
          ])}
        </div>
        <div class="section">
          <h3>&#128203; Card</h3>
          ${rowTable([
            ['Card', `${cardInfo?.name} ${cardInfo?.cardNumber || ''}`, 'pink'],
            ['PSA Grade', psaData?.grade || 'N/A', 'yellow'],
            ['PSA Cert #', psaData?.certNumber || 'N/A', ''],
          ])}
        </div>
        <div class="section">
          <h3>&#128230; Tracking</h3>
          ${rowTable([
            ['Carrier', trackingCarrier, ''],
            ['Tracking #', trackingNumber, ''],
          ])}
        </div>
        <div class="section" style="border:1px solid rgba(74,222,128,0.3)">
          <h3 style="color:#4ade80">&#128184; Final Payment Due</h3>
          ${rowTable([
            ['Amount', `$${remaining}`, 'green'],
            ['Send To', paypalEmail || 'N/A', ''],
          ])}
        </div>
        <div style="text-align:center;margin:20px 0">
          <a href="${pLink}" class="btn btn-green">&#128184; Send $${remaining} Final Payment via PayPal</a>
        </div>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to: ADMIN, subject: `&#128230; Final Payment Due: ${submissionId} - ${cardInfo?.name} - $${remaining}`, html });
}

async function sendCardReceivedEmail({ to, sellerName, cardInfo, offer, submissionId }) {
  const remaining = (offer.offerPrice * 0.5).toFixed(2);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <h2 style="margin:0 0 6px">Card Received! &#128236;</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px">Hi ${sellerName}, we have received your <strong style="color:#ec4899">${cardInfo.name}</strong>. Remaining payment of <strong style="color:#4ade80">$${remaining}</strong> will be sent within 24 hours.</p>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to, subject: `&#128236; Card Received - Final Payment Processing | Submission #${submissionId}`, html });
}

async function sendAdminEmail({ cardInfo, psaData, offer, sellerName, sellerEmail, paypalEmail, submissionId, phrase }) {
  const upfront = (offer.offerPrice * 0.5).toFixed(2);
  const pLink = paypalLink(upfront, submissionId, cardInfo?.name, psaData?.grade, psaData?.certNumber);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyle()}</style></head><body>
    <div class="wrap">${header()}
      <div class="body">
        <div class="alert" style="background:#14532d;border:1px solid #4ade80">
          <p style="margin:0;color:#4ade80;font-weight:bold">&#128226; Verification Approved &mdash; Send Upfront Payment</p>
        </div>
        <div class="section">
          <h3>&#128100; Seller Info</h3>
          ${rowTable([
            ['Name', sellerName, ''],
            ['Email', sellerEmail, ''],
            ['PayPal', paypalEmail || 'N/A', ''],
            ['Submission #', submissionId, ''],
          ])}
        </div>
        ${cardDetailsSection(cardInfo, psaData, offer)}
        <div class="section">
          <h3>&#128273; Verification Phrase</h3>
          <div class="phrase-box"><div class="phrase-code">${phrase}</div></div>
        </div>
        <div class="section" style="border:1px solid rgba(74,222,128,0.3)">
          <h3 style="color:#4ade80">&#128184; Upfront Payment Due</h3>
          ${rowTable([
            ['Amount', `$${upfront}`, 'green'],
            ['Send To', paypalEmail || 'N/A', ''],
          ])}
        </div>
        <div style="text-align:center;margin:20px 0">
          <a href="${pLink}" class="btn btn-green">&#128184; Send $${upfront} Upfront via PayPal</a>
        </div>
      </div>
      ${footer(submissionId)}
    </div>
  </body></html>`;
  return getResend().emails.send({ from: FROM, to: ADMIN, subject: `&#128226; Send Upfront: ${submissionId} - ${cardInfo.name} - $${upfront}`, html });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { type } = body;
    switch (type) {
      case 'pending_offer':
        await sendPendingOfferEmail(body);
        break;
      case 'pending_offer_followup':
        await sendPendingOfferFollowupEmail(body);
        break;
      case 'offer_accepted':
        await sendOfferAcceptedEmail(body);
        break;
      case 'verification_received':
        await sendVerificationReceivedEmail(body);
        break;
      case 'verification_approved':
        await sendVerificationApprovedEmail(body);
        await sendAdminEmail(body);
        break;
      case 'tracking_submitted':
        await sendTrackingSubmittedSellerEmail(body);
        await sendTrackingSubmittedAdminEmail(body);
        break;
      case 'card_received':
        await sendCardReceivedEmail(body);
        break;
      default:
        return Response.json({ error: 'Unknown email type' }, { status: 400 });
    }
    return Response.json({ success: true });
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
