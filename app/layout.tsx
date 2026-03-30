import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Dell Warranty Manager",
  description: "Look up Dell warranties and log repair cases",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
