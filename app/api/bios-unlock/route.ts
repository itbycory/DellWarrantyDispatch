/**
 * POST /api/bios-unlock
 * Submits a Tech Support case to Dell requesting a BIOS password unlock code
 * for the provided service tag.
 */
import { NextRequest, NextResponse } from "next/server"
import { getSandboxAccessToken } from "@/lib/dell-api"
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

  let body: { serviceTag: string; displayName?: string; productName?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (!body.serviceTag) {
    return NextResponse.json(
      { error: "Missing required field: serviceTag" },
      { status: 400 }
    )
  }

  const config = getConfig()
  const { dellSandboxClientId, dellSandboxClientSecret } = config
  const url = config.dellTechSupportUrl

  if (!url) {
    return NextResponse.json(
      { error: "Tech Support API URL not configured." },
      { status: 503 }
    )
  }

  const serviceTag = body.serviceTag.toUpperCase().trim()
  const uid = Date.now().toString()
  const now = new Date().toISOString().slice(0, 19)

  // Country helpers (inline since we can't import private helpers from dell-api)
  const COUNTRY_ISO: Record<string, string> = {
    AU: "036", US: "840", GB: "826", DE: "276", FR: "250", NZ: "554",
  }
  const COUNTRY_TZ: Record<string, string> = {
    AU: "AUS Eastern Standard Time",
    US: "Eastern Standard Time",
    GB: "GMT Standard Time",
    DE: "W. Europe Standard Time",
    FR: "Romance Standard Time",
    NZ: "New Zealand Standard Time",
  }

  const country = config.orgCountry || "AU"
  const countryIso = COUNTRY_ISO[country] ?? "036"
  const timezone = COUNTRY_TZ[country] ?? "UTC"

  const contactFirst = config.orgContactName.split(" ")[0] || "IT"
  const contactLast = config.orgContactName.split(" ").slice(1).join(" ") || "Admin"
  const contactEmail = config.orgContactEmail || ""
  const contactPhone = config.orgContactPhone || ""

  const problemTitle = "BIOS Password Unlock Code Required"
  const problemDescription =
    `We require a BIOS password unlock code for a Dell device with service tag ${serviceTag}. ` +
    `This device belongs to ${config.orgName || "our organisation"} and the BIOS password is unknown. ` +
    `Please provide the master unlock code so we can regain access. ` +
    `Service Tag: ${serviceTag}.`

  const payload = {
    trapId: `BIOS-${uid}`,
    eventId: `BIOS-${uid}`,
    eventSource: "MANUAL_ENTRY",
    timestamp: now,
    caseSeverity: "4",
    severity: "4",
    message: problemDescription,
    client: {
      id: `client-${uid}`,
      type: "CUSTOMER",
      hostname: "manual",
      ipAddress: "0.0.0.0",
      companyName: config.orgName || "Organisation",
      emailOptIn: false,
      countryCodeISO: countryIso,
      primaryContact: {
        firstName: contactFirst,
        lastName: contactLast,
        country,
        timeZone: timezone,
        phoneNumber: contactPhone,
        emailAddress: contactEmail,
        preferredContactMethod: "EMAIL",
        preferredContactTimeframe: "ANYTIME",
        preferredLanguage: "EN",
      },
    },
    shippingContact: {
      firstName: contactFirst,
      lastName: contactLast,
      emailAddress: contactEmail,
      phoneNumber: contactPhone,
      city: config.orgCity || "",
      state: "",
      country,
      zip: config.orgPostcode || "",
      addressLine1: config.orgAddressLine1 || "",
    },
    device: {
      ip: "0.0.0.0",
      model: body.productName ?? "",
      name: serviceTag,
      serviceTag,
      type: "LAPTOP",
      os: "Windows",
    },
  }

  try {
    const token = await getSandboxAccessToken(dellSandboxClientId, dellSandboxClientSecret)

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await res.text()
    let responseData: unknown
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = responseText
    }

    if (!res.ok) {
      throw new Error(`Dell Tech Support API failed (${res.status}): ${responseText}`)
    }

    const parsed = responseData as Record<string, unknown>
    const serviceRequest = parsed?.serviceRequest as Record<string, unknown> | undefined
    const caseNumber = (serviceRequest?.id as string) ?? undefined

    // Save case locally whether or not Dell returned a case number
    const localRef = caseNumber ?? `LOG-${Date.now().toString(36).toUpperCase()}`
    saveCase({
      caseNumber: localRef,
      type: "tech-support",
      serviceTag,
      productName: body.productName ?? "",
      issueDescription: `${problemTitle}: ${problemDescription}`,
      severity: "NORMAL",
      submittedAt: new Date().toISOString(),
      contact: config.orgContactName || "IT Admin",
      contactEmail,
      site: "",
      displayName: body.displayName ?? serviceTag,
      status: "Open",
      statusDetail: null,
      lastStatusCheck: null,
    })

    return NextResponse.json({
      success: true,
      caseNumber: localRef,
      message: caseNumber
        ? `BIOS unlock case submitted to Dell — Case #${caseNumber}`
        : "Request submitted and logged locally",
      raw: responseData,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[bios-unlock] Error for ${serviceTag}:`, message)

    // Still log locally so nothing is lost
    const localRef = `LOG-${Date.now().toString(36).toUpperCase()}`
    saveCase({
      caseNumber: localRef,
      type: "tech-support",
      serviceTag,
      productName: body.productName ?? "",
      issueDescription: `${problemTitle}: ${problemDescription}`,
      severity: "NORMAL",
      submittedAt: new Date().toISOString(),
      contact: config.orgContactName || "IT Admin",
      contactEmail: config.orgContactEmail || "",
      site: "",
      displayName: body.displayName ?? serviceTag,
      status: "Pending — API Error",
      statusDetail: message,
      lastStatusCheck: null,
    })

    return NextResponse.json({ error: message, localRef }, { status: 500 })
  }
}
