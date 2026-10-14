"use client";

import { useState } from "react";

export default function Dropzone({ onFiles, onPick, busy }) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onFiles(e.dataTransfer.files);
      }}
      className={`relative mx-auto flex w-full max-w-3xl flex-col items-center overflow-hidden rounded-[44px] border-2 border-dashed px-6 py-16 text-center transition-colors md:py-24 ${
        over ? "border-clay bg-clay/[0.06]" : "border-line bg-shell"
      }`}
    >
      <span className="blob -top-24 -left-20 size-72 bg-leaf/20" aria-hidden />
      <span className="blob -right-24 -bottom-28 size-80 bg-amber/20" aria-hidden />

      <span className="sticker relative -rotate-2 text-clay">Excel → PDF для печати</span>
      <h1 className="display relative mt-6 text-4xl text-ink md:text-6xl">
        Меню, готовое <span className="accent-italic">к печати</span>
      </h1>
      <p className="relative mt-5 max-w-xl text-[15px] leading-relaxed text-mocha md:text-base">
        Перетащите сюда файл «Меню N неделя.xlsx». Дни недели, разделы, выход и цены разложатся по
        фирменным страницам с логотипом. Результат сохранится в браузере, и любое поле можно поправить.
      </p>
      <button type="button" onClick={onPick} disabled={busy} className="btn-primary relative mt-8 !h-12 !px-7 !text-[15px]">
        {busy ? "Читаем файл…" : "Выбрать файл"}
      </button>
      <p className="relative mt-3 text-xs text-mocha">.xlsx, .xls — можно сразу несколько недель</p>
    </div>
  );
}
