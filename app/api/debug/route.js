export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY;
  const ebayAppId = process.env.EBAY_APP_ID;
  const ebaySecret = process.env.EBAY_CLIENT_SECRET;
  return Response.json({
    hasAnthropicKey: !!key,
    hasEbayAppId: !!ebayAppId,
    ebayAppIdLength: ebayAppId?.length,
    ebayAppIdStart: ebayAppId?.substring(0, 10),
    hasEbaySecret: !!ebaySecret,
    ebaySecretLength: ebaySecret?.length,
  });
}
