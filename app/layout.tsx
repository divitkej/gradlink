import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";
import Providers from "@/components/Providers";
import GradLeapBackground from "@/components/gradleap/gradleap-background";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm",
  display: "swap",
});

const SHARE_TITLE = "GradLeap · Prepare students. Connect employers. Track outcomes.";
const SHARE_DESC =
  "Career-event intelligence for UAE colleges. From check-in to offer, every student interaction becomes measurable career data.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "GradLeap · Career event intelligence for UAE colleges",
  description: SHARE_DESC,
  applicationName: "GradLeap",
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESC,
    url: SITE_URL,
    siteName: "GradLeap",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SHARE_TITLE,
    description: SHARE_DESC,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body>
        <GradLeapBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
