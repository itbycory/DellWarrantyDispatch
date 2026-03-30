"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  ClipboardCopy,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Shared UI ────────────────────────────────────────────────────────────────

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-6", className)}>
      {children}
    </div>
  )
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full px-4 py-3 text-sm rounded-lg border border-slate-300 bg-white font-mono tracking-widest uppercase",
        "focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:border-[#007DB8]",
        "placeholder:text-slate-400 placeholder:normal-case placeholder:tracking-normal",
        "disabled:bg-slate-50",
        props.className
      )}
    />
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
        "inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg",
        "text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
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

// ── Main ─────────────────────────────────────────────────────────────────────

type Status = "idle" | "loading" | "success" | "error"

export default function BiosUnlockPage() {
  const router = useRouter()
  const [serviceTag, setServiceTag] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [caseNumber, setCaseNumber] = useState("")
  const [message, setMessage] = useState("")
  const [copied, setCopied] = useState(false)

  const canSubmit = serviceTag.trim().length >= 5

  const handleSubmit = async () => {
    if (!canSubmit) return

    setStatus("loading")
    setMessage("")
    setCaseNumber("")

    try {
      const res = await fetch("/api/bios-unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceTag: serviceTag.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus("error")
        setMessage(data.error ?? "Unknown error")
        // Still show local ref if returned
        if (data.localRef) setCaseNumber(data.localRef)
      } else {
        setStatus("success")
        setCaseNumber(data.caseNumber ?? "")
        setMessage(data.message ?? "Request submitted")
      }
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Network error")
    }
  }

  const handleCopy = () => {
    if (caseNumber) {
      navigator.clipboard.writeText(caseNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleReset = () => {
    setServiceTag("")
    setStatus("idle")
    setMessage("")
    setCaseNumber("")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003B5C] text-white px-6 py-4 shadow-md">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <KeyRound className="w-6 h-6 text-[#007DB8]" />
          <div>
            <h1 className="text-lg font-bold leading-tight">BIOS Unlock Request</h1>
            <p className="text-xs text-slate-300">
              Auto-submits a Dell Tech Support case for a BIOS password unlock code
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10 space-y-6">
        {status === "idle" || status === "loading" ? (
          <Card>
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Enter Device Service Tag
            </h2>
            <p className="text-sm text-slate-500 mb-5">
              Paste or type the Dell service tag from the device label. A Tech
              Support case will be automatically submitted to Dell requesting the
              BIOS password unlock code.
            </p>

            <div className="flex gap-3">
              <Input
                value={serviceTag}
                onChange={(e) => setServiceTag(e.target.value.toUpperCase())}
                placeholder="e.g. ABC1234"
                maxLength={12}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSubmit) handleSubmit()
                }}
                autoFocus
              />
              <Button
                onClick={handleSubmit}
                loading={status === "loading"}
                disabled={!canSubmit}
                className="shrink-0"
              >
                {status === "loading" ? "Submitting…" : "Request Unlock"}
              </Button>
            </div>

            <p className="text-xs text-slate-400 mt-3">
              The service tag is printed on the device label (usually bottom or back).
              It is 5–7 alphanumeric characters.
            </p>
          </Card>
        ) : status === "success" ? (
          <Card>
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Request Submitted
                </h2>
                <p className="text-sm text-slate-500 mt-1">{message}</p>
              </div>

              {caseNumber && (
                <div className="w-full">
                  <p className="text-xs text-slate-500 mb-1">Case Reference</p>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                    <span className="flex-1 font-mono text-sm font-semibold text-slate-800 tracking-wider">
                      {caseNumber}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="text-slate-400 hover:text-[#007DB8] transition-colors"
                      title="Copy case number"
                    >
                      {copied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <ClipboardCopy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                Dell will typically respond with the unlock code via email within a
                few hours. Check the Cases page to track status.
              </p>

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={handleReset}>
                  Another Request
                </Button>
                <Button onClick={() => router.push("/cases")}>View Cases</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="flex flex-col items-center text-center gap-4 py-4">
              <XCircle className="w-12 h-12 text-red-400" />
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  Submission Failed
                </h2>
                <p className="text-sm text-slate-500 mt-1">{message}</p>
              </div>

              {caseNumber && (
                <div className="w-full">
                  <p className="text-xs text-slate-500 mb-1">
                    Logged locally as
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                    <span className="font-mono text-sm font-semibold text-amber-800">
                      {caseNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    The request was saved locally. Fix the API error and retry,
                    or contact Dell support manually.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="secondary" onClick={handleReset}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={() => router.push("/settings")}>
                  Check Settings
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* How it works */}
        {(status === "idle" || status === "loading") && (
          <Card className="bg-blue-50 border-blue-100">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              How it works
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Enter the service tag of the locked device</li>
              <li>
                A Dell Tech Support case is automatically created with the
                correct BIOS unlock request wording
              </li>
              <li>
                Dell emails the unlock code — typically within a few hours
              </li>
              <li>Track progress on the Cases page</li>
            </ol>
          </Card>
        )}
      </main>
    </div>
  )
}
