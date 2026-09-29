import type { ReactNode } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

// Shared layout for the Privacy Policy and Terms pages: a plain, readable
// column of numbered sections under the normal site chrome.
export default function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <Navbar />
      <main style={{ padding: "clamp(112px, 14vw, 152px) 24px clamp(64px, 9vw, 112px)" }}>
        <article className="legal" style={{ maxWidth: 760, margin: "0 auto" }}>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, lineHeight: 1.1, marginBottom: 12 }}>{title}</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 32 }}>Last updated {updated}</p>
          <div style={{ marginBottom: 40 }}>{intro}</div>
          {sections.map((s, i) => (
            <section key={s.heading} id={`section-${i + 1}`} style={{ marginBottom: 36 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                {i + 1}. {s.heading}
              </h2>
              {s.body}
            </section>
          ))}
        </article>
      </main>
      <Footer />
      <style>{`
        .legal p, .legal li { font-size: 15px; line-height: 1.75; color: var(--text-2); }
        .legal p + p, .legal p + ul, .legal ul + p { margin-top: 12px; }
        .legal ul { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
        .legal strong { color: var(--text); font-weight: 600; }
        .legal a { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
      `}</style>
    </>
  );
}
