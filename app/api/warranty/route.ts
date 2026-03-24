import { NextRequest, NextResponse } from "next/server"
import { lookupWarranty } from "@/lib/dell-api"
import { getConfig, isConfigured } from "@/lib/config"

export async function GET(request: NextRequest) {
  const serviceTag = request.nextUrl.searchParams.get("serviceTag")?.trim()

  if (!serviceTag) {
    return NextResponse.json(
      { error: "serviceTag query parameter is required" },
      { status: 400 }
    )
  }

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Dell API credentials are not configured. Go to Settings to add your Client ID and Secret.",
      },
      { status: 503 }
    )
  }

  const { dellClientId, dellClientSecret } = getConfig()

  try {
    const result = await lookupWarranty(serviceTag, dellClientId, dellClientSecret)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[warranty] Error for ${serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
