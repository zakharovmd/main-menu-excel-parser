import { Document, Font, G, Page, Path, Rect, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { LOGO_VIEWBOX, MARK_PATH, PLATE_PATH } from "../lib/logoPaths";

/** Палитра сайта MAIN MENU (src/app/globals.css в main-menu). */
const C = {
  cream: "#FDF8F0",
  sand: "#F5EBDC",
  shell: "#FFFFFF",
  line: "#E8D9C4",
  ink: "#26160D",
  mocha: "#7E6653",
  clay: "#944920",
  clayDeep: "#6F3516",
  leaf: "#75A138",
};

let fontsReady = false;
export function registerFonts(origin) {
  if (fontsReady) return;
  const f = (name) => `${origin}/fonts/${name}.ttf`;
  Font.register({
    family: "Manrope",
    fonts: [
      { src: f("Manrope-400"), fontWeight: 400 },
      { src: f("Manrope-500"), fontWeight: 500 },
      { src: f("Manrope-600"), fontWeight: 600 },
      { src: f("Manrope-700"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Playfair",
    fonts: [
      { src: f("Playfair-500"), fontWeight: 500 },
      { src: f("Playfair-600"), fontWeight: 600 },
      { src: f("Playfair-500i"), fontWeight: 500, fontStyle: "italic" },
      { src: f("Playfair-600i"), fontWeight: 600, fontStyle: "italic" },
    ],
  });
  // Русский текст не переносим по слогам — только по словам.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const PAGE = { w: 595.28, h: 841.89, padX: 40, padTop: 40, padBottom: 56 };
const LOGO_W = 96;
const LOGO_H = (LOGO_W * 7064) / 17050;
const LOGO_TOP = 30;
const LOGO_BOTTOM = 46;
/** Логотип стоит на каждой странице, поэтому под него резервируется поле. */
const logoTop = (corner) => (corner.startsWith("top") ? LOGO_TOP + LOGO_H + 12 : PAGE.padTop);
const logoBottom = (corner) => (corner.startsWith("bottom") ? LOGO_BOTTOM + LOGO_H + 12 : PAGE.padBottom);

function PdfLogo({ width = LOGO_W }) {
  return (
    <Svg viewBox={LOGO_VIEWBOX} style={{ width, height: (width * 7064) / 17050 }}>
      <G transform="translate(-6337 -3010)">
        <Path d={MARK_PATH} fill={C.clay} fillRule="evenodd" />
      </G>
      <G transform="translate(8450 1032) scale(0.96173) translate(-5676 -10735)">
        <Rect x="5736.25" y="10795.01" width="8822.95" height="5079.1" rx="802.15" fill={C.cream} />
        <Path d={PLATE_PATH} fill={C.leaf} fillRule="evenodd" />
      </G>
    </Svg>
  );
}

/** «0.33» → «0,33 л», «100/20» → «100/20 г», «1 шт» — как есть. */
export function formatWeight(w) {
  const s = String(w || "").trim();
  if (!s) return "";
  if (/^\d+[.,]\d+$/.test(s) && parseFloat(s.replace(",", ".")) < 5) return `${s.replace(".", ",")} л`;
  if (/^[\d/]+$/.test(s)) return `${s} г`;
  return s;
}

const formatPrice = (p) => (String(p || "").trim() ? `${p} ₽` : "");

/** Подряд идущие одноимённые блюда (порции 250/150) склеиваются в одну строку. */
export function mergePortions(items) {
  const out = [];
  for (const it of items) {
    const prev = out.at(-1);
    if (prev && prev.name.trim().toLowerCase() === it.name.trim().toLowerCase() && !it.desc) {
      prev.weights.push(it.weight);
      prev.prices.push(it.price);
    } else {
      out.push({ ...it, weights: [it.weight], prices: [it.price] });
    }
  }
  return out.map((it) => {
    const weights = it.weights.filter(Boolean);
    const prices = it.prices.filter(Boolean);
    const unit = formatWeight(weights[0]).replace(/^[\d/.,]+\s*/, "");
    return {
      ...it,
      weightLabel:
        weights.length > 1 && unit && weights.every((w) => formatWeight(w).endsWith(unit))
          ? `${weights.join(" / ")} ${unit}`
          : weights.map(formatWeight).join(" / "),
      priceLabel: prices.length ? `${prices.join(" / ")} ₽` : "",
    };
  });
}

function prepareItems(items, settings) {
  const visible = items.filter((i) => i.name.trim());
  if (settings.mergePortions !== false) return mergePortions(visible);
  return visible.map((i) => ({ ...i, weightLabel: formatWeight(i.weight), priceLabel: formatPrice(i.price) }));
}

/** Делим разделы на две колонки так, чтобы высоты были примерно равны. */
function splitColumns(sections, fs, colWidth) {
  const charsPerLine = colWidth / (fs * 0.52);
  const h = (s) =>
    fs * 2.6 +
    s.items.reduce(
      (acc, i) =>
        acc +
        fs * 1.75 * Math.ceil((i.name.length + 14) / charsPerLine) +
        (i.desc ? fs * 1.3 * Math.ceil(i.desc.length / (charsPerLine * 1.2)) : 0),
      0,
    );
  const heights = sections.map(h);
  const total = heights.reduce((a, b) => a + b, 0);
  let best = sections.length;
  let bestDiff = Infinity;
  let acc = 0;
  for (let i = 0; i <= sections.length; i++) {
    const diff = Math.abs(total - 2 * acc);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
    acc += heights[i] ?? 0;
  }
  return [sections.slice(0, best), sections.slice(best)];
}

function makeStyles(settings) {
  const k = Number(settings.scale) || 1;
  const fs = 9.5 * k;
  return {
    fs,
    s: StyleSheet.create({
      page: {
        backgroundColor: settings.cream ? C.cream : C.shell,
        paddingTop: PAGE.padTop,
        paddingBottom: PAGE.padBottom,
        paddingHorizontal: PAGE.padX,
        fontFamily: "Manrope",
        fontSize: fs,
        color: C.ink,
      },
      eyebrow: {
        fontSize: 7.5 * k,
        fontWeight: 600,
        letterSpacing: 1.6,
        textTransform: "uppercase",
        color: C.mocha,
      },
      title: { fontFamily: "Playfair", fontWeight: 600, fontSize: 30 * k, letterSpacing: -0.6, marginTop: 6 },
      subtitle: { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 500, fontSize: 14 * k, color: C.clay, marginTop: 2 },
      bar: { width: 38, height: 3, borderRadius: 2, marginTop: 10 },
      note: {
        alignSelf: "flex-start",
        marginTop: 12,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: C.sand,
        color: C.clayDeep,
        fontWeight: 600,
        fontSize: 8.5 * k,
      },
      section: { marginTop: 16 * k },
      sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 6 * k },
      sectionTitle: { fontFamily: "Playfair", fontStyle: "italic", fontWeight: 600, fontSize: 13.5 * k, color: C.clay },
      sectionRule: { flexGrow: 1, height: 0.8, backgroundColor: C.line, marginLeft: 10 },
      row: { flexDirection: "row", alignItems: "flex-end", paddingVertical: 2.6 * k },
      nameWrap: { flexShrink: 1, maxWidth: "74%" },
      name: { fontSize: fs, lineHeight: 1.3 },
      desc: { fontSize: 7.2 * k, color: C.mocha, lineHeight: 1.3, marginTop: 1 },
      leader: {
        flexGrow: 1,
        minWidth: 12,
        borderBottomWidth: 0.8,
        borderBottomColor: C.line,
        borderBottomStyle: "dotted",
        marginHorizontal: 5,
        marginBottom: 3,
      },
      weight: { fontSize: 7.8 * k, color: C.mocha, marginBottom: 0.6 },
      price: { fontWeight: 600, fontSize: fs, marginLeft: 7, textAlign: "right" },
      footer: {
        position: "absolute",
        left: PAGE.padX,
        right: PAGE.padX,
        bottom: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopWidth: 0.8,
        borderTopColor: C.line,
        paddingTop: 8,
        fontSize: 7.5,
        color: C.mocha,
      },
    }),
  };
}

function logoPosition(corner) {
  const pos = { position: "absolute" };
  const top = corner.startsWith("top");
  const right = corner.endsWith("right");
  pos[top ? "top" : "bottom"] = top ? LOGO_TOP : LOGO_BOTTOM;
  pos[right ? "right" : "left"] = PAGE.padX - 4;
  return pos;
}

function Item({ it, settings, s }) {
  const weight = settings.showWeight ? it.weightLabel : "";
  const price = settings.showPrice ? it.priceLabel : "";
  return (
    <View style={s.row} wrap={false}>
      <View style={s.nameWrap}>
        <Text style={s.name}>{it.name}</Text>
        {it.desc ? <Text style={s.desc}>{it.desc}</Text> : null}
      </View>
      {weight || price ? <View style={s.leader} /> : null}
      {weight ? <Text style={s.weight}>{weight}</Text> : null}
      {price ? <Text style={s.price}>{price}</Text> : null}
    </View>
  );
}

function Section({ section, settings, s }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead} minPresenceAhead={40} wrap={false}>
        {section.title ? <Text style={s.sectionTitle}>{section.title}</Text> : null}
        <View style={[s.sectionRule, section.title ? null : { marginLeft: 0 }]} />
      </View>
      {section.items.map((it) => (
        <Item key={it.id} it={it} settings={settings} s={s} />
      ))}
    </View>
  );
}

function BlockPage({ block, doc, settings, styles }) {
  const { s, fs } = styles;
  const corner = settings.logoCorner || "top-right";
  const sections = block.sections
    .map((sec) => ({ ...sec, items: prepareItems(sec.items, settings) }))
    .filter((sec) => sec.items.length);

  const twoCols = Number(settings.columns) === 2 && sections.length > 1;
  const gap = 26;
  const colWidth = (PAGE.w - PAGE.padX * 2 - gap) / 2;
  const cols = twoCols ? splitColumns(sections, fs, colWidth) : [sections];
  const headerPad = corner === "top-right" ? { paddingRight: LOGO_W + 16 } : corner === "top-left" ? { paddingLeft: LOGO_W + 16 } : null;
  const notes = (block.note || "").split("\n").map((n) => n.trim()).filter(Boolean);

  return (
    <Page size="A4" style={[s.page, { paddingTop: logoTop(corner), paddingBottom: logoBottom(corner) }]}>
      <View fixed style={logoPosition(corner)}>
        <PdfLogo />
      </View>

      {/* На первой странице заголовок поднимается на уровень логотипа. */}
      <View style={[headerPad, corner.startsWith("top") ? { marginTop: PAGE.padTop - logoTop(corner) } : null]}>
        {doc.title ? <Text style={s.eyebrow}>{doc.title}</Text> : null}
        <Text style={s.title}>{block.title}</Text>
        {block.subtitle ? <Text style={s.subtitle}>{block.subtitle}</Text> : null}
        <View style={[s.bar, { backgroundColor: block.accent || C.clay }]} />
        {notes.map((n, i) => (
          <Text key={i} style={s.note}>
            {n}
          </Text>
        ))}
      </View>

      {twoCols ? (
        <View style={{ flexDirection: "row", marginTop: 2 }}>
          {cols.map((col, i) => (
            <View key={i} style={{ width: colWidth, marginLeft: i ? gap : 0 }}>
              {col.map((sec) => (
                <Section key={sec.id} section={sec} settings={settings} s={s} />
              ))}
            </View>
          ))}
        </View>
      ) : (
        sections.map((sec) => <Section key={sec.id} section={sec} settings={settings} s={s} />)
      )}

      <View fixed style={s.footer}>
        <Text>{settings.footer || ""}</Text>
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  );
}

export default function MenuPdf({ doc }) {
  const settings = doc.settings;
  const styles = makeStyles(settings);
  const blocks = doc.blocks.filter((b) => b.enabled && b.sections.some((s) => s.items.some((i) => i.name.trim())));
  return (
    <Document title={doc.title} author="MAIN MENU" creator="MAIN MENU" producer="MAIN MENU">
      {blocks.map((b) => (
        <BlockPage key={b.id} block={b} doc={doc} settings={settings} styles={styles} />
      ))}
    </Document>
  );
}
