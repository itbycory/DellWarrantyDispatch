"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  Wifi,
  Building2,
  Sliders,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Shared UI ────────────────────────────────────────────────────────────────

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-sm p-6",
        className
      )}
    >
      {children}
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
      <Icon className="w-4 h-4 text-[#007DB8]" />
      {children}
    </h2>
  )
}

function Field({
  label,
  hint,
  children,
  required,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:border-[#007DB8]",
        "placeholder:text-slate-400 disabled:bg-slate-50",
        props.className
      )}
    />
  )
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:border-[#007DB8]",
        props.className
      )}
    >
      {children}
    </select>
  )
}

function Button({
  children,
  variant = "primary",
  loading,
  ...props
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary" | "ghost"
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg",
        "text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" &&
          "bg-[#007DB8] hover:bg-[#006aa0] text-white focus:ring-[#007DB8]",
        variant === "secondary" &&
          "bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400",
        variant === "ghost" &&
          "hover:bg-slate-100 text-slate-600 focus:ring-slate-400",
        props.className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

function SecretInput({
  value,
  onChange,
  placeholder,
  isSet,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  isSet?: boolean
}) {
  const [show, setShow] = useState(false)
  const [editing, setEditing] = useState(!isSet)

  if (!editing && isSet) {
    return (
      <div className="flex gap-2">
        <div className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 text-slate-500 font-mono">
          ••••••••••••••••••••
        </div>
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10 font-mono"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        tabIndex={-1}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface ConfigState {
  clientId: string
  clientSecret: string
  tokenUrl: string
  warrantyUrl: string
  dispatchUrl: string
  techSupportUrl: string
  selfDispatchUrl: string
  orgName: string
  orgContactName: string
  orgContactEmail: string
  orgContactPhone: string
  orgAddressLine1: string
  orgAddressLine2: string
  orgCity: string
  orgPostcode: string
  orgCountry: string
  clientIdSet: boolean
  clientSecretSet: boolean
}

const DEFAULT_URLS = {
  tokenUrl: "https://apigtwb2c.us.dell.com/auth/oauth/v2/token",
  warrantyUrl:
    "https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements",
  dispatchUrl: "https://apigtwb2c.us.dell.com/PROD/support/cases/v2/dispatch",
  techSupportUrl: "",
  selfDispatchUrl: "",
}

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState("")
  const [testResult, setTestResult] = useState<{
    ok: boolean
    message: string
  } | null>(null)

  const [cfg, setCfg] = useState<ConfigState>({
    clientId: "",
    clientSecret: "",
    tokenUrl: DEFAULT_URLS.tokenUrl,
    warrantyUrl: DEFAULT_URLS.warrantyUrl,
    dispatchUrl: DEFAULT_URLS.dispatchUrl,
    techSupportUrl: "",
    selfDispatchUrl: "",
    orgName: "",
    orgContactName: "",
    orgContactEmail: "",
    orgContactPhone: "",
    orgAddressLine1: "",
    orgAddressLine2: "",
    orgCity: "",
    orgPostcode: "",
    orgCountry: "AU",
    clientIdSet: false,
    clientSecretSet: false,
  })

  // Load current config on mount
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setCfg((prev) => ({
          ...prev,
          tokenUrl: data.dellTokenUrl || DEFAULT_URLS.tokenUrl,
          warrantyUrl: data.dellWarrantyUrl || DEFAULT_URLS.warrantyUrl,
          dispatchUrl: data.dellDispatchUrl || DEFAULT_URLS.dispatchUrl,
          techSupportUrl: data.dellTechSupportUrl ?? "",
          selfDispatchUrl: data.dellSelfDispatchUrl ?? "",
          orgName: data.orgName ?? "",
          orgContactName: data.orgContactName ?? "",
          orgContactEmail: data.orgContactEmail ?? "",
          orgContactPhone: data.orgContactPhone ?? "",
          orgAddressLine1: data.orgAddressLine1 ?? "",
          orgAddressLine2: data.orgAddressLine2 ?? "",
          orgCity: data.orgCity ?? "",
          orgPostcode: data.orgPostcode ?? "",
          orgCountry: data.orgCountry ?? "AU",
          clientIdSet: data.dellClientIdSet ?? false,
          clientSecretSet: data.dellClientSecretSet ?? false,
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const set = (key: keyof ConfigState) => (value: string) =>
    setCfg((prev) => ({ ...prev, [key]: value }))

  const handleTestConnection = async () => {
    setTesting(true)
    setTestResult(null)

    // Use the newly entered values, or rely on server-side stored ones if not changed
    const res = await fetch("/api/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: cfg.clientId || undefined,
        clientSecret: cfg.clientSecret || undefined,
      }),
    })

    const data = await res.json()
    setTestResult({ ok: res.ok, message: data.message ?? data.error })
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError("")
    setSaveSuccess(false)

    const body: Record<string, string> = {
      dellTokenUrl: cfg.tokenUrl,
      dellWarrantyUrl: cfg.warrantyUrl,
      dellDispatchUrl: cfg.dispatchUrl,
      dellTechSupportUrl: cfg.techSupportUrl,
      dellSelfDispatchUrl: cfg.selfDispatchUrl,
      orgName: cfg.orgName,
      orgContactName: cfg.orgContactName,
      orgContactEmail: cfg.orgContactEmail,
      orgContactPhone: cfg.orgContactPhone,
      orgAddressLine1: cfg.orgAddressLine1,
      orgAddressLine2: cfg.orgAddressLine2,
      orgCity: cfg.orgCity,
      orgPostcode: cfg.orgPostcode,
      orgCountry: cfg.orgCountry,
    }

    // Only include credentials if the user typed new ones
    if (cfg.clientId) body.dellClientId = cfg.clientId
    if (cfg.clientSecret) body.dellClientSecret = cfg.clientSecret

    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      setSaveSuccess(true)
      // Mark as set without exposing actual values
      if (cfg.clientId) setCfg((p) => ({ ...p, clientId: "", clientIdSet: true }))
      if (cfg.clientSecret)
        setCfg((p) => ({ ...p, clientSecret: "", clientSecretSet: true }))
      setTimeout(() => setSaveSuccess(false), 3000)
    } else {
      const data = await res.json()
      setSaveError(data.error ?? "Failed to save settings")
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-6 h-6 animate-spin text-[#007DB8]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003B5C] text-white px-6 py-4 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShieldCheck className="w-6 h-6 text-[#007DB8]" />
          <h1 className="text-lg font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Dell API Credentials */}
        <Card>
          <SectionTitle icon={Wifi}>Dell TechDirect API Credentials</SectionTitle>

          <div className="space-y-4">
            <Field
              label="Client ID"
              required
              hint="From your Dell TechDirect developer portal at techdirect.dell.com"
            >
              <SecretInput
                value={cfg.clientId}
                onChange={set("clientId")}
                placeholder="l7xxxxxxxxxxxxxxxxxxxxxxxx"
                isSet={cfg.clientIdSet}
              />
            </Field>

            <Field label="Client Secret" required>
              <SecretInput
                value={cfg.clientSecret}
                onChange={set("clientSecret")}
                placeholder="Enter secret…"
                isSet={cfg.clientSecretSet}
              />
            </Field>

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="secondary"
                loading={testing}
                onClick={handleTestConnection}
                disabled={!cfg.clientIdSet && !cfg.clientId}
              >
                <Wifi className="w-4 h-4" />
                Test Connection
              </Button>

              {testResult && (
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    testResult.ok ? "text-green-700" : "text-red-600"
                  )}
                >
                  {testResult.ok ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  {testResult.message}
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Organisation Details */}
        <Card>
          <SectionTitle icon={Building2}>Organisation Details</SectionTitle>
          <p className="text-sm text-slate-500 mb-4">
            These pre-fill the issue logging form so staff don&apos;t need to
            re-enter them every time.
          </p>

          <div className="space-y-4">
            <Field label="Organisation Name">
              <Input
                value={cfg.orgName}
                onChange={(e) => set("orgName")(e.target.value)}
                placeholder="e.g. Acme School"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact Name">
                <Input
                  value={cfg.orgContactName}
                  onChange={(e) => set("orgContactName")(e.target.value)}
                  placeholder="e.g. Jane Smith"
                />
              </Field>
              <Field label="Contact Phone">
                <Input
                  value={cfg.orgContactPhone}
                  onChange={(e) => set("orgContactPhone")(e.target.value)}
                  placeholder="e.g. 0800000000"
                />
              </Field>
            </div>

            <Field label="Contact Email">
              <Input
                type="email"
                value={cfg.orgContactEmail}
                onChange={(e) => set("orgContactEmail")(e.target.value)}
                placeholder="e.g. it@yourorg.com"
              />
            </Field>

            <Field label="Address Line 1">
              <Input
                value={cfg.orgAddressLine1}
                onChange={(e) => set("orgAddressLine1")(e.target.value)}
                placeholder="e.g. 1 Example Street"
              />
            </Field>

            <Field label="Address Line 2">
              <Input
                value={cfg.orgAddressLine2}
                onChange={(e) => set("orgAddressLine2")(e.target.value)}
                placeholder="(optional)"
              />
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field label="City">
                <Input
                  value={cfg.orgCity}
                  onChange={(e) => set("orgCity")(e.target.value)}
                  placeholder="e.g. Adelaide"
                />
              </Field>
              <Field label="Postcode">
                <Input
                  value={cfg.orgPostcode}
                  onChange={(e) => set("orgPostcode")(e.target.value)}
                  placeholder="e.g. 5000"
                  className="font-mono"
                />
              </Field>
              <Field label="Country">
                <Select
                  value={cfg.orgCountry}
                  onChange={(e) => set("orgCountry")(e.target.value)}
                >
                  <option value="AU">Australia</option>
                  <option value="GB">United Kingdom</option>
                  <option value="US">United States</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        {/* Advanced — API Endpoints */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-sm text-slate-500 hover:text-slate-700 select-none list-none py-2">
            <Sliders className="w-4 h-4" />
            Advanced — API Endpoints
            <span className="ml-1 text-xs text-slate-400">
              (only change if Dell provides different URLs)
            </span>
          </summary>

          <Card className="mt-3">
            <div className="space-y-4">
              <Field label="Token URL">
                <Input
                  value={cfg.tokenUrl}
                  onChange={(e) => set("tokenUrl")(e.target.value)}
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Warranty API URL">
                <Input
                  value={cfg.warrantyUrl}
                  onChange={(e) => set("warrantyUrl")(e.target.value)}
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                label="Tech Support API URL"
                hint="From your Dell SDK docs — leave blank until you receive your Technical Support Requests API key approval"
              >
                <Input
                  value={cfg.techSupportUrl}
                  onChange={(e) => set("techSupportUrl")(e.target.value)}
                  placeholder="https://… (from Dell SDK docs)"
                  className="font-mono text-xs"
                />
              </Field>
              <Field
                label="Self Dispatch API URL"
                hint="From your Dell SDK docs — leave blank until you receive your Self Dispatch Support Requests API key approval"
              >
                <Input
                  value={cfg.selfDispatchUrl}
                  onChange={(e) => set("selfDispatchUrl")(e.target.value)}
                  placeholder="https://… (from Dell SDK docs)"
                  className="font-mono text-xs"
                />
              </Field>
            </div>
          </Card>
        </details>

        {/* Save */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {saveError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> {saveError}
              </p>
            )}
            {saveSuccess && (
              <p className="text-sm text-green-700 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Settings saved
              </p>
            )}
          </div>
          <Button onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </div>
      </main>
    </div>
  )
}
