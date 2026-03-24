import { NextRequest, NextResponse } from "next/server"
import { submitDispatch, type DispatchRequest } from "@/lib/dell-api"
import { getConfig, isConfigured } from "@/lib/config"
import { saveCase } from "@/lib/cases"

export async function POST(request: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      {
        error:
          "Dell API credentials are not configured. Go to Settings to add your Client ID and Secret.",
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

  const { dellClientId, dellClientSecret } = getConfig()

  try {
    const result = await submitDispatch(body, dellClientId, dellClientSecret)

    // Persist the case locally so it appears in the Cases tracker
    if (result.caseNumber) {
      const site = [
        body.addressLine1,
        body.addressLine2,
        body.city,
        body.postcode,
        body.country,
      ]
        .filter(Boolean)
        .join(", ")

      saveCase({
        caseNumber: result.caseNumber,
        serviceTag: body.serviceTag.toUpperCase(),
        productName: "",  // not available at dispatch time; shown from warranty lookup
        issueDescription: body.issueDescription,
        severity: body.severity,
        submittedAt: new Date().toISOString(),
        contact: `${body.contactFirstName} ${body.contactLastName}`.trim(),
        contactEmail: body.contactEmail,
        site,
        status: null,
        statusDetail: null,
        lastStatusCheck: null,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[dispatch] Error for ${body.serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
