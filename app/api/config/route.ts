import { NextRequest, NextResponse } from "next/server"
import { getConfig, writeConfig, isConfigured } from "@/lib/config"
import { clearTokenCache } from "@/lib/dell-api"

export async function GET() {
  const cfg = getConfig()

  return NextResponse.json({
    configured: isConfigured(),
    // Credentials: indicate whether set but never expose the values
    dellClientIdSet: !!cfg.dellClientId,
    dellClientSecretSet: !!cfg.dellClientSecret,
    // Endpoints
    dellTokenUrl: cfg.dellTokenUrl,
    dellWarrantyUrl: cfg.dellWarrantyUrl,
    dellDispatchUrl: cfg.dellDispatchUrl,
    // Org details (not sensitive)
    orgName: cfg.orgName,
    orgContactName: cfg.orgContactName,
    orgContactEmail: cfg.orgContactEmail,
    orgContactPhone: cfg.orgContactPhone,
    orgAddressLine1: cfg.orgAddressLine1,
    orgAddressLine2: cfg.orgAddressLine2,
    orgCity: cfg.orgCity,
    orgPostcode: cfg.orgPostcode,
    orgCountry: cfg.orgCountry,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    writeConfig(body)
    // Clear the cached OAuth token so it's re-fetched with new credentials
    clearTokenCache()
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
