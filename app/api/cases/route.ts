import { NextResponse } from "next/server"
import { getAllCases } from "@/lib/cases"

export async function GET() {
  try {
    const cases = getAllCases()
    return NextResponse.json({ cases })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
