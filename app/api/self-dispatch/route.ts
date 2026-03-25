import { NextRequest, NextResponse } from "next/server"
import { createSelfDispatchRequest, type SelfDispatchPartRequest } from "@/lib/dell-api"
import { getConfig, isConfigured } from "@/lib/config"
import { saveCase } from "@/lib/cases"

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Dell API credentials are not configured. Go to Settings to add your Client ID and Secret." },
      { status: 503 }
    )
  }

  let body: SelfDispatchPartRequest & { displayName?: string; productName?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const required: (keyof SelfDispatchPartRequest)[] = [
    "serviceTag",
    "problemDescription",
    "partDescription",
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
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
    }
  }

  const { dellClientId, dellClientSecret } = getConfig()

  try {
    const result = await createSelfDispatchRequest(body, dellClientId, dellClientSecret)

    if (result.caseNumber) {
      const site = [body.addressLine1, body.addressLine2, body.city, body.postcode, body.country]
        .filter(Boolean)
        .join(", ")

      saveCase({
        caseNumber: result.caseNumber,
        type: "self-dispatch",
        serviceTag: body.serviceTag.toUpperCase(),
        productName: body.productName ?? "",
        issueDescription: `Parts request: ${body.partDescription}\n${body.problemDescription}`,
        severity: "NORMAL",
        submittedAt: new Date().toISOString(),
        contact: `${body.contactFirstName} ${body.contactLastName}`.trim(),
        contactEmail: body.contactEmail,
        site,
        displayName: body.displayName ?? "",
        status: "Parts Requested",
        statusDetail: null,
        lastStatusCheck: null,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[self-dispatch] Error for ${body.serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
