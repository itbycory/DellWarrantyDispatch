import { NextRequest, NextResponse } from "next/server"
import { createTechSupportCase, type TechSupportRequest } from "@/lib/dell-api"
import { getConfig, isSandboxConfigured } from "@/lib/config"
import { saveCase } from "@/lib/cases"

export async function POST(request: NextRequest) {
  if (!isSandboxConfigured()) {
    return NextResponse.json(
      {
        error:
          "Sandbox API credentials are not configured. Go to Settings to add your Sandbox Client ID and Secret.",
      },
      { status: 503 }
    )
  }

  let body: TechSupportRequest & { displayName?: string; productName?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const required: (keyof TechSupportRequest)[] = [
    "serviceTag",
    "problemTitle",
    "problemDescription",
    "contactFirstName",
    "contactLastName",
    "contactEmail",
    "contactPhone",
  ]

  for (const field of required) {
    if (!body[field]) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      )
    }
  }

  const { dellSandboxClientId, dellSandboxClientSecret } = getConfig()

  try {
    const result = await createTechSupportCase(
      body,
      dellSandboxClientId,
      dellSandboxClientSecret
    )

    if (result.caseNumber) {
      saveCase({
        caseNumber: result.caseNumber,
        type: "tech-support",
        serviceTag: body.serviceTag.toUpperCase(),
        productName: body.productName ?? "",
        issueDescription: `${body.problemTitle}: ${body.problemDescription}`,
        severity:
          body.priority === "CRITICAL" || body.priority === "HIGH"
            ? "CRITICAL"
            : "NORMAL",
        submittedAt: new Date().toISOString(),
        contact: `${body.contactFirstName} ${body.contactLastName}`.trim(),
        contactEmail: body.contactEmail,
        site: "",
        displayName: body.displayName ?? "",
        status: "Open",
        statusDetail: null,
        lastStatusCheck: null,
      })
    }

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[support] Error for ${body.serviceTag}:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
