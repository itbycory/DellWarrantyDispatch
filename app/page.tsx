"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  ShieldCheck,
  Clock,
  MapPin,
  User,
  Phone,
  Settings,
  Mail,
  FileText,
  ChevronRight,
  Loader2,
  Briefcase,
  Headphones,
  Wrench,
  KeyRound,
} from "lucide-react"
import { cn, formatDate, daysUntil } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface WarrantyEntitlement {
  itemNumber: string
  startDate: string
  endDate: string
  entitlementType: string
  serviceLevelCode: string
  serviceLevelDescription: string
}

interface WarrantyResult {
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

interface OrgConfig {
  configured: boolean
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

type Step = "lookup" | "warranty" | "dispatch" | "confirmation"

// ── Helper components ────────────────────────────────────────────────────────

function Badge({
  children,
  variant,
}: {
  children: React.ReactNode
  variant: "success" | "warning" | "error" | "info"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variant === "success" && "bg-green-100 text-green-800",
        variant === "warning" && "bg-amber-100 text-amber-800",
        variant === "error" && "bg-red-100 text-red-800",
        variant === "info" && "bg-blue-100 text-blue-800"
      )}
    >
      {children}
    </span>
  )
}

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
        "bg-white rounded-xl border border-slate-200 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  )
}

function Field({
  label,
  children,
  required,
}: {
  label: string
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
        "focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue",
        "placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500",
        props.className
      )}
    />
  )
}

