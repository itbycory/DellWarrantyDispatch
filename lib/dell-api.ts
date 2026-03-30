/**
 * Dell TechDirect API client
 * Handles OAuth2 token management and API calls.
 * Docs: https://techdirect.dell.com/portal/AboutAPIs.aspx
 *
 * Two environments:
 *   Production  (apigtwb2c.us.dell.com)   — Warranty lookup
 *   Sandbox     (apigtwb2cnp.us.dell.com)  — Tech Support, Self-Dispatch, GetCaseLite
 *
 * URLs are read from getConfig() at call time so GUI-saved settings
 * take effect immediately without a server restart.
 */
import { getConfig } from "@/lib/config"

// ─────────────────────────────────────────────────────────────────────────────
// Token caches
// ─────────────────────────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null
let sandboxCachedToken: { token: string; expiresAt: number } | null = null

/** Clear production token (call when production credentials change) */
export function clearTokenCache(): void {
  cachedToken = null
}

/** Clear sandbox token (call when sandbox credentials change) */
export function clearSandboxTokenCache(): void {
  sandboxCachedToken = null
}

/** Obtain a production OAuth2 token (used for Warranty API) */
export async function getDellAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

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

/** Obtain a sandbox OAuth2 token (used for Tech Support, Self-Dispatch, GetCaseLite) */
export async function getSandboxAccessToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (sandboxCachedToken && Date.now() < sandboxCachedToken.expiresAt - 60_000) {
    return sandboxCachedToken.token
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const tokenUrl =
    getConfig().dellSandboxTokenUrl ||
    "https://apigtwb2cnp.us.dell.com/auth/oauth/v2/token"

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell sandbox OAuth failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  sandboxCachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return sandboxCachedToken.token
}

// ─────────────────────────────────────────────────────────────────────────────
// Country helpers (Dell sandbox uses numeric ISO-3166 codes)
// ─────────────────────────────────────────────────────────────────────────────

const COUNTRY_NUMERIC_ISO: Record<string, string> = {
  AU: "036",
  US: "840",
  GB: "826",
  DE: "276",
  FR: "250",
  NZ: "554",
  CA: "124",
  SG: "702",
  IN: "356",
}

function countryToNumericIso(code: string): string {
  return COUNTRY_NUMERIC_ISO[code.toUpperCase()] ?? "036"
}

const COUNTRY_TIMEZONE: Record<string, string> = {
  AU: "AUS Eastern Standard Time",
  US: "Eastern Standard Time",
  GB: "GMT Standard Time",
  DE: "W. Europe Standard Time",
  FR: "Romance Standard Time",
  NZ: "New Zealand Standard Time",
  CA: "Eastern Standard Time",
  SG: "Singapore Standard Time",
  IN: "India Standard Time",
}

function countryToTimezone(code: string): string {
  return COUNTRY_TIMEZONE[code.toUpperCase()] ?? "UTC"
}

const PRIORITY_TO_SEVERITY: Record<string, string> = {
  LOW: "5",
  NORMAL: "4",
  HIGH: "2",
  CRITICAL: "1",
}

function priorityToSeverity(priority: string): string {
  return PRIORITY_TO_SEVERITY[priority.toUpperCase()] ?? "4"
}

// ─────────────────────────────────────────────────────────────────────────────
// Warranty API (Production)
// ─────────────────────────────────────────────────────────────────────────────

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

  const asset = Array.isArray(data) ? data[0] : data

  if (!asset) {
    throw new Error(`No warranty data found for service tag: ${serviceTag}`)
  }

  const entitlements: WarrantyEntitlement[] = asset.entitlements ?? []
  const now = new Date()

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

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Technical Support Requests API — WebCase REST (Sandbox)
// POST https://apigtwb2cnp.us.dell.com/td/sandbox/webcase
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
  /** Optional — used to populate the device model field */
  productName?: string
}

export interface TechSupportResponse {
  success: boolean
  caseNumber?: string
  message: string
  raw?: unknown
}

