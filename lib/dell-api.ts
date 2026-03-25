/**
 * Dell TechDirect API client
 * Handles OAuth2 token management and API calls.
 * Docs: https://techdirect.dell.com/portal/AboutAPIs.aspx
 *
 * URLs are read from getConfig() at call time so GUI-saved settings
 * take effect immediately without a server restart.
 */
import { getConfig } from "@/lib/config"

// Simple in-process token cache
let cachedToken: { token: string; expiresAt: number } | null = null

/** Call this when credentials change so the old token isn't reused */
export function clearTokenCache(): void {
  cachedToken = null
}

export async function getDellAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  )

  const res = await fetch(getConfig().dellTokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell OAuth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return cachedToken.token
}

export interface WarrantyEntitlement {
  itemNumber: string
  startDate: string
  endDate: string
  entitlementType: string
  serviceLevelCode: string
  serviceLevelDescription: string
  serviceLevelGroup: number
}

export interface WarrantyResult {
  serviceTag: string
  productLineDescription: string
  productId: string
  shipDate: string
  countryCode: string
  entitlements: WarrantyEntitlement[]
  inWarranty: boolean
  warrantyEnd: string | null
  bestServiceLevel: string | null
}

export async function lookupWarranty(
  serviceTag: string,
  clientId: string,
  clientSecret: string
): Promise<WarrantyResult> {
  const token = await getDellAccessToken(clientId, clientSecret)

  const url = new URL(getConfig().dellWarrantyUrl)
  url.searchParams.set("servicetags", serviceTag.toUpperCase())

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell warranty API failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  // API returns an array; pick the first matching entry
  const asset = Array.isArray(data) ? data[0] : data

  if (!asset) {
    throw new Error(`No warranty data found for service tag: ${serviceTag}`)
  }

  const entitlements: WarrantyEntitlement[] = asset.entitlements ?? []
  const now = new Date()

  // Find the entitlement with the latest end date that is still active
  const activeEntitlements = entitlements.filter(
    (e) => new Date(e.endDate) >= now
  )

  const bestEntitlement =
    activeEntitlements.length > 0
      ? activeEntitlements.sort(
          (a, b) =>
            new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
        )[0]
      : null

  return {
    serviceTag: asset.serviceTag ?? serviceTag,
    productLineDescription: asset.productLineDescription ?? "Unknown",
    productId: asset.productId ?? "",
    shipDate: asset.shipDate ?? "",
    countryCode: asset.countryCode ?? "",
    entitlements,
    inWarranty: activeEntitlements.length > 0,
    warrantyEnd: bestEntitlement?.endDate ?? null,
    bestServiceLevel: bestEntitlement?.serviceLevelDescription ?? null,
  }
}

export interface DispatchRequest {
  serviceTag: string
  issueDescription: string
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  addressLine1: string
  addressLine2?: string
  city: string
  postcode: string
  country: string
  preferredContactTime?: string
  severity: "NORMAL" | "CRITICAL"
}

export interface DispatchResponse {
  success: boolean
  caseNumber?: string
  message: string
  raw?: unknown
}

export interface CaseStatus {
  caseNumber: string
  status: string | null
  statusDetail: string | null
  raw: unknown
}

