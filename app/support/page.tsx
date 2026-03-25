"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ShieldCheck,
  Search,
  Send,
  RotateCcw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  User,
  FileText,
  Package,
  MapPin,
  Headphones,
  Wrench,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface WarrantyResult {
  serviceTag: string
  productLineDescription: string
  inWarranty: boolean
  warrantyEnd: string | null
  bestServiceLevel: string | null
}

interface OrgConfig {
  orgContactName: string
  orgContactEmail: string
  orgContactPhone: string
  orgAddressLine1: string
  orgAddressLine2: string
  orgCity: string
  orgPostcode: string
  orgCountry: string
  dellTechSupportUrl?: string
  dellSelfDispatchUrl?: string
}

type TabId = "tech-support" | "self-dispatch"

// ── Shared UI ────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm", className)}>
      {children}
    </div>
  )
}

function Field({ label, children, required, hint, className }: {
  label: string; children: React.ReactNode; required?: boolean; hint?: string; className?: string
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className="text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white",
        "focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:border-[#007DB8]",
        "placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-500",
        props.className
      )}
    />
  )
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white resize-none",
        "focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:border-[#007DB8]",
        "placeholder:text-slate-400",
        props.className
      )}
    />
  )
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
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

function Button({ children, variant = "primary", loading, ...props }: {
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
        variant === "primary" && "bg-[#007DB8] hover:bg-[#006aa0] text-white focus:ring-[#007DB8]",
        variant === "secondary" && "bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400",
        variant === "ghost" && "hover:bg-slate-100 text-slate-600 focus:ring-slate-400",
        props.className
      )}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>("tech-support")

  // Service tag lookup
  const [serviceTag, setServiceTag] = useState("")
  const [lookupLoading, setLookupLoading] = useState(false)
  const [warranty, setWarranty] = useState<WarrantyResult | null>(null)
  const [lookupError, setLookupError] = useState("")

  // Shared fields
  const [displayName, setDisplayName] = useState("")
  const [problemTitle, setProblemTitle] = useState("")
  const [problemDescription, setProblemDescription] = useState("")
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "CRITICAL">("NORMAL")
  const [contactFirstName, setContactFirstName] = useState("")
  const [contactLastName, setContactLastName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [contactPhone, setContactPhone] = useState("")

  // Self-dispatch extras
  const [partDescription, setPartDescription] = useState("")
  const [addressLine1, setAddressLine1] = useState("")
  const [addressLine2, setAddressLine2] = useState("")
  const [city, setCity] = useState("")
  const [postcode, setPostcode] = useState("")
  const [country, setCountry] = useState("GB")

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [caseNumber, setCaseNumber] = useState("")

  // Load org defaults
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg: OrgConfig) => {
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
    const tag = serviceTag.trim().toUpperCase()
    if (!tag) return
    setLookupError("")
    setLookupLoading(true)
    setWarranty(null)
    try {
      const res = await fetch(`/api/warranty?serviceTag=${encodeURIComponent(tag)}`)
      const data = await res.json()
      if (!res.ok) { setLookupError(data.error ?? "Lookup failed"); return }
      setWarranty(data as WarrantyResult)
    } catch {
      setLookupError("Network error — please try again")
    } finally {
      setLookupLoading(false)
    }
  }, [serviceTag])

  const handleSubmit = useCallback(async () => {
    setSubmitError("")
    setSubmitting(true)

    try {
      let res: Response

      if (activeTab === "tech-support") {
        res = await fetch("/api/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceTag: (warranty?.serviceTag ?? serviceTag).toUpperCase(),
            productName: warranty?.productLineDescription ?? "",
            problemTitle,
            problemDescription,
            priority,
            contactFirstName,
            contactLastName,
            contactEmail,
            contactPhone,
            displayName,
          }),
        })
      } else {
        res = await fetch("/api/self-dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serviceTag: (warranty?.serviceTag ?? serviceTag).toUpperCase(),
            productName: warranty?.productLineDescription ?? "",
            problemDescription,
            partDescription,
            contactFirstName,
            contactLastName,
            contactEmail,
            contactPhone,
            addressLine1,
            addressLine2,
            city,
            postcode,
            country,
            displayName,
          }),
        })
      }

      const data = await res.json()
      if (!res.ok) { setSubmitError(data.error ?? "Submission failed"); return }
      setCaseNumber(data.caseNumber ?? "")
      setSubmitted(true)
    } catch {
      setSubmitError("Network error — please try again")
    } finally {
      setSubmitting(false)
    }
  }, [
    activeTab, warranty, serviceTag, displayName, problemTitle, problemDescription,
    priority, contactFirstName, contactLastName, contactEmail, contactPhone,
    partDescription, addressLine1, addressLine2, city, postcode, country,
  ])

  const reset = () => {
    setSubmitted(false)
    setServiceTag("")
    setWarranty(null)
    setLookupError("")
    setDisplayName("")
    setProblemTitle("")
    setProblemDescription("")
    setPriority("NORMAL")
    setPartDescription("")
    setSubmitError("")
    setCaseNumber("")
  }

  const techSupportValid =
    serviceTag.trim().length > 0 &&
    problemTitle.trim().length > 0 &&
    problemDescription.trim().length >= 20 &&
    contactFirstName.trim() && contactLastName.trim() &&
    contactEmail.trim() && contactPhone.trim()

  const selfDispatchValid =
    serviceTag.trim().length > 0 &&
    problemDescription.trim().length >= 20 &&
    partDescription.trim().length > 0 &&
    contactFirstName.trim() && contactLastName.trim() &&
    contactEmail.trim() && contactPhone.trim() &&
    addressLine1.trim() && city.trim() && postcode.trim()

  const isValid = activeTab === "tech-support" ? techSupportValid : selfDispatchValid

  // ── Submitted confirmation ───────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header onBack={() => router.push("/")} />
        <main className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {activeTab === "tech-support" ? "Support Case Created" : "Parts Request Submitted"}
            </h2>
            {caseNumber ? (
              <div className="mb-6">
                <p className="text-slate-500 text-sm">Dell Case Number</p>
                <p className="text-3xl font-mono font-bold text-[#007DB8] mt-1">{caseNumber}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-sm mb-6">
                {activeTab === "tech-support"
                  ? "Dell will contact you to arrange support."
                  : "Dell will process your parts request and arrange delivery."}
              </p>
            )}
            <div className="p-4 rounded-lg bg-slate-50 border text-left text-sm space-y-1 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-500">Service Tag</span>
                <span className="font-mono font-semibold">{warranty?.serviceTag ?? serviceTag.toUpperCase()}</span>
              </div>
              {warranty?.productLineDescription && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Device</span>
                  <span>{warranty.productLineDescription}</span>
                </div>
              )}
              {displayName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Display label</span>
                  <span>{displayName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Type</span>
                <span>{activeTab === "tech-support" ? "Tech Support" : "Self Dispatch"}</span>
              </div>
            </div>
            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={() => router.push("/cases")}>
                View All Cases
              </Button>
              <Button onClick={reset}>
                <RotateCcw className="w-4 h-4" /> New Request
              </Button>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">
      <Header onBack={() => router.push("/")} />

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* Tab selector */}
        <div className="grid grid-cols-2 gap-3">
          <TabCard
            id="tech-support"
            active={activeTab === "tech-support"}
            icon={<Headphones className="w-5 h-5" />}
            title="Tech Support"
            description="Dell contacts you to troubleshoot or arrange an engineer"
            onClick={() => setActiveTab("tech-support")}
          />
          <TabCard
            id="self-dispatch"
            active={activeTab === "self-dispatch"}
            icon={<Package className="w-5 h-5" />}
            title="Self Dispatch"
            description="Request replacement parts sent to you to fit yourself"
            onClick={() => setActiveTab("self-dispatch")}
          />
        </div>

        {/* Service tag lookup */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-[#007DB8]" /> Device
          </h3>
          <div className="flex gap-3">
            <Input
              placeholder="Service tag e.g. ABC1234"
              value={serviceTag}
              onChange={(e) => setServiceTag(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="flex-1 font-mono text-base"
              maxLength={20}
            />
            <Button variant="secondary" onClick={handleLookup} loading={lookupLoading} disabled={!serviceTag.trim()}>
              <Search className="w-4 h-4" /> Look up
            </Button>
          </div>

          {lookupError && (
            <p className="mt-2 text-sm text-amber-700 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {lookupError} — you can still submit without lookup.
            </p>
          )}

          {warranty && (
            <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800">{warranty.productLineDescription}</p>
                <p className="text-xs text-slate-500">
                  {warranty.inWarranty
                    ? `In warranty${warranty.warrantyEnd ? ` until ${formatDate(warranty.warrantyEnd)}` : ""}`
                    : "Out of warranty"}
                  {warranty.bestServiceLevel && ` · ${warranty.bestServiceLevel}`}
                </p>
              </div>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                warranty.inWarranty ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
              )}>
                {warranty.inWarranty ? "✓ In Warranty" : "✗ Out of Warranty"}
              </span>
            </div>
          )}

          <Field label="Display label for repair board" hint="Optional — shown publicly so students can see their repair status. E.g. student name, year group, or device ID." className="mt-4">
            <Input
              placeholder="e.g. John Smith, Year 10 laptop, Asset 4521"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Field>
        </Card>

        {/* Issue details */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <FileText className="w-4 h-4 text-[#007DB8]" /> Issue Details
          </h3>
          <div className="space-y-4">
            {activeTab === "tech-support" && (
              <Field label="Issue title" required>
                <Input
                  placeholder="e.g. Screen flickering, won't power on, keyboard fault"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                />
              </Field>
            )}

            <Field label={activeTab === "tech-support" ? "Full description" : "Problem description"} required>
              <Textarea
                rows={4}
                placeholder="Describe the fault — what's happening, when did it start, what troubleshooting has been done? (min 20 chars)"
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
              />
              {problemDescription.length > 0 && problemDescription.length < 20 && (
                <p className="text-xs text-red-400">{20 - problemDescription.length} more characters needed</p>
              )}
            </Field>

            {activeTab === "tech-support" && (
              <Field label="Priority">
                <Select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical — business critical</option>
                </Select>
              </Field>
            )}

            {activeTab === "self-dispatch" && (
              <Field label="Part needed / fault component" required hint="Describe the part that needs replacing, e.g. LCD screen, keyboard, battery, charger">
                <Input
                  placeholder="e.g. LCD screen assembly, keyboard, battery"
                  value={partDescription}
                  onChange={(e) => setPartDescription(e.target.value)}
                />
              </Field>
            )}
          </div>
        </Card>

        {/* Contact */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-[#007DB8]" /> Contact Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" required>
                <Input value={contactFirstName} onChange={(e) => setContactFirstName(e.target.value)} placeholder="Jane" />
              </Field>
              <Field label="Last Name" required>
                <Input value={contactLastName} onChange={(e) => setContactLastName(e.target.value)} placeholder="Smith" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email" required>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" className="pl-9" />
                </div>
              </Field>
              <Field label="Phone" required>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <Input type="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+44 7700 000000" className="pl-9" />
                </div>
              </Field>
            </div>
          </div>
        </Card>

        {/* Delivery address (self-dispatch only) */}
        {activeTab === "self-dispatch" && (
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-[#007DB8]" /> Delivery Address
            </h3>
            <div className="space-y-4">
              <Field label="Address Line 1" required>
                <Input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Building / Street" />
              </Field>
              <Field label="Address Line 2">
                <Input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="(optional)" />
              </Field>
              <div className="grid grid-cols-3 gap-4">
                <Field label="City" required>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="London" />
                </Field>
                <Field label="Postcode" required>
                  <Input value={postcode} onChange={(e) => setPostcode(e.target.value.toUpperCase())} placeholder="SW1A 1AA" className="font-mono" />
                </Field>
                <Field label="Country">
                  <Select value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="GB">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="AU">Australia</option>
                  </Select>
                </Field>
              </div>
            </div>
          </Card>
        )}

        {/* Error + submit */}
        {submitError && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="flex justify-end pb-6">
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid} className="px-6 py-2.5">
            <Send className="w-4 h-4" />
            {activeTab === "tech-support" ? "Submit Support Case" : "Request Parts"}
          </Button>
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Header({ onBack }: { onBack: () => void }) {
  return (
    <header className="bg-[#003B5C] text-white px-6 py-4 shadow-md">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <ShieldCheck className="w-6 h-6 text-[#007DB8]" />
        <div className="flex-1">
          <h1 className="text-lg font-bold leading-tight">Log Support Request</h1>
          <p className="text-xs text-slate-300">Tech Support · Self Dispatch</p>
        </div>
        <Wrench className="w-5 h-5 text-slate-400" />
      </div>
    </header>
  )
}

function TabCard({ active, icon, title, description, onClick }: {
  id: TabId
  active: boolean
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border-2 transition-all",
        active
          ? "border-[#007DB8] bg-[#007DB8]/5"
          : "border-slate-200 bg-white hover:border-slate-300"
      )}
    >
      <div className={cn("mb-2", active ? "text-[#007DB8]" : "text-slate-500")}>{icon}</div>
      <p className={cn("text-sm font-semibold", active ? "text-[#007DB8]" : "text-slate-700")}>{title}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-snug">{description}</p>
    </button>
  )
}

