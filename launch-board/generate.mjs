#!/usr/bin/env node
/**
 * Builds the launch board from docs/checklists/*.md.
 *
 *   node launch-board/generate.mjs
 *
 * The checklists are the source of truth: tick an item there in the same
 * commit as the fix. This script reads every checklist, works out what is
 * done, in progress and left, and writes:
 *
 *   launch-board/README.md     the board as GitHub shows it
 *   launch-board/progress.svg  the summary card at the top of the README
 *   launch-board/index.html    the interactive board (open it in a browser)
 *   launch-board/board.json    the same data for scripts
 *
 * With GITHUB_TOKEN and GITHUB_REPOSITORY set (the GitHub Action sets both),
 * open pull requests are read too. A PR that ticks a checklist box, or names
 * an item id as "board: <id>" in its title or body, marks that item In progress.
 *
 * No dependencies. Output is deterministic, so a run with nothing new to show
 * leaves the files unchanged and the Action makes no commit.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const CHECKLISTS = join(ROOT, "docs", "checklists");
const REPO = process.env.GITHUB_REPOSITORY || "divitkej/gradlink";
const BRANCH = "main";

/* Known checklists in reading order. New files in docs/checklists are picked
   up automatically and appended in name order. */
const AREA_ORDER = [
  "launch", "landing-page", "core-loop", "organiser-access",
  "dashboard", "audit-follow-ups", "student-dashboard", "security", "features-to-build",
];

export const STATES = {
  in_progress: { label: "In progress", color: "#35D3FF" },
  owner:       { label: "Needs the owner", color: "#F7C948" },
  todo:        { label: "To do", color: "#FF6B6B" },
  verify:      { label: "Verify live", color: "#5AA9F0" },
  parked:      { label: "Parked by decision", color: "#8A9BAE" },
  done:        { label: "Done", color: "#00C2A8" },
};
const OPEN_ORDER = ["in_progress", "owner", "todo", "verify", "parked"];
const STATE_ORDER = [...OPEN_ORDER, "done"];

/* ---------------- parsing ---------------- */

function slug(text) {
  return text
    .toLowerCase()
    .replace(/`/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
}

function normTitle(t) {
  return t.replace(/[`*]/g, "").replace(/[.:]\s*$/, "").trim().toLowerCase();
}

function cleanTitle(t) {
  return t.replace(/\s+/g, " ").replace(/[.:]\s*$/, "").trim();
}

/** Decide an open item's state from its own words and its section. */
function classify(text, section) {
  const t = text.toLowerCase();
  const s = section.toLowerCase();
  if (/\bin progress\b/.test(t) && !/courses in progress/.test(t)) return "in_progress";
  if (/needs the owner|owner action|owner decision/.test(t)) return "owner";
  if (/\bpaused\b/.test(t)) return "owner";
  if (/^\s*tracked\b|·\s*tracked\b|\btracked\s*$|\bleft as they are by decision\b/.test(t)) return "parked";
  if (/verify live|verify on device|real device|real phones|^verify live:/.test(t)) return "verify";
  if (/owner|outside the code|before deploying|before launch/.test(s)) return "owner";
  if (/verify/.test(s)) return "verify";
  if (/to confirm/.test(s)) return "owner";
  return "todo";
}

function parseChecklist(file) {
  const key = basename(file, ".md");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const h1 = lines.find((l) => /^# /.test(l)) || `# ${key}`;
  const area = h1.replace(/^# /, "").replace(/\s+checklist$/i, "").trim();
  const items = [];
  let section = "";
  let cur = null;

  const flush = () => {
    if (!cur) return;
    const body = [cur.rest, ...cur.cont].join(" ").replace(/\s+/g, " ").trim();
    const doneIn = (body.match(/Done in "([^"]+)"/) || [])[1] || null;
    const state = cur.checked ? "done" : classify(body, cur.section);
    items.push({
      area: key, areaName: area, section: cur.section, line: cur.line,
      title: cleanTitle(cur.title), detail: body, state, doneIn, kind: "checkbox",
    });
    cur = null;
  };

  let table = null;
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/, "");
    const lineNo = i + 1;
    if (/^#{2,}\s/.test(line)) {
      flush();
      table = null;
      section = line.replace(/^#+\s*/, "");
      return;
    }
    const m = line.match(/^- \[( |x|X)\] (.*)$/);
    if (m) {
      flush();
      const rest = m[2];
      const b = rest.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      // Items written without a bold title use their first sentence.
      const title = b ? b[1] : rest.split(/(?<=\.)\s/)[0];
      cur = { checked: m[1] !== " ", title, rest: b ? b[2] : rest.slice(title.length), cont: [], section, line: lineNo };
      return;
    }
    if (cur && /^\s{2,}\S/.test(line)) { cur.cont.push(line.trim()); return; }
    if (cur && line.trim() === "") { flush(); return; }
    if (cur && !/^\s/.test(line)) flush();

    // Tables under "Not built yet" or "Claims to confirm" are open work too.
    if (/not built|to confirm/i.test(section) && /^\|.*\|$/.test(line)) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (!table) { table = { header: cells }; return; }
      if (cells.every((c) => /^:?-{3,}:?$/.test(c))) return;
      const [first, ...rest] = cells;
      const isClaim = /confirm/i.test(section);
      const detail = rest
        .map((c, j) => (c ? `${table.header[j + 1] || ""}: ${c}` : ""))
        .filter(Boolean)
        .join(". ");
      items.push({
        area: key, areaName: area, section, line: lineNo,
        title: cleanTitle(isClaim ? `Confirm the claim ${first}` : `Build: ${first}`),
        detail, state: classify(detail, section), doneIn: null, kind: "table",
      });
      return;
    }
    if (table && !/^\|/.test(line)) table = null;
  });
  flush();

  // Stable, readable ids: <checklist>/<first words of the title>.
  const seen = new Map();
  for (const it of items) {
    let id = `${key}/${slug(it.title.replace(/^(Build|Confirm the claim):?\s*/, ""))}`;
    const n = (seen.get(id) || 0) + 1;
    seen.set(id, n);
    if (n > 1) id += `-${n}`;
    it.id = id;
  }
  return { key, name: area, items };
}

