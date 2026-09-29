"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Code2, ExternalLink, FileText, RefreshCw, Trash2 } from "lucide-react";
import { GlassPanel, PanelTitle } from "./widgets";
import { SmallButton, fieldStyle } from "./cards";
import {
  startCodingProfile, verifyCodingProfile, refreshCodingProfile, addTestScore, listStudentScores,
  setStudentScoreVisible, deleteStudentScore, codingProfileUrl, type CodingSite, type StudentScoreRow,
} from "@/lib/db";
import { TESTS, TEST_BY_KEY, CODING_SITE_LABEL, scoreProblem, scoreLines, testScoreText, takenOnText } from "@/lib/scores";
import { fmtDay } from "@/lib/format";

type Msg = { tone: "ok" | "error"; text: string } | null;

const rowStyle: React.CSSProperties = {
  display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 14px",
  background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "var(--r-md)",
};
const muted: React.CSSProperties = { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5 };

/**
 * Coding profiles and test scores on the career profile. LeetCode and
 * Codeforces profiles are shown to employers only once the student proves
 * the account is theirs; test scores are marked self-reported. The student
 * chooses which ones employers see.
 */
export default function StudentScores({ profileId }: { profileId: string }) {
  const [rows, setRows] = useState<StudentScoreRow[] | null>(null);
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState<Msg>(null);

  useEffect(() => {
    let cancelled = false;
    listStudentScores(profileId).then((r) => { if (!cancelled) setRows(r); });
    return () => { cancelled = true; };
  }, [profileId, version]);

  const reload = () => setVersion((v) => v + 1);
  const put = (row: StudentScoreRow) => setRows((r) => [...(r ?? []).filter((x) => x.id !== row.id), row]);

  async function toggle(row: StudentScoreRow) {
    const next = !row.visible_to_employers;
    const flip = (value: boolean) => setRows((r) => (r ?? []).map((x) => (x.id === row.id ? { ...x, visible_to_employers: value } : x)));
    flip(next);
    if (!(await setStudentScoreVisible(row.id, next))) {
      flip(!next);
      setMessage({ tone: "error", text: "Couldn't save that. Please try again." });
    }
  }

  async function remove(row: StudentScoreRow, what: string, ask = true) {
    if (ask && !window.confirm(`Remove ${what} from your profile?`)) return;
    if (await deleteStudentScore(row.id)) reload();
  }

  const tests = (rows ?? []).filter((r) => r.kind === "test");

  return (
    <GlassPanel id="scores">
      <PanelTitle hint="Employers see the ones you choose">Coding profiles and test scores</PanelTitle>

      <div className="ss-sites" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(["leetcode", "codeforces"] as const).map((site) => (
          <SiteCard key={site} site={site} row={(rows ?? []).find((r) => r.kind === site) ?? null}
            onSaved={put} onToggle={toggle} onRemove={(r, ask) => remove(r, `your ${CODING_SITE_LABEL[site]} profile`, ask)} setMessage={setMessage} />
        ))}
      </div>

      <TestForm count={tests.length} onSaved={put} setMessage={setMessage} />

      {message && <p role={message.tone === "error" ? "alert" : "status"} style={{ fontSize: 12.5, marginTop: 12, color: message.tone === "error" ? "var(--danger)" : "var(--text)" }}>{message.text}</p>}

      {tests.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {tests.map((t) => (
            <div key={t.id} style={rowStyle}>
              <FileText size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>{t.test_name} <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{testScoreText(t)}</span></div>
                <div style={muted}>{["Self-reported", takenOnText(t.taken_on) ? `taken ${takenOnText(t.taken_on)}` : null].filter(Boolean).join(" · ")}</div>
                <Visible row={t} onToggle={toggle} />
              </div>
              <RemoveButton label={`Remove ${t.test_name}`} onClick={() => remove(t, `your ${t.test_name} score`)} />
            </div>
          ))}
        </div>
      )}
      <style>{`@media (max-width: 760px) { .ss-sites, .ss-test { grid-template-columns: minmax(0, 1fr) !important; } }`}</style>
    </GlassPanel>
  );
}

