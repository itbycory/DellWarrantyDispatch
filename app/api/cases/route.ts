import { NextRequest, NextResponse } from "next/server"
import { getAllCases, getActiveCases, saveCase } from "@/lib/cases"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active") === "true"
    const cases = active ? getActiveCases() : getAllCases()
    return NextResponse.json({ cases })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Log an issue locally without submitting to Dell */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const required = [
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

    // Generate a local reference number
    const localRef = `LOG-${Date.now().toString(36).toUpperCase()}`

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
      caseNumber: localRef,
      type: "dispatch",
      serviceTag: (body.serviceTag as string).toUpperCase(),
      productName: body.productName ?? "",
      issueDescription: body.issueDescription,
      severity: body.severity ?? "NORMAL",
      submittedAt: new Date().toISOString(),
      contact: `${body.contactFirstName} ${body.contactLastName}`.trim(),
      contactEmail: body.contactEmail,
      site,
      displayName: body.displayName ?? "",
      status: null,
      statusDetail: null,
      lastStatusCheck: null,
    })

    return NextResponse.json({ caseNumber: localRef, success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
