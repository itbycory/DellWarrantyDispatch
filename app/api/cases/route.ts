import { NextRequest, NextResponse } from "next/server"
import { getAllCases, getActiveCases } from "@/lib/cases"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active") === "true"
    const cases = active ? getActiveCases() : getAllCases()
    return NextResponse.json({ cases })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
