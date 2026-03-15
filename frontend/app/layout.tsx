import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Workflow Engine",
  description: "Build, run, and track step-by-step workflows",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          {/* Navigation */}
          <nav className="bg-white border-b border-border sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-14">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 3 21 3 21 8" />
                      <line x1="4" y1="20" x2="21" y2="3" />
                      <polyline points="21 16 21 21 16 21" />
                      <line x1="15" y1="15" x2="21" y2="21" />
                      <line x1="4" y1="4" x2="9" y2="9" />
                    </svg>
                  </div>
                  <span className="text-lg font-bold text-foreground">Workflow Engine</span>
                </Link>
                <div className="flex items-center gap-1">
                  <Link
                    href="/workflows"
                    className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                  >
                    My Workflows
                  </Link>
                  <Link
                    href="/workflows/new"
                    className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                  >
                    Create New
                  </Link>
                  <Link
                    href="/audit"
                    className="px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground hover:bg-card-hover rounded-lg transition-colors"
                  >
                    History
                  </Link>
                </div>
              </div>
            </div>
          </nav>

          {/* Main content */}
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
