"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Logo from "./Logo";
import Dropzone from "./Dropzone";
import DocList from "./DocList";
import Settings from "./Settings";
import BlockEditor from "./BlockEditor";
import Preview from "./Preview";
import { loadState, saveState } from "@/lib/storage";
import { defaultSettings, parseWorkbook } from "@/lib/parse";
import { buildPdf, downloadBlob } from "@/lib/pdf";

/** Копирует документ, отдаёт черновик в fn и возвращает новую версию. */
const produce = (doc, fn) => {
  const draft = structuredClone(doc);
  fn(draft);
  draft.updatedAt = Date.now();
  return draft;
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [docs, setDocs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [blockId, setBlockId] = useState(null);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    const s = loadState();
    // Старые сохранения могли появиться до новых настроек — дополняем их.
    setDocs(s.docs.map((d) => ({ ...d, settings: { ...defaultSettings(), ...d.settings } })));
    setActiveId(s.activeId ?? s.docs[0]?.id ?? null);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSaveError(saveState({ docs, activeId })), 300);
    return () => clearTimeout(t);
  }, [docs, activeId, ready]);

  const doc = useMemo(() => docs.find((d) => d.id === activeId) ?? null, [docs, activeId]);
  const block = doc?.blocks.find((b) => b.id === blockId) ?? doc?.blocks[0] ?? null;

  const mutate = useCallback(
    (fn) => setDocs((ds) => ds.map((d) => (d.id === activeId ? produce(d, fn) : d))),
    [activeId],
  );

  async function handleFiles(files) {
    setError("");
    const list = [...files].filter((f) => /\.xlsx?$|\.xlsm$/i.test(f.name));
    if (!list.length) {
      setError("Нужен файл Excel (.xlsx или .xls)");
      return;
    }
    setBusy(true);
    try {
      const parsed = [];
      for (const f of list) parsed.push(await parseWorkbook(f));
      setDocs((ds) => [...parsed, ...ds]);
      setActiveId(parsed[0].id);
      setBlockId(null);
    } catch (e) {
      setError(e.message || "Не удалось прочитать файл");
    } finally {
      setBusy(false);
    }
  }

  function removeDoc(id) {
    const d = docs.find((x) => x.id === id);
    if (!d || !window.confirm(`Удалить «${d.title}» из сохранённых?`)) return;
    const rest = docs.filter((x) => x.id !== id);
    setDocs(rest);
    if (id === activeId) setActiveId(rest[0]?.id ?? null);
  }

  function duplicateDoc(id) {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    const copy = { ...structuredClone(d), id: crypto.randomUUID().slice(0, 8), title: `${d.title} (копия)`, createdAt: Date.now(), updatedAt: Date.now() };
    setDocs((ds) => [copy, ...ds]);
    setActiveId(copy.id);
  }

  async function download() {
    if (!doc) return;
    setBusy(true);
    try {
      const blob = await buildPdf(doc);
      downloadBlob(blob, `${doc.title || "Меню"}.pdf`);
    } catch (e) {
      setError(`Не удалось собрать PDF: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  const openPicker = () => fileInput.current?.click();

  return (
    <div className="flex min-h-dvh flex-col">
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls,.xlsm"
        multiple
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
        <div className="flex items-center gap-4 px-4 py-3 md:px-8">
          <Logo className="h-9 w-auto shrink-0 md:h-10" />
          <div className="hidden h-8 w-px bg-line sm:block" />
          <p className="hidden font-display text-lg text-ink sm:block">
            Меню <span className="accent-italic">в PDF</span>
          </p>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" onClick={openPicker} className="btn-outline" disabled={busy}>
              <span aria-hidden>＋</span> <span className="hidden sm:inline">Загрузить Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
            {doc && (
              <button type="button" onClick={download} className="btn-primary" disabled={busy}>
                {busy ? "Готовим…" : "Скачать PDF"}
              </button>
            )}
          </div>
        </div>
      </header>

      {(error || saveError) && (
        <div className="mx-4 mt-4 flex items-start justify-between gap-4 rounded-2xl border border-clay/30 bg-clay/[0.07] px-5 py-3 text-sm text-clay-deep md:mx-8">
          <span>{error || saveError}</span>
          {error && (
            <button type="button" className="text-mocha hover:text-ink" onClick={() => setError("")}>
              ✕
            </button>
          )}
        </div>
      )}

      {!ready ? null : !doc ? (
        <main className="flex flex-1 flex-col gap-8 px-4 py-10 md:px-8">
          <Dropzone onFiles={handleFiles} onPick={openPicker} busy={busy} />
          {docs.length > 0 && (
            <DocList docs={docs} activeId={activeId} onOpen={setActiveId} onRemove={removeDoc} onDuplicate={duplicateDoc} />
          )}
        </main>
      ) : (
        <main className="grid flex-1 gap-6 px-4 py-6 md:px-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)]">
          <section className="flex min-w-0 flex-col gap-6">
            <DocList
              docs={docs}
              activeId={activeId}
              onOpen={(id) => {
                setActiveId(id);
                setBlockId(null);
              }}
              onRemove={removeDoc}
              onDuplicate={duplicateDoc}
              onAdd={openPicker}
              compact
            />

            <div className="card p-5 md:p-7">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">
                Заголовок меню
              </label>
              <input
                className="field mt-1 -ml-2 font-display text-2xl text-ink md:text-3xl"
                value={doc.title}
                onChange={(e) => mutate((d) => void (d.title = e.target.value))}
                placeholder="Например, Меню · 1-я неделя"
              />
              <p className="mt-1 text-xs text-mocha">
                Из файла «{doc.fileName}» · изменения сохраняются в этом браузере автоматически
              </p>
            </div>

            <Settings settings={doc.settings} onChange={(patch) => mutate((d) => Object.assign(d.settings, patch))} />

            <BlockEditor
              doc={doc}
              block={block}
              onSelect={setBlockId}
              mutate={mutate}
            />
          </section>

          <aside className="min-w-0 xl:sticky xl:top-[84px] xl:h-[calc(100dvh-108px)]">
            <Preview doc={doc} />
          </aside>
        </main>
      )}
    </div>
  );
}
