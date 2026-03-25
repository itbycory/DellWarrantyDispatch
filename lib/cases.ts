import fs from "fs"
import path from "path"

const CASES_PATH =
  process.env.CONFIG_PATH
    ? path.join(path.dirname(process.env.CONFIG_PATH), "cases.json")
    : path.join(process.cwd(), "data", "cases.json")

export type CaseType = "dispatch" | "tech-support" | "self-dispatch"

export interface SavedCase {
  caseNumber: string
  type: CaseType
  serviceTag: string
  productName: string
  issueDescription: string
  severity: "NORMAL" | "CRITICAL"
  submittedAt: string   // ISO datetime
  contact: string       // "First Last"
  contactEmail: string
  site: string          // formatted address
  /** Shown on the public repairs board — e.g. student name or "Year 10 laptop" */
  displayName: string
  status: string | null
  statusDetail: string | null
  lastStatusCheck: string | null
}

function readCases(): SavedCase[] {
  try {
    const raw = JSON.parse(fs.readFileSync(CASES_PATH, "utf8"))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function writeCases(cases: SavedCase[]): void {
  const dir = path.dirname(CASES_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CASES_PATH, JSON.stringify(cases, null, 2))
}

export function getAllCases(): SavedCase[] {
  return readCases().sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  )
}

export function getCasesByType(type: CaseType): SavedCase[] {
  return getAllCases().filter((c) => (c.type ?? "dispatch") === type)
}

/** Active = not closed/resolved. Used by the public repairs board. */
export function getActiveCases(): SavedCase[] {
  return getAllCases().filter((c) => {
    const s = (c.status ?? "").toLowerCase()
    return !s.includes("closed") && !s.includes("resolved") && !s.includes("complete")
  })
}

export function getCaseByNumber(caseNumber: string): SavedCase | null {
  return readCases().find((c) => c.caseNumber === caseNumber) ?? null
}

export function saveCase(newCase: SavedCase): void {
  const cases = readCases()
  const idx = cases.findIndex((c) => c.caseNumber === newCase.caseNumber)
  if (idx >= 0) {
    cases[idx] = newCase
  } else {
    cases.push(newCase)
  }
  writeCases(cases)
}

export function updateCaseStatus(
  caseNumber: string,
  status: string | null,
  statusDetail: string | null
): void {
  const cases = readCases()
  const idx = cases.findIndex((c) => c.caseNumber === caseNumber)
  if (idx >= 0) {
    cases[idx].status = status
    cases[idx].statusDetail = statusDetail
    cases[idx].lastStatusCheck = new Date().toISOString()
    writeCases(cases)
  }
}
