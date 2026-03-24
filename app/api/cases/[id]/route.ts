import { NextRequest, NextResponse } from "next/server"
import { getCaseByNumber, updateCaseStatus } from "@/lib/cases"
import { getCaseStatus } from "@/lib/dell-api"
import { getConfig, isConfigured } from "@/lib/config"

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

// POST /api/cases/:id/refresh — poll Dell for latest status
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const c = getCaseByNumber(id)
  if (!c) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 })
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Dell API credentials not configured." },
      { status: 503 }
    )
  }

  const { dellClientId, dellClientSecret } = getConfig()

  try {
    const result = await getCaseStatus(id, dellClientId, dellClientSecret)
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
