import { NextResponse } from "next/server";
import { fetchUsdRates } from "@/lib/finance/fx";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols") ?? "COP,MXN,EUR";
  const symbols = symbolsParam
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  try {
    const rates = await fetchUsdRates(symbols);
    return NextResponse.json(
      { base: "USD", rates, asOf: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    console.error("fx route", err);
    return NextResponse.json(
      { error: "No se pudieron obtener las tasas de cambio." },
      { status: 502 },
    );
  }
}
