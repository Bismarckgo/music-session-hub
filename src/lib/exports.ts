import type { Collaborator, Work } from "./catalog";

function esc(s: unknown): string {
  const str = s == null ? "" : String(s);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function downloadSplitCSV(work: Work, collaborators: Collaborator[]) {
  const total = collaborators.reduce((a, c) => a + Number(c.split_percent), 0);
  const header = [
    "Canción",
    "Fingerprint",
    "ISRC",
    "ISWC",
    "Género",
    "BPM",
    "Tonalidad",
  ];
  const meta = [
    work.title,
    work.fingerprint,
    work.isrc ?? "",
    work.iswc ?? "",
    work.genre ?? "",
    work.bpm ?? "",
    work.musical_key ?? "",
  ];
  const collabHeader = ["Nombre", "Rol", "Split (%)", "IPI", "PRO", "Publisher"];
  const rows = collaborators.map((c) => [
    c.name,
    c.role,
    Number(c.split_percent),
    c.ipi ?? "",
    c.pro ?? "",
    c.publisher ?? "",
  ]);
  const lines = [
    header.map(esc).join(","),
    meta.map(esc).join(","),
    "",
    collabHeader.map(esc).join(","),
    ...rows.map((r) => r.map(esc).join(",")),
    "",
    ["Total", "", total].map(esc).join(","),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${work.fingerprint}-split-sheet.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: unknown): string {
  const str = s == null ? "" : String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function openCreditsPDF(work: Work, collaborators: Collaborator[]) {
  const total = collaborators.reduce((a, c) => a + Number(c.split_percent), 0);
  const rows = collaborators
    .map(
      (c) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.role)}</td>
          <td class="num">${Number(c.split_percent)}%</td>
          <td class="mono">${escapeHtml(c.ipi ?? "")}</td>
          <td>${escapeHtml(c.pro ?? "")}</td>
          <td>${escapeHtml(c.publisher ?? "")}</td>
        </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Créditos — ${escapeHtml(work.title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #111827; margin: 40px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .fp { font-family: ui-monospace, Menlo, monospace; font-size: 12px; color: #6b7280; }
  .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
  .meta div { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; }
  .meta label { display: block; font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta span { font-weight: 600; font-size: 14px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 32px 0 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; background: #f9fafb; }
  .num { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  tfoot td { font-weight: 700; border-top: 2px solid #111827; border-bottom: none; }
  .footer { margin-top: 40px; font-size: 11px; color: #6b7280; text-align: center; }
  @media print { body { margin: 20mm; } .noprint { display: none; } }
  .actions { margin-bottom: 20px; }
  .actions button { padding: 8px 16px; background: #2563eb; color: white; border: 0; border-radius: 6px; font-weight: 600; cursor: pointer; }
</style>
</head>
<body>
  <div class="actions noprint"><button onclick="window.print()">Imprimir / Guardar como PDF</button></div>
  <h1>${escapeHtml(work.title)}</h1>
  <p class="fp">Fingerprint · ${escapeHtml(work.fingerprint)}</p>
  <div class="meta">
    <div><label>ISRC</label><span>${escapeHtml(work.isrc ?? "—")}</span></div>
    <div><label>ISWC</label><span>${escapeHtml(work.iswc ?? "—")}</span></div>
    <div><label>Género</label><span>${escapeHtml(work.genre ?? "—")}</span></div>
    <div><label>BPM · Tonalidad</label><span>${escapeHtml(work.bpm ?? "—")} · ${escapeHtml(work.musical_key ?? "—")}</span></div>
  </div>
  <h2>Créditos</h2>
  <table>
    <thead><tr>
      <th>Nombre</th><th>Rol</th><th class="num">Split</th><th>IPI</th><th>PRO</th><th>Publisher</th>
    </tr></thead>
    <tbody>${rows || `<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:24px">Sin créditos registrados</td></tr>`}</tbody>
    ${collaborators.length ? `<tfoot><tr><td colspan="2">Total</td><td class="num">${total}%</td><td colspan="3"></td></tr></tfoot>` : ""}
  </table>
  <p class="footer">Documento generado con CST · Credit Session Track</p>
</body>
</html>`;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}