export async function createTechSupportCase(
  request: TechSupportRequest,
  clientId: string,
  clientSecret: string
): Promise<TechSupportResponse> {
  const token = await getSandboxAccessToken(clientId, clientSecret)
  const config = getConfig()
  const url = config.dellTechSupportUrl

  if (!url) {
    throw new Error("Technical Support API URL not configured.")
  }

  const uid = Date.now().toString()
  const now = new Date().toISOString().slice(0, 19) // "YYYY-MM-DDTHH:mm:ss"
  const severity = priorityToSeverity(request.priority)
  const countryIso = countryToNumericIso(config.orgCountry || "AU")
  const timezone = countryToTimezone(config.orgCountry || "AU")

  const payload = {
    trapId: `WEB-${uid}`,
    eventId: `WEB-${uid}`,
    eventSource: "MANUAL_ENTRY",
    timestamp: now,
    caseSeverity: severity,
    severity: severity,
    message: request.problemDescription,
    client: {
      id: `client-${uid}`,
      type: "CUSTOMER",
      hostname: "manual",
      ipAddress: "0.0.0.0",
      companyName: config.orgName || "Organisation",
      emailOptIn: false,
      countryCodeISO: countryIso,
      primaryContact: {
        firstName: request.contactFirstName,
        lastName: request.contactLastName,
        country: config.orgCountry || "AU",
        timeZone: timezone,
        phoneNumber: request.contactPhone,
        emailAddress: request.contactEmail,
        preferredContactMethod: "EMAIL",
        preferredContactTimeframe: "ANYTIME",
        preferredLanguage: "EN",
      },
    },
    shippingContact: {
      firstName: request.contactFirstName,
      lastName: request.contactLastName,
      emailAddress: request.contactEmail,
      phoneNumber: request.contactPhone,
      city: config.orgCity || "",
      state: "",
      country: config.orgCountry || "AU",
      zip: config.orgPostcode || "",
      addressLine1: config.orgAddressLine1 || "",
    },
    device: {
      ip: "0.0.0.0",
      model: request.productName ?? "",
      name: request.serviceTag.toUpperCase(),
      serviceTag: request.serviceTag.toUpperCase(),
      type: "LAPTOP",
      os: "Windows",
    },
  }

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
    throw new Error(
      `Dell Tech Support API failed (${res.status}): ${responseText}`
    )
  }

  const parsed = responseData as Record<string, unknown>
  const serviceRequest = parsed?.serviceRequest as Record<string, unknown> | undefined
  const caseNumber = (serviceRequest?.id as string) ?? undefined

  return {
    success: true,
    caseNumber,
    message: "Technical support case created successfully",
    raw: responseData,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Self-Dispatch REST API (Sandbox)
// POST https://apigtwb2cnp.us.dell.com/td/sandbox/dispatch/services/selfdispatch
// ─────────────────────────────────────────────────────────────────────────────

export interface SelfDispatchPartRequest {
  serviceTag: string
  problemDescription: string
  /** Human-readable description of the issue / part needed */
  partDescription: string
  /** Dell part number — defaults to "OTR" (other) if not specified */
  partNumber?: string
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
  const token = await getSandboxAccessToken(clientId, clientSecret)
  const config = getConfig()
  const url = config.dellSelfDispatchUrl

  if (!url) {
    throw new Error("Self-Dispatch API URL not configured.")
  }

  const country = request.country || config.orgCountry || "AU"
  const countryIso = countryToNumericIso(country)
  const timezone = countryToTimezone(country)

  const payload = {
    service_tag: request.serviceTag.toUpperCase(),
    customer: config.orgName || "Organisation",
    branch: request.addressLine1 || config.orgAddressLine1 || "",
    track: "NEXT_DAY",
    tech_email: request.contactEmail,
    primary_contact_name:
      `${request.contactFirstName} ${request.contactLastName}`.trim(),
    primary_contact_phone: request.contactPhone,
    primary_contact_email: request.contactEmail,
    ship_to_address: {
      country_iso_code: countryIso,
      city: request.city,
      state: "",
      zip_postal_code: request.postcode,
      address_line_1: request.addressLine1,
      time_zone: timezone,
    },
    request_on_site_technician: true,
    parts: [
      {
        part_number: request.partNumber ?? "OTR",
        ppid: "",
        quantity: 1,
      },
    ],
    problem_description: request.problemDescription,
    troubleshooting_note: request.partDescription || "",
  }

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
    throw new Error(
      `Dell Self-Dispatch API failed (${res.status}): ${responseText}`
    )
  }

  const parsed = responseData as Record<string, unknown>
  const caseNumber = (parsed?.code as string) ?? undefined

  return {
    success: true,
    caseNumber,
    message: "Self-dispatch request submitted successfully",
    raw: responseData,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GetCaseLite — status polling (Sandbox)
// POST https://apigtwb2cnp.us.dell.com/td/sandbox/getcaselite
// ─────────────────────────────────────────────────────────────────────────────

export async function getCaseLiteStatus(
  caseNumber: string,
  clientId: string,
  clientSecret: string
): Promise<CaseStatus> {
  const token = await getSandboxAccessToken(clientId, clientSecret)
  const url = getConfig().dellGetCaseLiteUrl

  if (!url) {
    throw new Error("GetCaseLite URL not configured.")
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      offset: "0",
      page_size: "1",
      code: caseNumber,
      additional_fields: ["StatusDescription", "UpdateTimeLocal"],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Dell GetCaseLite API failed (${res.status}): ${text}`)
  }

  const data = (await res.json()) as Record<string, unknown>
  const cases = (data?.cases as Record<string, unknown>[]) ?? []
  const first = cases[0] ?? {}

  const status =
    (first?.status as string) ??
    (first?.statusCode as string) ??
    null

  const statusDetail =
    (first?.statusDescription as string) ??
    (first?.updateTimeLocal as string) ??
    null

  return { caseNumber, status, statusDetail, raw: data }
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy submitDispatch — kept for reference, not used in current flow
// ─────────────────────────────────────────────────────────────────────────────

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
