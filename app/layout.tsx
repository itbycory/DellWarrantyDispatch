import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Dell Warranty Dispatch",
  description: "Log and submit Dell warranty onsite service jobs",
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
