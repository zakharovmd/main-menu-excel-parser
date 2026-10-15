import * as XLSX from "xlsx";
import { uid } from "./uid.js";

/**
 * Excel → модель меню.
 *
 * Модель документа:
 *   doc.blocks[] — каждая страница (или группа страниц) PDF:
 *     { id, kind: "day" | "list", title, subtitle, enabled, note, sections[] }
 *   section: { id, title, items[] }
 *   item:    { id, weight, name, desc, kbju, price }
 *
 * Понимает три вида листов, которые встречаются в файлах «Меню N неделя»:
 *   1. Недельная сетка — в шапке несколько «Выход … <день> … Цена» подряд.
 *   2. Список — одна пара «Выход … Цена» (меню на Пн–Пт).
 *   3. Простой столбец строк «<код> <название> <выход>» (завтраки).
 * Столбцы ищутся по шапке, а не по фиксированным буквам: в разных неделях
 * таблица сдвинута на колонку. Столбец КБЖУ («450/18/36/14») необязателен:
 * его находим по заголовку, а если заголовка нет — по самим значениям.
 */

const DAY_ACCENTS = ["#75A138", "#944920", "#4E6B22", "#C0702B", "#D08C2C", "#6F3516", "#7E6653"];

const CATEGORY_RE =
  /салат|закуск|суп|перв|втор|основн|горяч|гарнир|десерт|выпечк|напит|блюд|завтрак|каш/i;
const DRINK_RE = /напит|чай|морс|компот|кофе|сок|вода|каркад/i;

const clean = (v) =>
  String(v ?? "")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isNumeric = (v) => /^\d+([.,]\d+)?$/.test(clean(v));

const KBJU_GROUP = /\d+(?:[.,]\d+)?(?:\/\d+(?:[.,]\d+)?){2,3}/.source;
/** «450/18/36/14», у фреша — несколько вариантов через пробел. */
const KBJU_RE = new RegExp(`^${KBJU_GROUP}(?:\\s+${KBJU_GROUP})*$`);
const isKbjuHeader = (v) => /^кбжу$/i.test(clean(v));

function normKbju(v) {
  const s = clean(v).replace(/\s*\/\s*/g, "/");
  return KBJU_RE.test(s) ? s : "";
}

function normWeight(v) {
  let s = clean(v);
  if (!s) return "";
  s = s.replace(/\\/g, "/").replace(/\s*гр?\.?$/i, "").replace(/\s*\/\s*/g, "/");
  return s;
}

function normPrice(v) {
  const s = clean(v).replace(",", ".");
  if (!s) return "";
  const n = Number(s);
  if (!Number.isFinite(n) || n <= 0) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

/** «Салат Цезарь        (курица, айсберг…)» → name + desc; «A \ B» → «A / B». */
function splitName(raw, weight) {
  const original = String(raw ?? "");
  let name = original;
  let desc = "";
  const m = original.match(/^(.*?)\s*\(([^()]*)\)\s*$/s);
  if (m && /\s{3,}/.test(original)) {
    name = m[1];
    desc = clean(m[2]);
  }
  name = clean(name)
    // Код блюда, случайно попавший в название: «217641 Рыба треска …»
    .replace(/^\d{5,7}\s+/, "")
    .replace(/\s*\\\s*/g, " / ");
  // Выход, продублированный в конце названия: «… с овощами в пергаменте 75/25»
  if (weight) {
    const tail = new RegExp(`\\s+${weight.replace(/[/\\]/g, "[/\\\\]")}$`);
    name = name.replace(tail, "");
  }
  name = name.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  return { name, desc };
}

const item = (weight, rawName, price, kbju) => {
  const w = normWeight(weight);
  const { name, desc } = splitName(rawName, w);
  return { id: uid(), weight: w, name, desc, kbju: normKbju(kbju), price: normPrice(price) };
};

const section = (title = "") => ({ id: uid(), title: clean(title), items: [] });

function sheetRows(ws) {
  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false, blankrows: true });
}

const filled = (row) =>
  (row || []).map((v, c) => ({ c, v })).filter(({ v }) => v !== null && clean(v) !== "");

