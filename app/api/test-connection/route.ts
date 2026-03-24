import { NextRequest, NextResponse } from "next/server"
import { getDellAccessToken } from "@/lib/dell-api"

export async function POST(request: NextRequest) {
  const { clientId, clientSecret } = await request.json()

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Client ID and Client Secret are required" },
      { status: 400 }
    )
  }

  try {
    await getDellAccessToken(clientId, clientSecret)
    return NextResponse.json({ success: true, message: "Connected successfully" })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 401 })
  }
}