function SiteCard({ site, row, onSaved, onToggle, onRemove, setMessage }: {
  site: CodingSite;
  row: StudentScoreRow | null;
  onSaved: (row: StudentScoreRow) => void;
  onToggle: (row: StudentScoreRow) => void;
  onRemove: (row: StudentScoreRow, ask: boolean) => void;
  setMessage: (m: Msg) => void;
}) {
  const label = CODING_SITE_LABEL[site];
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<{ ok: true; score: StudentScoreRow } | { ok: false; error: string }>, done?: string) {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    onSaved(res.score);
    if (done) setMessage({ tone: "ok", text: done });
  }

  const box: React.CSSProperties = { ...rowStyle, flexDirection: "column", gap: 8 };
  const head = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--text)" }}>
      {row?.verified_at ? <BadgeCheck size={16} color="var(--accent)" /> : <Code2 size={15} color="var(--text-muted)" />}
      {label}{row?.handle ? <span style={{ fontWeight: 500, color: "var(--text-2)" }}>{row.handle}</span> : null}
    </div>
  );

  if (!row) {
    const id = `ss-${site}`;
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(() => startCodingProfile(site, handle)); }} style={box}>
        {head}
        <label htmlFor={id} style={{ fontSize: 12, color: "var(--text-2)" }}>Your {label} username or profile link</label>
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <input id={id} value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={site === "leetcode" ? "leetcode.com/u/username" : "codeforces.com/profile/handle"} style={fieldStyle} />
          <SmallButton type="submit" tone="primary" disabled={!handle.trim() || busy}>{busy ? "Checking…" : "Add"}</SmallButton>
        </div>
        <span style={muted}>You prove the account is yours in one step before employers see it.</span>
      </form>
    );
  }

  if (!row.verified_at) {
    return (
      <div style={box}>
        {head}
        {site === "leetcode" ? (
          <ol style={{ ...muted, color: "var(--text-2)", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>On LeetCode, open Edit Profile and add this code anywhere in your Summary: <code style={{ fontSize: 12.5, color: "var(--text)", background: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: 4, userSelect: "all" }}>{row.verify_code}</code></li>
            <li>Save, then press Check below. You can remove the code once you are verified.</li>
          </ol>
        ) : (
          <ol style={{ ...muted, color: "var(--text-2)", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            <li>Signed in as {row.handle}, submit any code that does not compile to <a href="https://codeforces.com/problemset/problem/4/A" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text)", textDecoration: "underline" }}>problem 4A</a>. A single line like <code style={{ fontSize: 12.5, color: "var(--text)" }}>gradlink</code> in C++ works. It does not affect your rating.</li>
            <li>When Codeforces shows &quot;Compilation error&quot;, press Check below.</li>
          </ol>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <SmallButton tone="primary" disabled={busy} onClick={() => run(() => verifyCodingProfile(site), `Verified: ${row.handle} is your ${label} profile.`)}>{busy ? "Checking…" : "Check"}</SmallButton>
          <SmallButton onClick={() => onRemove(row, false)}>Cancel</SmallButton>
        </div>
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start", width: "100%" }}>
        <div style={{ flex: 1, minWidth: 0 }}>{head}</div>
        <RemoveButton label={`Remove ${label}`} onClick={() => onRemove(row, true)} />
      </div>
      {scoreLines(row).map((l) => <div key={l} style={{ fontSize: 12.5, color: "var(--text-2)" }}>{l}</div>)}
      <div style={muted}>Verified with {label}{row.stats_at ? ` · updated ${fmtDay(row.stats_at)}` : ""}</div>
      <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        <Visible row={row} onToggle={onToggle} inline />
        <button type="button" disabled={busy} onClick={() => run(() => refreshCodingProfile(row.id))}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-2)", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <RefreshCw size={12} /> {busy ? "Refreshing…" : "Refresh"}
        </button>
        <a href={codingProfileUrl(site, row.handle ?? "")} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-2)" }}>
          <ExternalLink size={12} /> View profile
        </a>
      </div>
    </div>
  );
}

function TestForm({ count, onSaved, setMessage }: { count: number; onSaved: (row: StudentScoreRow) => void; setMessage: (m: Msg) => void }) {
  const [form, setForm] = useState({ testKey: "", testName: "", score: "", takenOn: "" });
  const [busy, setBusy] = useState(false);
  const test = TEST_BY_KEY.get(form.testKey);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!test) return;
    const problem = scoreProblem(test, form.score);
    if (problem) { setMessage({ tone: "error", text: problem }); return; }
    setBusy(true);
    setMessage(null);
    const res = await addTestScore(form);
    setBusy(false);
    if (!res.ok) { setMessage({ tone: "error", text: res.error }); return; }
    onSaved(res.score);
    setForm({ testKey: "", testName: "", score: "", takenOn: "" });
  }

  const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-2)" };
  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Add a test score, like the GRE or IELTS. Employers see it marked as self-reported.</div>
      <div className="ss-test" style={{ display: "grid", gridTemplateColumns: form.testKey === "other" ? "1.1fr 1fr 0.8fr 1fr auto" : "1.4fr 0.8fr 1fr auto", gap: 8, alignItems: "end" }}>
        <label style={labelStyle}>Test
          <select value={form.testKey} onChange={(e) => setForm({ ...form, testKey: e.target.value })} style={fieldStyle}>
            <option value="">Choose a test</option>
            {TESTS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>
        {form.testKey === "other" && (
          <label style={labelStyle}>Test name
            <input value={form.testName} maxLength={80} onChange={(e) => setForm({ ...form, testName: e.target.value })} placeholder="AMCAT" style={fieldStyle} />
          </label>
        )}
        <label style={labelStyle}>Score{test?.min != null ? ` (${test.min} to ${test.max})` : ""}
          <input value={form.score} maxLength={40} inputMode={test?.min != null ? "decimal" : "text"} onChange={(e) => setForm({ ...form, score: e.target.value })} style={fieldStyle} />
        </label>
        <label style={labelStyle}>Date taken (optional)
          <input type="date" value={form.takenOn} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, takenOn: e.target.value })} style={{ ...fieldStyle, colorScheme: "dark" }} />
        </label>
        <SmallButton type="submit" tone="primary" disabled={!test || !form.score.trim() || (form.testKey === "other" && !form.testName.trim()) || busy || count >= 10}>{busy ? "Saving…" : "Add"}</SmallButton>
      </div>
    </form>
  );
}

function Visible({ row, onToggle, inline }: { row: StudentScoreRow; onToggle: (row: StudentScoreRow) => void; inline?: boolean }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)", cursor: "pointer", marginTop: inline ? 0 : 8 }}>
      <input type="checkbox" checked={!!row.visible_to_employers} onChange={() => onToggle(row)} /> Show to employers
    </label>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title="Remove"
      style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", color: "var(--text-2)", cursor: "pointer" }}>
      <Trash2 size={14} />
    </button>
  );
}
