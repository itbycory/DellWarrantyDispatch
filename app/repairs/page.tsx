"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Wrench,
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Package,
  Truck,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface RepairCase {
  caseNumber: string
  type?: string
  serviceTag: string
  productName: string
  issueDescription: string
  displayName: string
  submittedAt: string
  status: string | null
  statusDetail: string | null
  lastStatusCheck: string | null
}

// ── Status config ─────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  description: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}

function getStatusConfig(status: string | null, type?: string): StatusConfig {
  const s = (status ?? "").toLowerCase()

  if (s.includes("closed") || s.includes("resolved") || s.includes("complete")) {
    return {
      label: "Repaired",
      description: "Your device has been repaired and is ready to collect.",
      color: "text-green-700",
      bg: "bg-green-50",
      border: "border-green-200",
      icon: <CheckCircle className="w-6 h-6 text-green-600" />,
    }
  }
  if (s.includes("shipped") || s.includes("transit") || s.includes("delivery")) {
    return {
      label: "Parts on the Way",
      description: "Replacement parts have been shipped and are in transit.",
      color: "text-purple-700",
      bg: "bg-purple-50",
      border: "border-purple-200",
      icon: <Truck className="w-6 h-6 text-purple-600" />,
    }
  }
  if (s.includes("parts") || s.includes("ordered") || s.includes("requested")) {
    return {
      label: "Parts Ordered",
      description: "Replacement parts have been ordered from Dell.",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Package className="w-6 h-6 text-blue-600" />,
    }
  }
  if (s.includes("dispatch") || s.includes("engineer") || s.includes("scheduled") || s.includes("progress")) {
    return {
      label: "Engineer Scheduled",
      description: "A Dell engineer has been scheduled to attend.",
      color: "text-amber-700",
      bg: "bg-amber-50",
      border: "border-amber-200",
      icon: <Wrench className="w-6 h-6 text-amber-600" />,
    }
  }

  // Fallback by case type
  if (type === "self-dispatch") {
    return {
      label: "Parts Requested",
      description: "A parts request has been raised with Dell.",
      color: "text-blue-700",
      bg: "bg-blue-50",
      border: "border-blue-200",
      icon: <Package className="w-6 h-6 text-blue-600" />,
    }
  }
  if (type === "tech-support") {
    return {
      label: "With Support",
      description: "Dell support are working on this case.",
      color: "text-indigo-700",
      bg: "bg-indigo-50",
      border: "border-indigo-200",
      icon: <Clock className="w-6 h-6 text-indigo-600" />,
    }
  }

  return {
    label: "Logged with Dell",
    description: "Your repair has been logged and is being processed.",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock className="w-6 h-6 text-amber-600" />,
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return "Just now"
}

function maskServiceTag(tag: string): string {
  if (tag.length <= 4) return tag
  return `****${tag.slice(-4)}`
}

// ── Repair card ───────────────────────────────────────────────────────────────

function RepairCard({ c }: { c: RepairCase }) {
  const cfg = getStatusConfig(c.status, c.type)

  // Only show the first line of the issue (no need to dump the full description publicly)
  const issueSummary = c.issueDescription.split("\n")[0].split(":").slice(-1)[0].trim()

  return (
    <div className={cn("rounded-2xl border-2 p-5 transition-all", cfg.bg, cfg.border)}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", "bg-white shadow-sm border", cfg.border)}>
            {cfg.icon}
          </div>
          <div>
            <p className={cn("text-lg font-bold leading-tight", cfg.color)}>{cfg.label}</p>
            <p className="text-sm text-slate-500 mt-0.5">{cfg.description}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/70 rounded-xl px-4 py-3 mt-3 space-y-1.5">
        {c.displayName && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Student</span>
            <span className="text-sm font-semibold text-slate-800 text-right">{c.displayName}</span>
          </div>
        )}
        {c.productName && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Device</span>
            <span className="text-sm text-slate-700 text-right">{c.productName}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Service Tag</span>
          <span className="text-sm font-mono text-slate-600">{maskServiceTag(c.serviceTag)}</span>
        </div>
        {issueSummary && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide shrink-0">Issue</span>
            <span className="text-sm text-slate-700 text-right truncate max-w-xs">{issueSummary}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-200/60">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Logged</span>
          <span className="text-xs text-slate-500">{timeAgo(c.submittedAt)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RepairsPage() {
  const [cases, setCases] = useState<RepairCase[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [search, setSearch] = useState("")
  const [refreshing, setRefreshing] = useState(false)

  const loadCases = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true)
    try {
      const res = await fetch(`/api/cases?active=${!showAll}`)
      const data = await res.json()
      if (res.ok) {
        setCases(data.cases ?? [])
        setLastRefresh(new Date())
      }
    } catch {
      // silently fail on background refresh
    } finally {
      setLoading(false)
      if (isManual) setRefreshing(false)
    }
  }, [showAll])

  // Initial load + auto-refresh every 30 seconds
  useEffect(() => {
    loadCases()
    const interval = setInterval(() => loadCases(), 30_000)
    return () => clearInterval(interval)
  }, [loadCases])

  const filtered = cases.filter((c) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.serviceTag.toLowerCase().includes(q) ||
      c.productName.toLowerCase().includes(q)
    )
  })

  const activeCount = cases.filter((c) => {
    const s = (c.status ?? "").toLowerCase()
    return !s.includes("closed") && !s.includes("resolved") && !s.includes("complete")
  }).length

  return (
    <div className="min-h-screen bg-[#003B5C]">
      {/* Header */}
      <header className="px-6 py-6 border-b border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#007DB8] flex items-center justify-center shrink-0">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white leading-tight">Laptop Repair Tracker</h1>
                <p className="text-sm text-slate-300 mt-0.5">
                  {activeCount > 0
                    ? `${activeCount} active repair${activeCount !== 1 ? "s" : ""} in progress`
                    : "No active repairs at the moment"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {lastRefresh && (
                <p className="text-xs text-slate-400 hidden sm:block">
                  Updated {timeAgo(lastRefresh.toISOString())}
                </p>
              )}
              <button
                onClick={() => loadCases(true)}
                disabled={refreshing}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Search + filter bar */}
          <div className="mt-5 flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, device or service tag…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007DB8] focus:bg-white/15"
              />
            </div>
            <button
              onClick={() => setShowAll((v) => !v)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors",
                showAll
                  ? "bg-white/20 border-white/30 text-white"
                  : "bg-transparent border-white/20 text-slate-300 hover:bg-white/10"
              )}
            >
              {showAll ? "Showing all" : "Active only"}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#007DB8]" />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-white font-semibold text-lg">
              {search ? "No matching repairs" : "No repairs in progress"}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {search
                ? "Try a different name or service tag."
                : "All devices are accounted for — nothing is currently booked in for repair."}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <RepairCard key={c.caseNumber} c={c} />
            ))}
          </div>
        )}

        {/* Auto-refresh notice */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-500">
          <AlertCircle className="w-3.5 h-3.5" />
          This page refreshes automatically every 30 seconds
        </div>
      </main>
    </div>
  )
}
