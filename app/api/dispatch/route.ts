import { NextRequest, NextResponse } from "next/server"
import { submitDispatch, type DispatchRequest } from "@/lib/dell-api"

export async function POST(request: NextRequest) {
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

  let body: DispatchRequest

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const required: (keyof DispatchRequest)[] = [
    "serviceTag",
    "issueDescription",
    "contactFirstName",
    "contactLastName",
    "contactEmail",
    "contactPhone",
    "addressLine1",
    "city",
    "postcode",
    "country",
  ]

  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      )
    }
  }

  try {
    const result = await submitDispatch(body, clientId, clientSecret)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[dispatch] Error for ${body.serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
