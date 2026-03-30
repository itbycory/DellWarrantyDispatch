import { NextRequest, NextResponse } from "next/server"
import { getCaseByNumber, updateCaseStatus } from "@/lib/cases"
import { getCaseLiteStatus } from "@/lib/dell-api"
import { getConfig, isSandboxConfigured } from "@/lib/config"

// GET /api/cases/:id — return stored case
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const c = getCaseByNumber(id)
  if (!c) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }
  return NextResponse.json(c)
}

// POST /api/cases/:id — poll Dell for latest status
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const c = getCaseByNumber(id)
  if (!c) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  // Locally-logged cases (LOG- prefix) have no Dell case number to look up
  if (id.startsWith("LOG-")) {
    return NextResponse.json({
      ...c,
      _localOnly: true,
      message:
        "This case is logged locally only — no Dell case number has been assigned yet.",
    })
  }

  if (!isSandboxConfigured()) {
    return NextResponse.json(
      { error: "Sandbox API credentials not configured." },
      { status: 503 }
    )
  }

  const { dellSandboxClientId, dellSandboxClientSecret } = getConfig()

  try {
    const result = await getCaseLiteStatus(
      id,
      dellSandboxClientId,
      dellSandboxClientSecret
    )
    updateCaseStatus(id, result.status, result.statusDetail)
    return NextResponse.json({
      ...c,
      status: result.status,
      statusDetail: result.statusDetail,
      lastStatusCheck: new Date().toISOString(),
      raw: result.raw,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
