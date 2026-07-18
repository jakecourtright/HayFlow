// Shared brand library for HayFlow decks — grounded in docs/design-identity.md "Harvest" theme.
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");
const FA = require("react-icons/fa");

// ---- Palette (Harvest theme) ----
const C = {
  pineDeep: "0F1A14",   // dark background (Pine)
  pine: "1F3A2E",       // accent / headings on light
  pineSoft: "2C4A3B",
  amber: "B45309",      // primary (amber 700)
  amberLight: "D97706", // amber 600
  amberPale: "F3E2CE",  // soft amber tint for fills on light
  cream: "F7F2E7",      // page background
  white: "FFFFFF",
  ink: "1C1917",        // body text (stone 900)
  dim: "78716C",        // secondary text (stone 500)
  dimOnDark: "B8C4BC",  // muted text on pine
  hair: "E4DDCB",       // hairline on cream
  success: "16803C",
  error: "B91C1C",
};

const FONT_HEAD = "Georgia";   // warm serif — stands in for Fraunces
const FONT_BODY = "Calibri";   // clean sans — stands in for Geist

// ---- Icon rendering ----
function svg(IconComponent, color, size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}
async function png(IconComponent, color) {
  const buf = await sharp(Buffer.from(svg(IconComponent, color.startsWith("#") ? color : "#" + color, 256))).png().toBuffer();
  return "image/png;base64," + buf.toString("base64");
}

// Pre-render a named set of icons -> { name: base64 }
async function loadIcons(spec) {
  const out = {};
  for (const [key, [comp, color]] of Object.entries(spec)) {
    out[key] = await png(comp, color);
  }
  return out;
}

// ---- Shadow factory (never share objects across calls) ----
const softShadow = () => ({ type: "outer", color: "1C1917", blur: 9, offset: 3, angle: 135, opacity: 0.12 });

// ---- The HayFlow "stack" mark: three tapering bars ----
function stackMark(slide, x, y, unit, color) {
  // unit = width scale; draws 3 horizontal rounded bars tapering upward
  const widths = [unit, unit * 0.78, unit * 0.56];
  const h = unit * 0.16;
  const gap = unit * 0.1;
  widths.forEach((w, i) => {
    slide.addShape("roundRect", {
      x: x + (unit - w) / 2, y: y + i * (h + gap), w, h,
      fill: { color }, line: { type: "none" }, rectRadius: h / 2,
    });
  });
}

// ---- Wordmark: "Hay" (pine) + "Flow" (amber) ----
function wordmark(slide, x, y, fontSize, hayColor, flowColor) {
  slide.addText(
    [
      { text: "Hay", options: { color: hayColor, bold: true } },
      { text: "Flow", options: { color: flowColor, bold: true } },
    ],
    { x, y, w: 6, h: fontSize / 50, fontSize, fontFace: FONT_HEAD, align: "left", margin: 0 }
  );
}

module.exports = { C, FONT_HEAD, FONT_BODY, FA, loadIcons, softShadow, stackMark, wordmark };
