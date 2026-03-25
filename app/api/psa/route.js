export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const certNumber = searchParams.get("cert");

  if (!certNumber) {
    return Response.json({ error: "No cert number provided" }, { status: 400 });
  }

  // Validate PSA cert format — 7 to 9 digits
  if (!/^\d{7,9}$/.test(certNumber.trim())) {
    return Response.json({ error: "Invalid PSA cert number format" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`,
      {
        headers: {
          Authorization: `bearer ${process.env.PSA_API_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return Response.json({ error: "PSA lookup failed" }, { status: res.status });
    }

    const data = await res.json();
    const cert = data.PSACert;

    return Response.json({
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
    });
  } catch (err) {
    return Response.json({ error: "Server error", detail: err.message }, { status: 500 });
  }
}