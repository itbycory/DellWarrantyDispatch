"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  User,
  Calendar,
  Hash,
} from "lucide-react"
import { cn, formatDate } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SavedCase {
  caseNumber: string
  serviceTag: string
  productName: string
  issueDescription: string
  severity: "NORMAL" | "CRITICAL"
  submittedAt: string
  contact: string
  contactEmail: string
  site: string
  status: string | null
  statusDetail: string | null
  lastStatusCheck: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusVariant(status: string | null): {
  label: string
  className: string
  icon: React.ReactNode
} {
  const s = (status ?? "").toLowerCase()
  if (s.includes("closed") || s.includes("resolved") || s.includes("complete")) {
    return {
      label: status ?? "Closed",
      className: "bg-green-100 text-green-800",
      icon: <CheckCircle className="w-3 h-3" />,
    }
  }
  if (s.includes("parts") || s.includes("ordered") || s.includes("shipped")) {
    return {
      label: status ?? "Parts Ordered",
      className: "bg-purple-100 text-purple-800",
      icon: <Clock className="w-3 h-3" />,
    }
  }
  if (s.includes("dispatch") || s.includes("progress") || s.includes("scheduled")) {
    return {
      label: status ?? "In Progress",
      className: "bg-amber-100 text-amber-800",
      icon: <Clock className="w-3 h-3" />,
    }
  }
  if (s.includes("open") || s.includes("submitted")) {
    return {
      label: status ?? "Open",
      className: "bg-blue-100 text-blue-800",
      icon: <Clock className="w-3 h-3" />,
    }
  }
  if (!status) {
    return {
      label: "Status unknown",
      className: "bg-slate-100 text-slate-500",
      icon: <Clock className="w-3 h-3" />,
    }
  }
  return {
    label: status,
    className: "bg-blue-100 text-blue-800",
    icon: <Clock className="w-3 h-3" />,
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const v = statusVariant(status)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold",
        v.className
      )}
    >
      {v.icon}
      {v.label}
    </span>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CasesPage() {
  const router = useRouter()
  const [cases, setCases] = useState<SavedCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<Record<string, string>>({})

  const loadCases = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/cases")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load cases")
      setCases(data.cases ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCases()
  }, [loadCases])

  const handleRefreshStatus = async (caseNumber: string) => {
    setRefreshing(caseNumber)
    setRefreshError((prev) => ({ ...prev, [caseNumber]: "" }))
    try {
      const res = await fetch(`/api/cases/${encodeURIComponent(caseNumber)}`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) {
        setRefreshError((prev) => ({
          ...prev,
          [caseNumber]: data.error ?? "Failed to refresh status",
        }))
        return
      }
      setCases((prev) =>
        prev.map((c) =>
          c.caseNumber === caseNumber
            ? {
                ...c,
                status: data.status,
                statusDetail: data.statusDetail,
                lastStatusCheck: data.lastStatusCheck,
              }
            : c
        )
      )
    } catch {
      setRefreshError((prev) => ({
        ...prev,
        [caseNumber]: "Network error",
      }))
    } finally {
      setRefreshing(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#003B5C] text-white px-6 py-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <ShieldCheck className="w-6 h-6 text-[#007DB8]" />
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-tight">Dispatch Cases</h1>
            <p className="text-xs text-slate-300">
              Track submitted warranty service jobs
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#007DB8]" />
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {!loading && !error && cases.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium text-slate-500">No cases yet</p>
            <p className="text-sm mt-1">
              Cases will appear here after you submit a dispatch job.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#007DB8] hover:bg-[#006aa0] text-white text-sm font-medium"
            >
              Submit a dispatch job
            </button>
          </div>
        )}

        {!loading && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map((c) => {
              const isExpanded = expanded === c.caseNumber
              const isRefreshing = refreshing === c.caseNumber
              const err = refreshError[c.caseNumber]

              return (
                <div
                  key={c.caseNumber}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Case summary row */}
                  <button
                    onClick={() =>
                      setExpanded(isExpanded ? null : c.caseNumber)
                    }
                    className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                  >
                    {/* Case number */}
                    <div className="shrink-0">
                      <p className="text-xs text-slate-400 font-medium">
                        Case #
                      </p>
                      <p className="text-base font-bold font-mono text-[#007DB8]">
                        {c.caseNumber}
                      </p>
                    </div>

                    {/* Device + description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        <span className="font-mono">{c.serviceTag}</span>
                        {c.productName && (
                          <span className="font-sans font-normal text-slate-500">
                            {" "}
                            · {c.productName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {c.issueDescription}
                      </p>
                    </div>

                    {/* Status + date */}
                    <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                      <StatusBadge status={c.status} />
                      <p className="text-xs text-slate-400">
                        {formatDate(c.submittedAt)}
                      </p>
                    </div>

                    {/* Expand toggle */}
                    <div className="shrink-0 text-slate-400">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-5 space-y-5">
                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              <Hash className="w-3 h-3" /> Case Details
                            </p>
                            <p className="font-mono font-semibold text-[#007DB8]">
                              {c.caseNumber}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {c.severity === "CRITICAL" ? (
                                <span className="text-red-600 font-medium">
                                  Critical
                                </span>
                              ) : (
                                "Normal severity"
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              <Calendar className="w-3 h-3" /> Submitted
                            </p>
                            <p className="text-slate-700">
                              {new Date(c.submittedAt).toLocaleString("en-AU", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              <User className="w-3 h-3" /> Contact
                            </p>
                            <p className="text-slate-700">{c.contact}</p>
                            <p className="text-xs text-slate-400">
                              {c.contactEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              <FileText className="w-3 h-3" /> Issue Description
                            </p>
                            <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
                              {c.issueDescription}
                            </p>
                          </div>

                          <div>
                            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              <MapPin className="w-3 h-3" /> Site Address
                            </p>
                            <p className="text-slate-700 text-xs whitespace-pre-line">
                              {c.site}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status section */}
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">
                              Current Status
                            </p>
                            <StatusBadge status={c.status} />
                            {c.statusDetail && (
                              <p className="text-xs text-slate-500 mt-1">
                                {c.statusDetail}
                              </p>
                            )}
                            {c.lastStatusCheck && (
                              <p className="text-xs text-slate-400 mt-1">
                                Last checked:{" "}
                                {new Date(
                                  c.lastStatusCheck
                                ).toLocaleString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            )}
                          </div>

                          <button
                            onClick={() =>
                              handleRefreshStatus(c.caseNumber)
                            }
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {isRefreshing ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            Refresh Status
                          </button>
                        </div>

                        {err && (
                          <p className="text-xs text-red-600 flex gap-1.5 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {err}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
