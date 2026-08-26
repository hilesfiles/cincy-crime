import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://hilesfiles.github.io/cincy-crime/"),
  title: {
    default: "Cincinnati Neighborhood Crime Explorer",
    template: "%s · Cincinnati Crime Explorer",
  },
  description:
    "Auditable neighborhood-level reported-crime trends for Cincinnati, built from official City data.",
  openGraph: {
    title: "Cincinnati Neighborhood Crime Explorer",
    description:
      "Explore current reported-crime burden and change across Cincinnati statistical neighborhoods.",
    url: "https://hilesfiles.github.io/cincy-crime/",
    siteName: "Cincinnati Neighborhood Crime Explorer",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
