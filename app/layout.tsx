import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SpendLens — Institutional AI Spend Intelligence & Audit",
  description: "SpendLens provides CFOs and engineering leaders with deterministic visibility into developer tool spend, contract renewals, and license optimization.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='4' fill='%2315191F'/><path d='M9 11h14M9 16h10M9 21h14' stroke='%23F28B38' stroke-width='2.5' stroke-linecap='round'/></svg>",
  },
  metadataBase: new URL("https://spendlens.demo"),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
      nonce={nonce}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
