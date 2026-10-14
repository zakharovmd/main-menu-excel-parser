"use client";

import { uid } from "@/lib/uid";

const move = (arr, i, dir) => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]];
};

const newItem = () => ({ id: uid(), weight: "", name: "", desc: "", price: "" });

export default function BlockEditor({ doc, block, onSelect, mutate }) {
  if (!block) return null;
  const bi = doc.blocks.findIndex((b) => b.id === block.id);
  /** Правка текущего блока внутри черновика документа. */
  const edit = (fn) => mutate((d) => fn(d.blocks[bi], d));

  return (
    <div className="card overflow-hidden">
      {/* Страницы (дни и отдельные меню) */}
      <div className="flex gap-2 overflow-x-auto border-b border-line bg-sand/60 p-3">
        {doc.blocks.map((b, i) => {
          const active = b.id === block.id;
          return (
            <div
              key={b.id}
              className={`flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-2 text-sm transition-colors ${
                active ? "border-clay bg-shell text-clay" : "border-transparent text-ink hover:bg-shell/70"
              } ${b.enabled ? "" : "opacity-50"}`}
            >
              <input
                type="checkbox"
                title="Включить в PDF"
                className="size-4 accent-leaf"
                checked={b.enabled}
                onChange={(e) => mutate((d) => void (d.blocks[i].enabled = e.target.checked))}
              />
              <button type="button" onClick={() => onSelect(b.id)} className="font-semibold">
                {b.title || "Без названия"}
              </button>
            </div>
          );
        })}
      </div>

      <div className="p-5 md:p-7">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">Заголовок страницы</span>
            <input
              className="field -ml-2 font-display text-2xl text-ink"
              value={block.title}
              onChange={(e) => edit((b) => (b.title = e.target.value))}
            />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">Подзаголовок</span>
            <input
              className="field -ml-2 font-display text-xl italic text-clay"
              value={block.subtitle}
              placeholder="необязательно"
              onChange={(e) => edit((b) => (b.subtitle = e.target.value))}
            />
          </div>
        </div>
        <div className="mt-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">
            Плашка под заголовком · каждая строка отдельно
          </span>
          <textarea
            rows={Math.max(1, (block.note || "").split("\n").length)}
            className="field -ml-2 resize-none text-sm"
            value={block.note}
            placeholder="Например, Бизнес-ланч 210 ₽"
            onChange={(e) => edit((b) => (b.note = e.target.value))}
          />
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {block.sections.map((sec, si) => (
            <div key={sec.id} className="rounded-[22px] border border-line bg-cream/60 p-3 md:p-4">
              <div className="flex items-center gap-1">
                <input
                  className="field font-display text-lg italic text-clay"
                  value={sec.title}
                  placeholder="Название раздела"
                  onChange={(e) => edit((b) => (b.sections[si].title = e.target.value))}
                />
                <button type="button" className="icon-btn" title="Выше" disabled={si === 0} onClick={() => edit((b) => move(b.sections, si, -1))}>
                  ↑
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Ниже"
                  disabled={si === block.sections.length - 1}
                  onClick={() => edit((b) => move(b.sections, si, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  title="Удалить раздел"
                  onClick={() => {
                    if (window.confirm(`Удалить раздел «${sec.title || "без названия"}»?`)) edit((b) => b.sections.splice(si, 1));
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="mt-2 hidden grid-cols-[5.5rem_minmax(0,1fr)_5rem_5.6rem] gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-mocha/80 sm:grid">
                <span className="pl-2">Выход</span>
                <span className="pl-2">Блюдо и описание</span>
                <span className="pl-2">Цена, ₽</span>
              </div>

              <ul className="mt-1 flex flex-col">
                {sec.items.map((it, ii) => {
                  const set = (key) => (e) => edit((b) => (b.sections[si].items[ii][key] = e.target.value));
                  return (
                    <li
                      key={it.id}
                      className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 border-b border-line/70 py-1.5 last:border-0 sm:grid-cols-[5.5rem_minmax(0,1fr)_5rem_5.6rem]"
                    >
                      <input className="field text-sm text-mocha" value={it.weight} placeholder="—" onChange={set("weight")} />
                      <div className="flex min-w-0 flex-col">
                        <input className="field text-[15px] text-ink" value={it.name} placeholder="Название блюда" onChange={set("name")} />
                        <input className="field text-xs text-mocha" value={it.desc} placeholder="состав (необязательно)" onChange={set("desc")} />
                      </div>
                      <input
                        className="field col-start-2 text-sm font-semibold sm:col-start-auto"
                        value={it.price}
                        inputMode="decimal"
                        placeholder="—"
                        onChange={set("price")}
                      />
                      <div className="col-start-2 flex items-start sm:col-start-auto">
                        <button type="button" className="icon-btn" title="Выше" disabled={ii === 0} onClick={() => edit((b) => move(b.sections[si].items, ii, -1))}>
                          ↑
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Ниже"
                          disabled={ii === sec.items.length - 1}
                          onClick={() => edit((b) => move(b.sections[si].items, ii, 1))}
                        >
                          ↓
                        </button>
                        <button type="button" className="icon-btn" title="Удалить" onClick={() => edit((b) => b.sections[si].items.splice(ii, 1))}>
                          ✕
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                className="mt-2 ml-1 text-sm font-semibold text-leaf-deep hover:text-clay"
                onClick={() => edit((b) => b.sections[si].items.push(newItem()))}
              >
                ＋ Блюдо
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn-outline mt-5"
          onClick={() => edit((b) => b.sections.push({ id: uid(), title: "Новый раздел", items: [newItem()] }))}
        >
          ＋ Раздел
        </button>
      </div>
    </div>
  );
}
