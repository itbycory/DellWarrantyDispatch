import fs from "fs"
import path from "path"

const CONFIG_PATH =
  process.env.CONFIG_PATH ?? path.join(process.cwd(), "data", "config.json")

export interface AppConfig {
  // Production credentials — used for Warranty API (apigtwb2c.us.dell.com)
  dellClientId: string
  dellClientSecret: string
  dellTokenUrl: string
  dellWarrantyUrl: string
  dellDispatchUrl: string
  // Sandbox credentials — used for Tech Support & Self-Dispatch APIs (apigtwb2cnp.us.dell.com)
  dellSandboxClientId: string
  dellSandboxClientSecret: string
  dellSandboxTokenUrl: string
  /** Tech Support Requests REST API endpoint */
  dellTechSupportUrl: string
  /** Self-Dispatch REST API endpoint */
  dellSelfDispatchUrl: string
  /** GetCaseLite REST API endpoint — for polling case status */
  dellGetCaseLiteUrl: string
  orgName: string
  orgContactName: string
  orgContactEmail: string
  orgContactPhone: string
  orgAddressLine1: string
  orgAddressLine2: string
  orgCity: string
  orgPostcode: string
  orgCountry: string
}

const DEFAULTS: AppConfig = {
  // Production (warranty)
  dellClientId: "",
  dellClientSecret: "",
  dellTokenUrl: "https://apigtwb2c.us.dell.com/auth/oauth/v2/token",
  dellWarrantyUrl:
    "https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements",
  dellDispatchUrl:
    "https://apigtwb2c.us.dell.com/PROD/support/cases/v2/dispatch",
  // Sandbox (Tech Support & Self-Dispatch)
  dellSandboxClientId: "",
  dellSandboxClientSecret: "",
  dellSandboxTokenUrl: "https://apigtwb2cnp.us.dell.com/auth/oauth/v2/token",
  dellTechSupportUrl: "https://apigtwb2cnp.us.dell.com/td/sandbox/webcase",
  dellSelfDispatchUrl:
    "https://apigtwb2cnp.us.dell.com/td/sandbox/dispatch/services/selfdispatch",
  dellGetCaseLiteUrl: "https://apigtwb2cnp.us.dell.com/td/sandbox/getcaselite",
  orgName: "",
  orgContactName: "",
  orgContactEmail: "",
  orgContactPhone: "",
  orgAddressLine1: "",
  orgAddressLine2: "",
  orgCity: "",
  orgPostcode: "",
  orgCountry: "AU",
}

function readFileConfig(): Partial<AppConfig> {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"))
  } catch {
    return {}
  }
}

export function writeConfig(updates: Partial<AppConfig>): void {
  const existing = readFileConfig()
  const merged = { ...existing, ...updates }
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2))
}

/**
 * Returns the effective config with this precedence:
 * 1. GUI-saved file config  (data/config.json)
 * 2. Environment variables  (.env.local / Docker env)
 * 3. Built-in defaults
 */
export function getConfig(): AppConfig {
  const f = readFileConfig()
  const e = process.env

  return {
    // Production
    dellClientId: f.dellClientId || e.DELL_CLIENT_ID || DEFAULTS.dellClientId,
    dellClientSecret:
      f.dellClientSecret || e.DELL_CLIENT_SECRET || DEFAULTS.dellClientSecret,
    dellTokenUrl:
      f.dellTokenUrl || e.DELL_TOKEN_URL || DEFAULTS.dellTokenUrl,
    dellWarrantyUrl:
      f.dellWarrantyUrl || e.DELL_WARRANTY_URL || DEFAULTS.dellWarrantyUrl,
    dellDispatchUrl:
      f.dellDispatchUrl || e.DELL_DISPATCH_URL || DEFAULTS.dellDispatchUrl,
    // Sandbox
    dellSandboxClientId:
      f.dellSandboxClientId || e.DELL_SANDBOX_CLIENT_ID || DEFAULTS.dellSandboxClientId,
    dellSandboxClientSecret:
      f.dellSandboxClientSecret || e.DELL_SANDBOX_CLIENT_SECRET || DEFAULTS.dellSandboxClientSecret,
    dellSandboxTokenUrl:
      f.dellSandboxTokenUrl || e.DELL_SANDBOX_TOKEN_URL || DEFAULTS.dellSandboxTokenUrl,
    dellTechSupportUrl:
      f.dellTechSupportUrl || e.DELL_TECH_SUPPORT_URL || DEFAULTS.dellTechSupportUrl,
    dellSelfDispatchUrl:
      f.dellSelfDispatchUrl || e.DELL_SELF_DISPATCH_URL || DEFAULTS.dellSelfDispatchUrl,
    dellGetCaseLiteUrl:
      f.dellGetCaseLiteUrl || e.DELL_GET_CASE_LITE_URL || DEFAULTS.dellGetCaseLiteUrl,
    // Org
    orgName: f.orgName || e.ORG_NAME || DEFAULTS.orgName,
    orgContactName:
      f.orgContactName || e.ORG_CONTACT_NAME || DEFAULTS.orgContactName,
    orgContactEmail:
      f.orgContactEmail || e.ORG_CONTACT_EMAIL || DEFAULTS.orgContactEmail,
    orgContactPhone:
      f.orgContactPhone || e.ORG_CONTACT_PHONE || DEFAULTS.orgContactPhone,
    orgAddressLine1:
      f.orgAddressLine1 || e.ORG_ADDRESS_LINE1 || DEFAULTS.orgAddressLine1,
    orgAddressLine2:
      f.orgAddressLine2 ?? e.ORG_ADDRESS_LINE2 ?? DEFAULTS.orgAddressLine2,
    orgCity: f.orgCity || e.ORG_CITY || DEFAULTS.orgCity,
    orgPostcode: f.orgPostcode || e.ORG_POSTCODE || DEFAULTS.orgPostcode,
    orgCountry: f.orgCountry || e.ORG_COUNTRY || DEFAULTS.orgCountry,
  }
}

/** True when production (warranty) credentials are configured */
export function isConfigured(): boolean {
  const cfg = getConfig()
  return !!(cfg.dellClientId && cfg.dellClientSecret)
}

/** True when sandbox (Tech Support / Self-Dispatch) credentials are configured */
export function isSandboxConfigured(): boolean {
  const cfg = getConfig()
  return !!(cfg.dellSandboxClientId && cfg.dellSandboxClientSecret)
}
