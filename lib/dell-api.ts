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
