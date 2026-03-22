import "@/styles/globals.css";
import "@mdxeditor/editor/style.css";
// Inter for body text (LP Neo-Geometric style)
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// IBM Plex Mono for terminal/code elements
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
// Legacy: Open Sauce Sans (can be removed after full migration)
import "@fontsource/open-sauce-sans/400.css";
import "@fontsource/open-sauce-sans/500.css";
import "@fontsource/open-sauce-sans/600.css";
import "@fontsource/open-sauce-sans/700.css";
import { env } from "@/env/client.mjs";
import { PROJECT_INFO } from "@/utils/projectInfo";
import type { Viewport } from "next";
import { Providers } from "./providers";

export const viewport: Viewport = {
  themeColor: "#01184e",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  title: `${PROJECT_INFO.name} - Empowering Edge Markets with Tokenized Credit`,
  description:
    "Institutional access to asset-backed private credit in emerging markets. Structuring and standardizing local credit into globally investable assets.",
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  icons: {
    apple: "/favicon/apple-touch-icon.png",
    icon: [
      {
        url: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    title: `${PROJECT_INFO.name} - Empowering Edge Markets with Tokenized Credit`,
    description:
      "Institutional access to asset-backed private credit in emerging markets. Structuring and standardizing local credit into globally investable assets.",
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: PROJECT_INFO.name,
    type: "website",
    images: [
      {
        url: `${env.NEXT_PUBLIC_APP_URL}/assets/banner.png`,
        width: 1200,
        height: 630,
        alt: "Credit Markets - Empowering Edge Markets with Tokenized Credit",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PROJECT_INFO.name} - Empowering Edge Markets with Tokenized Credit`,
    description:
      "Institutional access to asset-backed private credit in emerging markets. Structuring and standardizing local credit into globally investable assets.",
    images: [`${env.NEXT_PUBLIC_APP_URL}/assets/banner.png`],
  },
};

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