function Textarea({
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white resize-none",
        "focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue",
        "placeholder:text-slate-400",
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
        "focus:outline-none focus:ring-2 focus:ring-dell-blue focus:border-dell-blue",
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

// ── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "lookup", label: "Service Tag" },
    { id: "warranty", label: "Warranty" },
    { id: "dispatch", label: "Log Issue" },
    { id: "confirmation", label: "Logged" },
  ]

  const stepIndex = steps.findIndex((s) => s.id === current)

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => {
        const done = i < stepIndex
        const active = i === stepIndex
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  done &&
                    "bg-[#007DB8] border-[#007DB8] text-white",
                  active &&
                    "bg-white border-[#007DB8] text-[#007DB8]",
                  !done &&
                    !active &&
                    "bg-white border-slate-300 text-slate-400"
                )}
              >
                {done ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:block",
                  active ? "text-[#007DB8]" : done ? "text-slate-600" : "text-slate-400"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 sm:w-20 mx-1 mb-4 transition-colors",
                  done ? "bg-[#007DB8]" : "bg-slate-200"
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("lookup")
  const [orgConfig, setOrgConfig] = useState<OrgConfig | null>(null)
  const [configured, setConfigured] = useState<boolean | null>(null)

  // Lookup state
  const [serviceTagInput, setServiceTagInput] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState("")
  const [warranty, setWarranty] = useState<WarrantyResult | null>(null)

  // Dispatch form state
  const [issueDescription, setIssueDescription] = useState("")
  const [severity, setSeverity] = useState<"NORMAL" | "CRITICAL">("NORMAL")
  const [contactFirstName, setContactFirstName] = useState("")
  const [contactLastName, setContactLastName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("")
  const [postcode, setPostcode] = useState("")
  const [country, setCountry] = useState("GB")
  const [preferredContactTime, setPreferredContactTime] = useState("")

  const [dispatchLoading, setDispatchLoading] = useState(false)
  const [dispatchError, setDispatchError] = useState("")
  const [caseNumber, setCaseNumber] = useState("")

  // Load org config, check if configured, and pre-fill dispatch form
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: OrgConfig) => {
        setOrgConfig(cfg)
        setConfigured(cfg.configured ?? false)
        if (cfg.orgContactName) {
          const parts = cfg.orgContactName.split(" ")
          setContactFirstName(parts[0] ?? "")
          setContactLastName(parts.slice(1).join(" ") ?? "")
        }
        if (cfg.orgContactEmail) setContactEmail(cfg.orgContactEmail)
        if (cfg.orgContactPhone) setContactPhone(cfg.orgContactPhone)
        if (cfg.orgAddressLine1) setAddressLine1(cfg.orgAddressLine1)
        if (cfg.orgAddressLine2) setAddressLine2(cfg.orgAddressLine2)
        if (cfg.orgCity) setCity(cfg.orgCity)
        if (cfg.orgPostcode) setPostcode(cfg.orgPostcode)
        if (cfg.orgCountry) setCountry(cfg.orgCountry)
      })
      .catch(() => {})
  }, [])

  const handleLookup = useCallback(async () => {
    const tag = serviceTagInput.trim().toUpperCase()
    if (!tag) return

    setLookupError("")
    setLookupLoading(true)

    try {
      const res = await fetch(`/api/warranty?serviceTag=${encodeURIComponent(tag)}`)
      const data = await res.json()

      if (!res.ok) {
        setLookupError(data.error ?? "Failed to look up warranty")
        return
      }

      setWarranty(data as WarrantyResult)
      setStep("warranty")
    } catch (err) {
      setLookupError("Network error — please try again")
      console.error(err)
    } finally {
      setLookupLoading(false)
    }
  }, [serviceTagInput])

  const handleDispatchSubmit = useCallback(async () => {
    setDispatchError("")
    setDispatchLoading(true)

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceTag: warranty!.serviceTag,
          productName: warranty!.productLineDescription,
          issueDescription,
          severity,
          contactFirstName,
          contactLastName,
          contactEmail,
          contactPhone,
          addressLine1,
          addressLine2,
          city,
          postcode,
          country,
          preferredContactTime: preferredContactTime || undefined,
          displayName: "",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setDispatchError(data.error ?? "Failed to log issue")
        return
      }

      setCaseNumber(data.caseNumber ?? "")
      setStep("confirmation")
    } catch (err) {
      setDispatchError("Network error — please try again")
      console.error(err)
    } finally {
      setDispatchLoading(false)
    }
  }, [
    warranty,
    issueDescription,
    severity,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
    addressLine1,
    addressLine2,
    city,
    postcode,
    country,
    preferredContactTime,
  ])

  const reset = () => {
    setStep("lookup")
    setServiceTagInput("")
    setWarranty(null)
    setLookupError("")
    setIssueDescription("")
    setSeverity("NORMAL")
    setDispatchError("")
    setCaseNumber("")
  }

  // ── Warranty status helpers ─────────────────────────────────────────────

  const warrantyBadge = warranty
    ? warranty.inWarranty
      ? "success"
      : "error"
    : "info"

  const warrantyDays =
    warranty?.warrantyEnd ? daysUntil(warranty.warrantyEnd) : null

  const dispatchFormValid =
    issueDescription.trim().length >= 20 &&
    contactFirstName.trim() &&
    contactLastName.trim() &&
    contactEmail.trim() &&
    contactPhone.trim() &&
    addressLine1.trim() &&
    city.trim() &&
    postcode.trim()

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003B5C] text-white px-6 py-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-[#007DB8]" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">
              Dell Warranty Manager
            </h1>
            <p className="text-xs text-slate-300">
              Look up warranties and log repair cases
              {orgConfig?.orgName && ` · ${orgConfig.orgName}`}
            </p>
          </div>
          {configured === false && (
            <Badge variant="warning">
              <AlertTriangle className="w-3 h-3" /> Setup required
            </Badge>
          )}
          <button
            onClick={() => router.push("/support")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Log Support Request"
          >
            <Headphones className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/repairs")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Student Repair Tracker"
          >
            <Wrench className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/bios-unlock")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="BIOS Unlock Request"
          >
            <KeyRound className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/cases")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="All Cases"
          >
            <Briefcase className="w-5 h-5" />
          </button>
          <button
            onClick={() => router.push("/settings")}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* ── First-run setup prompt ───────────────────────────────────────── */}
        {configured === false && (
          <div className="mb-6 p-5 rounded-xl bg-[#003B5C] text-white flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <ShieldCheck className="w-8 h-8 text-[#007DB8] shrink-0" />
            <div className="flex-1">
              <p className="font-semibold">Welcome — finish setting up</p>
              <p className="text-sm text-slate-300 mt-0.5">
                Add your Dell TechDirect Client ID and Secret to start looking
                up warranties and logging repair cases.
              </p>
            </div>
            <button
              onClick={() => router.push("/settings")}
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#007DB8] hover:bg-[#006aa0] text-white text-sm font-medium transition-colors"
            >
              <Settings className="w-4 h-4" /> Go to Settings
            </button>
          </div>
        )}

        <StepIndicator current={step} />

        {/* ── Step 1: Lookup ─────────────────────────────────────────────── */}
        {step === "lookup" && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-1 text-slate-800">
              Look up a device
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Enter the Dell service tag to check warranty status before logging
              a repair case.
            </p>

            {configured === false && (
              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Dell API credentials are not configured.{" "}
                  <button
                    onClick={() => router.push("/settings")}
                    className="font-semibold underline hover:no-underline"
                  >
                    Go to Settings
                  </button>{" "}
                  to add them.
                </span>
              </div>
            )}

            <div className="flex gap-3">
              <Input
                placeholder="e.g. ABC1234"
                value={serviceTagInput}
                onChange={(e) =>
                  setServiceTagInput(e.target.value.toUpperCase())
                }
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="flex-1 text-base font-mono"
                maxLength={20}
              />
              <Button
                onClick={handleLookup}
                loading={lookupLoading}
                disabled={!serviceTagInput.trim()}
              >
                <Search className="w-4 h-4" />
                Check Warranty
              </Button>
            </div>

            {lookupError && (
              <p className="mt-3 text-sm text-red-600 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 shrink-0" />
                {lookupError}
              </p>
            )}
          </Card>
        )}

        {/* ── Step 2: Warranty results ───────────────────────────────────── */}
        {step === "warranty" && warranty && (
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">
                    Service Tag
                  </p>
                  <h2 className="text-2xl font-bold font-mono text-slate-800">
                    {warranty.serviceTag}
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {warranty.productLineDescription}
                    {warranty.productId && (
                      <span className="text-slate-400">
                        {" "}
                        · {warranty.productId}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={warrantyBadge}>
                  {warranty.inWarranty ? (
                    <>
                      <CheckCircle className="w-3 h-3" /> In Warranty
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3 h-3" /> Out of Warranty
                    </>
                  )}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Ship Date</p>
                  <p className="text-sm font-medium">
                    {formatDate(warranty.shipDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Warranty End</p>
                  <p className="text-sm font-medium">
                    {warranty.warrantyEnd
                      ? formatDate(warranty.warrantyEnd)
                      : "—"}
                  </p>
                </div>
                {warrantyDays !== null && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">
                      Days Remaining
                    </p>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        warrantyDays < 30
                          ? "text-red-600"
                          : warrantyDays < 90
                          ? "text-amber-600"
                          : "text-green-700"
                      )}
                    >
                      {warrantyDays > 0 ? warrantyDays : 0} days
                    </p>
                  </div>
                )}
                {warranty.bestServiceLevel && (
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-slate-400 mb-0.5">
                      Service Level
                    </p>
                    <p className="text-sm font-medium">
                      {warranty.bestServiceLevel}
                    </p>
                  </div>
                )}
              </div>

              {/* Entitlements breakdown */}
              {warranty.entitlements.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700 select-none">
                    View all entitlements ({warranty.entitlements.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {warranty.entitlements.map((e, i) => (
                      <div
                        key={i}
                        className="text-xs bg-slate-50 rounded-lg p-2.5 flex justify-between gap-4"
                      >
                        <span className="font-medium text-slate-700">
                          {e.serviceLevelDescription}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {formatDate(e.startDate)} → {formatDate(e.endDate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </Card>

            {!warranty.inWarranty && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  This device is out of warranty. Note this in your issue description
                  — Dell may not cover the repair under warranty.
                </span>
              </div>
            )}

            {warrantyDays !== null &&
              warrantyDays > 0 &&
              warrantyDays < 90 && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-700 flex gap-2">
                  <Clock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Warranty expires in{" "}
                    <strong>{warrantyDays} days</strong> (
                    {formatDate(warranty.warrantyEnd!)}). Log any issues soon.
                  </span>
                </div>
              )}

            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={reset}>
                <RotateCcw className="w-4 h-4" /> New Lookup
              </Button>
              <Button onClick={() => setStep("dispatch")}>
                Log a Case <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Dispatch form ──────────────────────────────────────── */}
        {step === "dispatch" && warranty && (
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-dell-light flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#007DB8]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">
                    Log Issue for{" "}
                    <span className="font-mono">{warranty.serviceTag}</span>
                  </h2>
                  <p className="text-sm text-slate-500">
                    {warranty.productLineDescription}
                  </p>
                </div>
              </div>

              {/* Issue details */}
              <section className="space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Issue Details
                </h3>

                <Field label="Issue Description" required>
                  <Textarea
                    rows={5}
                    placeholder="Describe the problem in detail — what fault are you seeing, when did it start, what has been tried? (minimum 20 characters)"
                    value={issueDescription}
                    onChange={(e) => setIssueDescription(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">
                    {issueDescription.length} chars
                    {issueDescription.length < 20 && (
                      <span className="text-red-400">
                        {" "}
                        — {20 - issueDescription.length} more needed
                      </span>
                    )}
                  </p>
                </Field>

                <Field label="Severity">
                  <Select
                    value={severity}
                    onChange={(e) =>
                      setSeverity(e.target.value as "NORMAL" | "CRITICAL")
                    }
                  >
                    <option value="NORMAL">Normal</option>
                    <option value="CRITICAL">
                      Critical — business critical system
                    </option>
                  </Select>
                </Field>

                <Field label="Preferred Contact Time">
                  <Input
                    placeholder="e.g. Weekdays 9am–5pm, or any specific date/time"
                    value={preferredContactTime}
                    onChange={(e) => setPreferredContactTime(e.target.value)}
                  />
                </Field>
              </section>

              {/* Contact details */}
              <section className="space-y-4 mb-6 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <User className="w-4 h-4" /> Contact Details
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="First Name" required>
                    <Input
                      value={contactFirstName}
                      onChange={(e) => setContactFirstName(e.target.value)}
                      placeholder="Jane"
                    />
                  </Field>
                  <Field label="Last Name" required>
                    <Input
                      value={contactLastName}
                      onChange={(e) => setContactLastName(e.target.value)}
                      placeholder="Smith"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Email" required>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                  <Field label="Phone" required>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+44 7700 000000"
                        className="pl-9"
                      />
                    </div>
                  </Field>
                </div>
              </section>

              {/* Site address */}
              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Onsite Address
                </h3>

                <Field label="Address Line 1" required>
                  <Input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Building / Street"
                  />
                </Field>

                <Field label="Address Line 2">
                  <Input
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="(optional)"
                  />
                </Field>

                <div className="grid grid-cols-3 gap-4">
                  <Field label="City" required>
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="London"
                    />
                  </Field>
                  <Field label="Postcode" required>
                    <Input
                      value={postcode}
                      onChange={(e) =>
                        setPostcode(e.target.value.toUpperCase())
                      }
                      placeholder="SW1A 1AA"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Country">
                    <Select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    >
                      <option value="GB">United Kingdom</option>
                      <option value="US">United States</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="AU">Australia</option>
                    </Select>
                  </Field>
                </div>
              </section>
            </Card>

            {dispatchError && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{dispatchError}</span>
              </div>
            )}

            <div className="flex gap-3 justify-between">
              <Button variant="secondary" onClick={() => setStep("warranty")}>
                ← Back
              </Button>
              <Button
                onClick={handleDispatchSubmit}
                loading={dispatchLoading}
                disabled={!dispatchFormValid}
              >
                <Send className="w-4 h-4" />
                Log Issue
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 4: Confirmation ───────────────────────────────────────── */}
        {step === "confirmation" && (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Issue Logged
            </h2>

            {caseNumber ? (
              <div className="mb-4">
                <p className="text-slate-500 text-sm">Local Reference</p>
                <p className="text-3xl font-mono font-bold text-[#007DB8] mt-1">
                  {caseNumber}
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Saved locally — visible in Cases and the Repairs board.
                </p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-4">
                Your issue has been logged locally and is now visible in the
                Cases tracker.
              </p>
            )}

            <div className="mt-2 mb-8 p-4 rounded-lg bg-slate-50 border text-left text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Tag</span>
                <span className="font-mono font-semibold">
                  {warranty?.serviceTag}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device</span>
                <span>{warranty?.productLineDescription}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Contact</span>
                <span>
                  {contactFirstName} {contactLastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Severity</span>
                <span>{severity}</span>
              </div>
            </div>

            <Button onClick={reset}>
              <RotateCcw className="w-4 h-4" /> New Lookup
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