export async function submitDispatch(
  request: DispatchRequest,
  clientId: string,
  clientSecret: string
): Promise<DispatchResponse> {
  const token = await getDellAccessToken(clientId, clientSecret)

  const payload = {
    serviceTag: request.serviceTag.toUpperCase(),
    dispatchType: "ONSITE",
    severity: request.severity,
    problemDescription: request.issueDescription,
    contactInfo: {
      firstName: request.contactFirstName,
      lastName: request.contactLastName,
      email: request.contactEmail,
      phone: request.contactPhone,
    },
    dispatchAddress: {
      addressLine1: request.addressLine1,
      addressLine2: request.addressLine2 ?? "",
      city: request.city,
      postCode: request.postcode,
      countryCode: request.country,
    },
    ...(request.preferredContactTime && {
      preferredContactTime: request.preferredContactTime,
    }),
  }

  const res = await fetch(getConfig().dellDispatchUrl, {
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
    // 403 typically means dispatch API access not enabled on your TechDirect account
    if (res.status === 403) {
      throw new Error(
        "Dispatch API access denied (403). You may need to request dispatch API permissions on your Dell TechDirect account at techdirect.dell.com"
      )
    }
    throw new Error(
      `Dell dispatch API failed (${res.status}): ${responseText}`
    )
  }

  const parsed = responseData as Record<string, unknown>

  return {
    success: true,
    caseNumber:
      (parsed?.caseNumber as string) ??
      (parsed?.dispatchId as string) ??
      (parsed?.id as string) ??
      undefined,
    message: "Dispatch request submitted successfully",
    raw: responseData,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Technical Support Requests API
//
// Dell's Technical Support API is currently SOAP-based. The SOAP envelope
// structure below is based on standard Dell TechDirect SOAP patterns.
// Once you receive your SDK docs, verify the namespace, SOAPAction header,
// and element names against the provided WSDL and update accordingly.
// ─────────────────────────────────────────────────────────────────────────────

export interface TechSupportRequest {
  serviceTag: string
  problemTitle: string
  problemDescription: string
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
}

export interface TechSupportResponse {
  success: boolean
  caseNumber?: string
  message: string
  raw?: unknown
}

/** Extract the text content of a named XML element (first occurrence). */
function extractXmlValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<(?:[^:>]+:)?${tag}[^>]*>([^<]*)<`, "i"))
  return match ? match[1].trim() : null
}

function buildSoapEnvelope(body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:tns="http://dell.com/techdirect/support/v1">
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`
}

export async function createTechSupportCase(
  request: TechSupportRequest,
  clientId: string,
  clientSecret: string
): Promise<TechSupportResponse> {
  const token = await getDellAccessToken(clientId, clientSecret)
  const url = getConfig().dellTechSupportUrl

  if (!url) {
    throw new Error(
      "Technical Support API URL not configured. Add it in Settings → Advanced once you receive your Dell SDK documentation."
    )
  }

  const soapBody = `
    <tns:CreateSupportRequest>
      <tns:serviceTag>${escapeXml(request.serviceTag.toUpperCase())}</tns:serviceTag>
      <tns:problemSummary>${escapeXml(request.problemTitle)}</tns:problemSummary>
      <tns:problemDescription>${escapeXml(request.problemDescription)}</tns:problemDescription>
      <tns:priority>${request.priority}</tns:priority>
      <tns:contactInfo>
        <tns:firstName>${escapeXml(request.contactFirstName)}</tns:firstName>
        <tns:lastName>${escapeXml(request.contactLastName)}</tns:lastName>
        <tns:email>${escapeXml(request.contactEmail)}</tns:email>
        <tns:phone>${escapeXml(request.contactPhone)}</tns:phone>
      </tns:contactInfo>
    </tns:CreateSupportRequest>`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "createSupportRequest",
    },
    body: buildSoapEnvelope(soapBody),
  })

  const responseText = await res.text()

  if (!res.ok) {
    throw new Error(`Dell Tech Support API failed (${res.status}): ${responseText}`)
  }

  const caseNumber =
    extractXmlValue(responseText, "caseNumber") ??
    extractXmlValue(responseText, "CaseNumber") ??
    extractXmlValue(responseText, "caseId") ??
    undefined

  return {
    success: true,
    caseNumber,
    message: "Technical support case created successfully",
    raw: responseText,
  }
}

