import { NextRequest, NextResponse } from "next/server"
import { lookupWarranty } from "@/lib/dell-api"

export async function GET(request: NextRequest) {
  const serviceTag = request.nextUrl.searchParams.get("serviceTag")?.trim()

  if (!serviceTag) {
    return NextResponse.json(
      { error: "serviceTag query parameter is required" },
      { status: 400 }
    )
  }

  const clientId = process.env.DELL_CLIENT_ID
  const clientSecret = process.env.DELL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      {
        error:
          "Dell API credentials not configured. Set DELL_CLIENT_ID and DELL_CLIENT_SECRET in your .env.local file.",
      },
      { status: 503 }
    )
  }

  try {
    const result = await lookupWarranty(serviceTag, clientId, clientSecret)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[warranty] Error for ${serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
