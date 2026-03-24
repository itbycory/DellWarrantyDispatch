import { NextResponse } from "next/server"

export async function GET() {
  const hasCredentials = !!(
    process.env.DELL_CLIENT_ID && process.env.DELL_CLIENT_SECRET
  )

  return NextResponse.json({
    configured: hasCredentials,
    orgName: process.env.ORG_NAME ?? "",
    orgContactName: process.env.ORG_CONTACT_NAME ?? "",
    orgContactEmail: process.env.ORG_CONTACT_EMAIL ?? "",
    orgContactPhone: process.env.ORG_CONTACT_PHONE ?? "",
    orgAddressLine1: process.env.ORG_ADDRESS_LINE1 ?? "",
    orgAddressLine2: process.env.ORG_ADDRESS_LINE2 ?? "",
    orgCity: process.env.ORG_CITY ?? "",
    orgPostcode: process.env.ORG_POSTCODE ?? "",
    orgCountry: process.env.ORG_COUNTRY ?? "GB",
  })
}