export async function getTechSupportCaseStatus(
  caseNumber: string,
  clientId: string,
  clientSecret: string
): Promise<CaseStatus> {
  const token = await getDellAccessToken(clientId, clientSecret)
  const url = getConfig().dellTechSupportUrl

  if (!url) {
    throw new Error("Technical Support API URL not configured.")
  }

  const soapBody = `
    <tns:GetSupportRequestStatus>
      <tns:caseNumber>${escapeXml(caseNumber)}</tns:caseNumber>
    </tns:GetSupportRequestStatus>`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "getSupportRequestStatus",
    },
    body: buildSoapEnvelope(soapBody),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell Tech Support status API failed (${res.status}): ${text}`)
  }

  const xml = await res.text()
  const status =
    extractXmlValue(xml, "status") ??
    extractXmlValue(xml, "caseStatus") ??
    null
  const statusDetail =
    extractXmlValue(xml, "statusDescription") ??
    extractXmlValue(xml, "notes") ??
    null

  return { caseNumber, status, statusDetail, raw: xml }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// ─────────────────────────────────────────────────────────────────────────────
// Self Dispatch Support Requests API
//
// Allows you to request replacement parts and fit them yourself (requires
// self-dispatch training completion on TechDirect).
// Same SOAP caveat applies — verify against your SDK WSDL when received.
// ─────────────────────────────────────────────────────────────────────────────

export interface SelfDispatchPartRequest {
  serviceTag: string
  problemDescription: string
  partDescription: string  // describe the part needed / fault
  contactFirstName: string
  contactLastName: string
  contactEmail: string
  contactPhone: string
  addressLine1: string
  addressLine2?: string
  city: string
  postcode: string
  country: string
}

export async function createSelfDispatchRequest(
  request: SelfDispatchPartRequest,
  clientId: string,
  clientSecret: string
): Promise<DispatchResponse> {
  const token = await getDellAccessToken(clientId, clientSecret)
  const url = getConfig().dellSelfDispatchUrl

  if (!url) {
    throw new Error(
      "Self Dispatch API URL not configured. Add it in Settings → Advanced once you receive your Dell SDK documentation."
    )
  }

  const soapBody = `
    <tns:CreateSelfDispatchRequest>
      <tns:serviceTag>${escapeXml(request.serviceTag.toUpperCase())}</tns:serviceTag>
      <tns:problemDescription>${escapeXml(request.problemDescription)}</tns:problemDescription>
      <tns:partDescription>${escapeXml(request.partDescription)}</tns:partDescription>
      <tns:contactInfo>
        <tns:firstName>${escapeXml(request.contactFirstName)}</tns:firstName>
        <tns:lastName>${escapeXml(request.contactLastName)}</tns:lastName>
        <tns:email>${escapeXml(request.contactEmail)}</tns:email>
        <tns:phone>${escapeXml(request.contactPhone)}</tns:phone>
      </tns:contactInfo>
      <tns:deliveryAddress>
        <tns:addressLine1>${escapeXml(request.addressLine1)}</tns:addressLine1>
        <tns:addressLine2>${escapeXml(request.addressLine2 ?? "")}</tns:addressLine2>
        <tns:city>${escapeXml(request.city)}</tns:city>
        <tns:postCode>${escapeXml(request.postcode)}</tns:postCode>
        <tns:countryCode>${escapeXml(request.country)}</tns:countryCode>
      </tns:deliveryAddress>
    </tns:CreateSelfDispatchRequest>`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "createSelfDispatchRequest",
    },
    body: buildSoapEnvelope(soapBody),
  })

  const responseText = await res.text()

  if (!res.ok) {
    throw new Error(`Dell Self Dispatch API failed (${res.status}): ${responseText}`)
  }

  const caseNumber =
    extractXmlValue(responseText, "caseNumber") ??
    extractXmlValue(responseText, "dispatchId") ??
    extractXmlValue(responseText, "requestId") ??
    undefined

  return {
    success: true,
    caseNumber,
    message: "Self dispatch request submitted successfully",
    raw: responseText,
  }
}

/**
 * Fetches the current status of a submitted dispatch case.
 * Uses GET {dellDispatchUrl}/{caseNumber} — standard REST pattern
 * for the same base URL as the dispatch submission endpoint.
 */
export async function getCaseStatus(
  caseNumber: string,
  clientId: string,
  clientSecret: string
): Promise<CaseStatus> {
  const token = await getDellAccessToken(clientId, clientSecret)
  const url = `${getConfig().dellDispatchUrl}/${encodeURIComponent(caseNumber)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell case status API failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as Record<string, unknown>

  // Try common field names — Dell API response shape may vary
  const status =
    (data?.caseStatus as string) ??
    (data?.status as string) ??
    (data?.dispatchStatus as string) ??
    null

  const statusDetail =
    (data?.statusDescription as string) ??
    (data?.description as string) ??
    (data?.notes as string) ??
    null

  return { caseNumber, status, statusDetail, raw: data }
}
