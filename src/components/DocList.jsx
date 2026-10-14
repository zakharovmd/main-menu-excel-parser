"use client";

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function DocList({ docs, activeId, onOpen, onRemove, onDuplicate, onAdd, compact = false }) {
  return (
    <div className={compact ? "" : "mx-auto w-full max-w-3xl"}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">Сохранённые меню</h2>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {docs.map((d) => {
          const active = d.id === activeId;
          return (
            <div
              key={d.id}
              className={`group relative flex w-56 shrink-0 flex-col rounded-2xl border px-4 py-3 transition-colors ${
                active ? "border-clay bg-clay/[0.07]" : "border-line bg-shell hover:border-ink/25"
              }`}
            >
              <button type="button" onClick={() => onOpen(d.id)} className="text-left">
                <span className={`block truncate font-display text-[17px] ${active ? "text-clay" : "text-ink"}`}>
                  {d.title || "Без названия"}
                </span>
                <span className="mt-0.5 block text-xs text-mocha">
                  {d.blocks.filter((b) => b.enabled).length} стр. · {fmt.format(d.updatedAt)}
                </span>
              </button>
              <div className="absolute top-2 right-2 flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" className="icon-btn" title="Копия" onClick={() => onDuplicate(d.id)}>
                  ⧉
                </button>
                <button type="button" className="icon-btn" title="Удалить" onClick={() => onRemove(d.id)}>
                  ✕
                </button>
              </div>
            </div>
          );
        })}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="flex w-40 shrink-0 items-center justify-center rounded-2xl border border-dashed border-line text-sm font-semibold text-mocha transition-colors hover:border-clay hover:text-clay"
          >
            ＋ Новый файл
          </button>
        )}
      </div>
    </div>
  );
}
