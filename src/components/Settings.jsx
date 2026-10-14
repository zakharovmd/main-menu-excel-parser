"use client";

function Toggle({ checked, onChange, children }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink select-none">
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-leaf" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-shell shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`}
        />
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

function Segmented({ value, options, onChange }) {
  return (
    <div className="inline-flex self-start rounded-full border border-line bg-cream p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            value === o.value ? "bg-clay text-cream" : "text-mocha hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const Label = ({ children }) => (
  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mocha">{children}</span>
);

export default function Settings({ settings, onChange }) {
  return (
    <details className="card group p-5 md:p-7" open>
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <h2 className="font-display text-xl text-ink">Оформление PDF</h2>
        <span className="text-mocha transition-transform group-open:rotate-180">⌄</span>
      </summary>

      <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Toggle checked={settings.showWeight} onChange={(v) => onChange({ showWeight: v })}>
          Показывать выход (граммы)
        </Toggle>
        <Toggle checked={settings.showPrice} onChange={(v) => onChange({ showPrice: v })}>
          Показывать цены
        </Toggle>
        <Toggle checked={settings.mergePortions !== false} onChange={(v) => onChange({ mergePortions: v })}>
          Склеивать порции (250 / 150 г)
        </Toggle>
        <Toggle checked={settings.cream} onChange={(v) => onChange({ cream: v })}>
          Кремовый фон страницы
        </Toggle>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label>Колонки</Label>
          <Segmented
            value={Number(settings.columns)}
            onChange={(v) => onChange({ columns: v })}
            options={[
              { value: 1, label: "Одна" },
              { value: 2, label: "Две" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Логотип в углу</Label>
          <Segmented
            value={settings.logoCorner}
            onChange={(v) => onChange({ logoCorner: v })}
            options={[
              { value: "top-left", label: "↖" },
              { value: "top-right", label: "↗" },
              { value: "bottom-left", label: "↙" },
              { value: "bottom-right", label: "↘" },
            ]}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>Размер текста · {Math.round(settings.scale * 100)}%</Label>
          <input
            type="range"
            min="0.8"
            max="1.25"
            step="0.05"
            value={settings.scale}
            onChange={(e) => onChange({ scale: Number(e.target.value) })}
            className="accent-clay"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Подпись внизу страницы</Label>
          <input
            className="field -ml-2 text-sm"
            value={settings.footer}
            onChange={(e) => onChange({ footer: e.target.value })}
            placeholder="main-menu.ru · телефон"
          />
        </div>
      </div>
    </details>
  );
}
