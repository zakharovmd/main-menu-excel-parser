"use client";

import { useEffect, useRef, useState } from "react";
import { buildPdf } from "@/lib/pdf";

/** Живой предпросмотр: PDF пересобирается через полсекунды после последней правки. */
export default function Preview({ doc }) {
  const [url, setUrl] = useState(null);
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const run = useRef(0);

  useEffect(() => {
    const id = ++run.current;
    setState("building");
    const t = setTimeout(async () => {
      try {
        const blob = await buildPdf(doc);
        if (id !== run.current) return;
        setUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
        setError("");
        setState("ready");
      } catch (e) {
        if (id !== run.current) return;
        console.error(e);
        setError(e.message || String(e));
        setState("error");
      }
    }, 500);
    return () => clearTimeout(t);
  }, [doc]);

  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);

  return (
    <div className="card flex h-[80dvh] flex-col overflow-hidden xl:h-full">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <span className="font-display text-lg text-ink">Предпросмотр</span>
        <span className="text-xs text-mocha">
          {state === "building" ? "обновляем…" : state === "error" ? "ошибка" : "A4 · готово к печати"}
        </span>
      </div>
      {error ? (
        <p className="p-6 text-sm text-clay-deep">Не удалось собрать PDF: {error}</p>
      ) : url ? (
        <iframe title="Предпросмотр PDF" src={`${url}#view=FitH&toolbar=1`} className="w-full flex-1 bg-sand" />
      ) : (
        <div className="grid flex-1 place-items-center text-sm text-mocha">Готовим страницы…</div>
      )}
    </div>
  );
}