function findHeader(rows) {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const cells = filled(rows[r]);
    const out = cells.filter(({ v }) => /^выход$/i.test(clean(v))).map(({ c }) => c);
    const price = cells.filter(({ v }) => /^цена$/i.test(clean(v))).map(({ c }) => c);
    if (out.length && price.length) return { r, out, price, cells };
  }
  return null;
}

/**
 * Столбец КБЖУ между «Выход» и «Цена»: по заголовку, иначе — столбец, где
 * большинство заполненных ячеек выглядят как «ккал/б/ж/у».
 */
function findKbjuCol(rows, header, from, to, exclude) {
  const byTitle = header.cells.find(({ c, v }) => c > from && c < to && isKbjuHeader(v));
  if (byTitle) return byTitle.c;
  for (let c = from + 1; c < to; c++) {
    if (exclude.includes(c)) continue;
    let hits = 0;
    let total = 0;
    for (let r = header.r + 1; r < rows.length; r++) {
      const v = clean(rows[r]?.[c]);
      if (!v) continue;
      total++;
      if (KBJU_RE.test(v)) hits++;
    }
    if (hits >= 3 && hits / total > 0.7) return c;
  }
  return -1;
}

/**
 * Пустая строка внутри таблицы, после которой идут блюда без заголовка
 * (в недельной сетке так «потерялся» заголовок «Напитки»), открывает
 * новую секцию. Название угадываем по содержимому, его можно поправить.
 */
function finalizeSections(sections) {
  const result = [];
  for (const s of sections) {
    if (!s.items.length) continue;
    if (!s.title && s.items.every((i) => DRINK_RE.test(i.name))) s.title = "Напитки";
    result.push(s);
  }
  return result;
}

/** Недельная сетка: несколько дней по столбцам. */
function parseWeekGrid(rows, header) {
  const days = header.out.map((outCol, i) => {
    const priceCol = header.price.find((p) => p > outCol);
    const nextOut = header.out[i + 1] ?? Infinity;
    const named = header.cells.find(
      ({ c, v }) => c > outCol && c < priceCol && c < nextOut && !/^код$/i.test(clean(v)) && !isKbjuHeader(v),
    );
    const nameCol = named ? named.c : priceCol - 1;
    const title = named ? clean(named.v) : `День ${i + 1}`;
    const kbjuCol = findKbjuCol(rows, header, outCol, Math.min(priceCol, nextOut), [nameCol]);
    return { outCol, nameCol, priceCol, kbjuCol, title, sections: [section()], notes: [] };
  });

  let blankBefore = false;
  for (let r = header.r + 1; r < rows.length; r++) {
    const cells = filled(rows[r]);
    if (!cells.length) {
      blankBefore = true;
      continue;
    }

    // Строка из одного текстового значения — заголовок категории для всех дней
    // либо подпись внизу таблицы («Бизнес Ланч 210 руб.»).
    if (cells.length === 1 && !isNumeric(cells[0].v)) {
      const text = clean(cells[0].v);
      const isDayNameCol = days.some((d) => d.nameCol === cells[0].c);
      if (isDayNameCol && !CATEGORY_RE.test(text)) {
        days.forEach((d) => d.notes.push(text));
      } else {
        days.forEach((d) => d.sections.push(section(text)));
      }
      blankBefore = false;
      continue;
    }

    if (blankBefore) days.forEach((d) => d.sections.push(section()));
    blankBefore = false;

    const row = rows[r];
    for (const d of days) {
      const name = clean(row[d.nameCol]);
      if (!name) continue;
      d.sections.at(-1).items.push(item(row[d.outCol], row[d.nameCol], row[d.priceCol], row[d.kbjuCol]));
    }
  }

  return days.map((d, i) => ({
    id: uid(),
    kind: "day",
    title: d.title,
    subtitle: "",
    accent: DAY_ACCENTS[i % DAY_ACCENTS.length],
    enabled: true,
    note: [...new Set(d.notes)].join("\n"),
    sections: finalizeSections(d.sections),
  }));
}

