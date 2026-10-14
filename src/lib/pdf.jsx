/**
 * Сборка PDF в браузере. @react-pdf/renderer тяжёлый и не нужен при
 * статическом пререндере, поэтому подгружается только по требованию.
 */
export async function buildPdf(doc) {
  const [{ pdf }, { default: MenuPdf, registerFonts }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/pdf/MenuPdf"),
  ]);
  registerFonts(window.location.origin);
  return pdf(<MenuPdf doc={doc} />).toBlob();
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.replace(/[\/:*?"<>|]+/g, " ").trim();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
