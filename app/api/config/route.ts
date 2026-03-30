import { NextRequest, NextResponse } from "next/server"
import { getConfig, writeConfig, isConfigured, isSandboxConfigured } from "@/lib/config"
import { clearTokenCache, clearSandboxTokenCache } from "@/lib/dell-api"

export async function GET() {
  const cfg = getConfig()

  return NextResponse.json({
    configured: isConfigured(),
    sandboxConfigured: isSandboxConfigured(),
    // Production credentials: indicate whether set but never expose values
    dellClientIdSet: !!cfg.dellClientId,
    dellClientSecretSet: !!cfg.dellClientSecret,
    // Sandbox credentials: indicate whether set but never expose values
    dellSandboxClientIdSet: !!cfg.dellSandboxClientId,
    dellSandboxClientSecretSet: !!cfg.dellSandboxClientSecret,
    // Production endpoints
    dellTokenUrl: cfg.dellTokenUrl,
    dellWarrantyUrl: cfg.dellWarrantyUrl,
    dellDispatchUrl: cfg.dellDispatchUrl,
    // Sandbox endpoints
    dellSandboxTokenUrl: cfg.dellSandboxTokenUrl,
    dellTechSupportUrl: cfg.dellTechSupportUrl,
    dellSelfDispatchUrl: cfg.dellSelfDispatchUrl,
    dellGetCaseLiteUrl: cfg.dellGetCaseLiteUrl,
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
    // Clear both token caches so new credentials take effect immediately
    clearTokenCache()
    clearSandboxTokenCache()
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