/** Список с одной парой «Выход … Цена». */
function parseList(rows, header, sheetName) {
  const outCol = header.out[0];
  const priceCol = header.price[0];
  const named = header.cells.find(({ c, v }) => c > outCol && c < priceCol && !isKbjuHeader(v));
  const nameCol = named ? named.c : outCol + 1;
  const subtitle = named ? clean(named.v).replace(/-/g, "–") : "";
  const kbjuCol = findKbjuCol(rows, header, outCol, priceCol, [nameCol]);

  const sections = [section()];
  const notes = [];
  for (let r = header.r + 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const cells = filled(row);
    if (!cells.length) continue;
    const raw = row[nameCol];
    const text = clean(raw);
    const weight = clean(row[outCol]);
    const price = clean(row[priceCol]);
    if (!text) continue;
    if (isNumeric(text) && !weight && !price) continue; // служебные числа под таблицей

    const leadingSpaces = /^\s{2,}/.test(String(raw));
    if (!weight && !price && (leadingSpaces || (CATEGORY_RE.test(text) && text.split(" ").length <= 6))) {
      sections.push(section(text));
      continue;
    }
    sections.at(-1).items.push(item(row[outCol], raw, row[priceCol], row[kbjuCol]));
  }

  return {
    id: uid(),
    kind: "list",
    title: listTitle(sheetName),
    subtitle,
    accent: "#944920",
    enabled: true,
    note: notes.join("\n"),
    sections: finalizeSections(sections),
  };
}

/** Столбец строк «217611 Творожники с рисом на кокосовом молоке 100». */
function parseLines(rows, sheetName) {
  const s = section();
  const notes = [];
  for (const row of rows) {
    for (const { v } of filled(row)) {
      const text = clean(v);
      if (isNumeric(text)) continue;
      const m = text.match(/^(\d{5,7})\s+(.+?)(?:\s+(\d+(?:[/\\]\d+)*))?$/);
      if (m) s.items.push(item(m[3] || "", m[2], ""));
      else notes.push(text);
    }
  }
  if (!s.items.length) return null;
  return {
    id: uid(),
    kind: "list",
    title: listTitle(sheetName),
    subtitle: "",
    accent: "#75A138",
    enabled: true,
    note: notes.length ? `Также в наличии: ${notes.join("; ")}` : "",
    sections: [s],
  };
}

function listTitle(sheetName) {
  const name = clean(sheetName);
  if (!name || /^(лист|sheet)\s*\d*$/i.test(name)) return "Меню на каждый день";
  return name
    .split(" ")
    .map((w) => (/^зож$/i.test(w) ? "ЗОЖ" : w))
    .join(" ")
    .replace(/^./, (c) => c.toUpperCase());
}

function docTitle(fileName) {
  return clean(fileName.replace(/\.[^.]+$/, "").replace(/_/g, " ")) || "Меню";
}

export const defaultSettings = () => ({
  showWeight: true,
  showPrice: true,
  showKbju: true,
  cream: true,
  mergePortions: true,
  columns: 2,
  scale: 1,
  logoCorner: "top-right",
  footer: "Main-menu.ru · +7 916 762-20-48",
});

export async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });

  // Скрытые листы (hidden / veryHidden) — это черновики и старые шаблоны,
  // которых человек в Excel не видит. В меню берём только видимые.
  const meta = wb.Workbook?.Sheets ?? [];
  const visible = wb.SheetNames.filter((_, i) => !meta[i]?.Hidden);
  if (!visible.length) throw new Error("В файле нет видимых листов");

  const blocks = [];
  for (const name of visible) {
    const rows = sheetRows(wb.Sheets[name]);
    if (!rows.some((r) => filled(r).length)) continue;
    const header = findHeader(rows);
    if (header && header.out.length > 1) blocks.push(...parseWeekGrid(rows, header));
    else if (header) blocks.push(parseList(rows, header, name));
    else {
      const b = parseLines(rows, name);
      if (b) blocks.push(b);
    }
  }

  const nonEmpty = blocks.filter((b) => b.sections.length);
  if (!nonEmpty.length) throw new Error("Не удалось найти блюда в файле");

  const now = Date.now();
  return {
    id: uid(),
    title: docTitle(file.name),
    fileName: file.name,
    createdAt: now,
    updatedAt: now,
    settings: defaultSettings(),
    blocks: nonEmpty,
  };
}