/* ---------------- open pull requests ---------------- */

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "gradlink-launch-board",
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghAll(path) {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const sep = path.includes("?") ? "&" : "?";
    const batch = await gh(`${path}${sep}per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

/** Map of item id -> the open PR working on it. */
async function prWork(areas) {
  const work = new Map();
  if (!process.env.GITHUB_TOKEN) return { work, ok: false };
  const byTitle = new Map();
  for (const a of areas) for (const it of a.items) byTitle.set(`${a.key}::${normTitle(it.title)}`, it);
  const ids = new Set(areas.flatMap((a) => a.items.map((i) => i.id)));

  const prs = await ghAll(`/repos/${REPO}/pulls?state=open&sort=created&direction=asc`);
  for (const pr of prs) {
    const ref = { number: pr.number, title: pr.title, url: pr.html_url, draft: !!pr.draft };
    const text = `${pr.title}\n${pr.body || ""}`;
    for (const m of text.matchAll(/board:\s*([a-z0-9-]+\/[a-z0-9-]+)/gi)) {
      const id = m[1].toLowerCase();
      if (ids.has(id) && !work.has(id)) work.set(id, ref);
    }
    const files = await ghAll(`/repos/${REPO}/pulls/${pr.number}/files`);
    for (const f of files) {
      if (!/^docs\/checklists\/[^/]+\.md$/.test(f.filename) || !f.patch) continue;
      const key = basename(f.filename, ".md");
      for (const l of f.patch.split("\n")) {
        const m = l.match(/^\+- \[[xX]\] \*\*(.+?)\*\*/);
        if (!m) continue;
        const it = byTitle.get(`${key}::${normTitle(m[1])}`);
        if (it && it.state !== "done" && !work.has(it.id)) work.set(it.id, ref);
      }
    }
  }
  return { work, ok: true };
}

/* ---------------- helpers ---------------- */

function lastChecklistChange() {
  try {
    return execFileSync("git", ["log", "-1", "--format=%cs", "--", "docs/checklists"], { cwd: ROOT, encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const srcUrl = (it) => `https://github.com/${REPO}/blob/${BRANCH}/docs/checklists/${it.area}.md?plain=1#L${it.line}`;
const pct = (d, t) => (t ? Math.round((d / t) * 100) : 0);
const textBar = (p, w = 12) => "█".repeat(Math.round((p / 100) * w)) + "░".repeat(w - Math.round((p / 100) * w));
const short = (s, n = 180) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : s);

function counts(items) {
  const c = Object.fromEntries(STATE_ORDER.map((s) => [s, 0]));
  for (const it of items) c[it.state]++;
  return c;
}

/* ---------------- outputs ---------------- */

function renderSvg(board) {
  const { totals, areas } = board;
  const W = 860, rowH = 30, top = 70, H = top + areas.length * rowH + 64;
  const R = 62, C = 2 * Math.PI * R, p = totals.percent;
  const bx = 330, bw = 400;
  let rows = "";
  areas.forEach((a, i) => {
    const y = top + i * rowH;
    let x = bx;
    let segs = "";
    for (const s of ["done", ...OPEN_ORDER]) {
      const n = a.counts[s];
      if (!n) continue;
      const w = (n / a.total) * bw;
      segs += `<rect x="${x.toFixed(1)}" y="${y + 6}" width="${w.toFixed(1)}" height="12" fill="${STATES[s].color}"/>`;
      x += w;
    }
    rows += `<text x="${bx - 14}" y="${y + 16}" text-anchor="end" class="l">${esc(a.name)}</text>`
      + `<rect x="${bx}" y="${y + 6}" width="${bw}" height="12" rx="2" fill="#1A2A3C"/>${segs}`
      + `<text x="${bx + bw + 12}" y="${y + 16}" class="n">${a.counts.done}/${a.total}</text>`;
  });
  let lx = 40;
  let legend = "";
  for (const s of ["done", ...OPEN_ORDER]) {
    const label = `${STATES[s].label} ${totals.counts[s]}`;
    legend += `<rect x="${lx}" y="${H - 30}" width="10" height="10" rx="2" fill="${STATES[s].color}"/><text x="${lx + 15}" y="${H - 21}" class="g">${esc(label)}</text>`;
    lx += 26 + label.length * 6.6;
  }
  const cy = top + 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GradLink launch progress: ${p}% done">
<style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;fill:#E7F0F7}.l{font-size:13px;fill:#B9C8D6}.n{font-size:12px;fill:#8697AA;font-variant-numeric:tabular-nums}.g{font-size:11.5px;fill:#B9C8D6}.h{font-size:18px;font-weight:700}.s{font-size:12px;fill:#8697AA}</style>
<rect width="${W}" height="${H}" rx="12" fill="#0C1826"/>
<text x="40" y="38" class="h">GradLink launch board</text>
<text x="${W - 40}" y="38" text-anchor="end" class="s">${totals.done} of ${totals.total} done · ${totals.open} left</text>
<circle cx="130" cy="${cy}" r="${R}" fill="none" stroke="#1A2A3C" stroke-width="14"/>
<circle cx="130" cy="${cy}" r="${R}" fill="none" stroke="#00C2A8" stroke-width="14" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - p / 100)).toFixed(2)}" transform="rotate(-90 130 ${cy})"/>
<text x="130" y="${cy + 4}" text-anchor="middle" style="font-size:30px;font-weight:700">${p}%</text>
<text x="130" y="${cy + 24}" text-anchor="middle" class="s">done</text>
${rows}
${legend}
</svg>
`;
}

function renderReadme(board) {
  const { totals, areas, items, updated, prsRead } = board;
  const L = [];
  L.push("# GradLink Launch Board", "");
  L.push("> Generated from [`docs/checklists/`](../docs/checklists/) by [`generate.mjs`](generate.mjs). Do not edit this file by hand: tick the item in its checklist and the board rebuilds itself. See [How it updates](#how-it-updates).", "");
  L.push("![Launch progress](progress.svg)", "");
  L.push(`**${totals.done} of ${totals.total} done (${totals.percent}%).** ${totals.counts.in_progress} in progress, ${totals.open} left.${updated ? ` Checklists last changed ${updated}.` : ""}`, "");
  L.push("Open the interactive version: download [`index.html`](index.html) and open it in a browser.", "");

  L.push("```mermaid", "pie showData", "  title Where everything stands");
  for (const s of STATE_ORDER) if (totals.counts[s]) L.push(`  "${STATES[s].label}" : ${totals.counts[s]}`);
  L.push("```", "");

  L.push("## By area", "");
  L.push("| Area | Progress | Done | Left | Checklist |", "|---|---|---|---|---|");
  for (const a of areas) {
    const p = pct(a.counts.done, a.total);
    L.push(`| ${a.name} | \`${textBar(p)}\` ${p}% | ${a.counts.done} | ${a.total - a.counts.done} | [${a.key}.md](../docs/checklists/${a.key}.md) |`);
  }
  L.push(`| **All** | \`${textBar(totals.percent)}\` **${totals.percent}%** | **${totals.done}** | **${totals.open}** | |`, "");

  const line = (it) => {
    const pr = it.pr ? ` · [PR #${it.pr.number}](${it.pr.url})${it.pr.draft ? " (draft)" : ""}` : "";
    return `- [ ] **${it.title}** · ${it.areaName} · [source](${srcUrl(it)})${pr}<br><sub>${short(it.detail).replace(/\|/g, "\\|") || "&nbsp;"} · id \`${it.id}\`</sub>`;
  };

  L.push("## In progress", "");
  const inProg = items.filter((i) => i.state === "in_progress");
  if (inProg.length) inProg.forEach((i) => L.push(line(i)));
  else L.push(prsRead ? "Nothing is in progress right now. Open a pull request that ticks an item, or put `board: <id>` in its description, and it shows here." : "Open pull requests were not read on this run (no GitHub token), so nothing shows as in progress.");
  L.push("");

  L.push("## Left to do", "");
  for (const s of OPEN_ORDER.slice(1)) {
    const list = items.filter((i) => i.state === s);
    if (!list.length) continue;
    L.push(`### ${STATES[s].label} (${list.length})`, "");
    list.forEach((i) => L.push(line(i)));
    L.push("");
  }

  L.push("## Done", "");
  for (const a of areas) {
    const list = items.filter((i) => i.area === a.key && i.state === "done");
    if (!list.length) continue;
    L.push(`<details><summary><b>${esc(a.name)}</b>: ${list.length} done</summary>`, "");
    list.forEach((i) => L.push(`- [x] ${i.title}${i.doneIn ? ` <sub>Done in "${esc(i.doneIn)}"</sub>` : ""}`));
    L.push("", "</details>", "");
  }

  L.push("## How it updates", "");
  L.push("- **Source of truth:** every item lives in a file in [`docs/checklists/`](../docs/checklists/). Change the checkbox there, never here.");
  L.push("- **Done:** tick the box (`- [x]`) in the same commit as the fix. When that commit reaches `main`, the [Launch board workflow](../.github/workflows/launch-board.yml) rebuilds this folder and commits it.");
  L.push("- **In progress:** open a pull request that ticks the box. The item shows as in progress, with a link to the PR, until the PR merges. You can also write `board: <id>` in a PR's title or description (ids are listed under each item).");
  L.push("- **Needs the owner, Verify live, Parked:** read from the item's own words (\"Owner action\", \"Verify live\", \"Tracked\") or its section heading.");
  L.push("- **New items or checklists:** add a `- [ ] **Title.** details` line to any checklist, or a new `docs/checklists/<area>.md` file. The board picks it up on the next run.");
  L.push("- **Run it yourself:** `node launch-board/generate.mjs`. Set `GITHUB_TOKEN` to include open pull requests.", "");
  return L.join("\n");
}

function renderHtml(board) {
  const data = JSON.stringify({
    repo: REPO, branch: BRANCH, updated: board.updated,
    states: STATES, stateOrder: STATE_ORDER, openOrder: OPEN_ORDER,
    areas: board.areas.map((a) => ({ key: a.key, name: a.name })),
    items: board.items.map((i) => ({ id: i.id, area: i.area, section: i.section, line: i.line, title: i.title, detail: i.detail, state: i.state, doneIn: i.doneIn, pr: i.pr || null })),
  }).replace(/</g, "\\u003c");
  const tpl = readFileSync(join(HERE, "template.html"), "utf8");
  return tpl.replace("/*__BOARD_DATA__*/null", data);
}

/* ---------------- main ---------------- */

async function main() {
  if (!existsSync(CHECKLISTS)) throw new Error(`No checklists at ${CHECKLISTS}`);
  const files = readdirSync(CHECKLISTS).filter((f) => f.endsWith(".md")).map((f) => basename(f, ".md"));
  files.sort((a, b) => {
    const ia = AREA_ORDER.indexOf(a), ib = AREA_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
  const areas = files.map((k) => parseChecklist(join(CHECKLISTS, `${k}.md`))).filter((a) => a.items.length);

  let prsRead = false;
  try {
    const { work, ok } = await prWork(areas);
    prsRead = ok;
    for (const a of areas) for (const it of a.items) {
      const pr = work.get(it.id);
      if (pr && it.state !== "done") { it.state = "in_progress"; it.pr = pr; }
    }
  } catch (e) {
    console.warn(`[launch-board] could not read pull requests: ${e.message}`);
  }

  const items = areas.flatMap((a) => a.items);
  const order = (s) => STATE_ORDER.indexOf(s);
  const sorted = [...items].sort((x, y) => order(x.state) - order(y.state));
  const c = counts(items);
  const board = {
    updated: lastChecklistChange(),
    prsRead,
    totals: { total: items.length, done: c.done, open: items.length - c.done, percent: pct(c.done, items.length), counts: c },
    areas: areas.map((a) => ({ key: a.key, name: a.name, total: a.items.length, counts: counts(a.items) })),
    items: sorted,
  };

  writeFileSync(join(HERE, "board.json"), JSON.stringify({
    updated: board.updated, totals: board.totals, areas: board.areas,
    items: board.items.map(({ kind, ...rest }) => rest),
  }, null, 2) + "\n");
  writeFileSync(join(HERE, "progress.svg"), renderSvg(board));
  writeFileSync(join(HERE, "README.md"), renderReadme(board));
  writeFileSync(join(HERE, "index.html"), renderHtml(board));
  console.log(`[launch-board] ${board.totals.done}/${board.totals.total} done, ${c.in_progress} in progress, ${board.totals.open} left${prsRead ? "" : " (pull requests not read)"}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
