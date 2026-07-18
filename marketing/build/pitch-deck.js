const pptxgen = require("pptxgenjs");
const { C, FONT_HEAD, FONT_BODY, FA, loadIcons, softShadow, stackMark, wordmark } = require("./lib");

(async () => {
  const I = await loadIcons({
    truck: [FA.FaTruck, C.amber],
    invoice: [FA.FaFileInvoiceDollar, C.amber],
    stack: [FA.FaLayerGroup, C.amber],
    chart: [FA.FaChartLine, C.amber],
    users: [FA.FaUsers, C.amber],
    check: [FA.FaCheckCircle, C.success],
    robot: [FA.FaRobot, C.amber],
    seed: [FA.FaSeedling, C.amber],
    shield: [FA.FaShieldAlt, C.amber],
    bolt: [FA.FaBolt, C.amber],
    tag: [FA.FaTag, C.amber],
    hand: [FA.FaHandshake, C.amber],
    flag: [FA.FaFlagCheckered, C.amber],
    warn: [FA.FaExclamationTriangle, C.amber],
    cream_check: [FA.FaCheckCircle, C.amberLight],
  });

  const p = new pptxgen();
  p.layout = "LAYOUT_16x9";
  p.author = "HayFlow";
  p.title = "HayFlow — Pitch";
  const W = 10, H = 5.625;

  const footer = (s, n, onDark = false) => {
    s.addText([{ text: "Hay", options: { bold: true, color: onDark ? C.cream : C.pine } }, { text: "Flow", options: { bold: true, color: onDark ? C.amberLight : C.amber } }],
      { x: 0.5, y: H - 0.42, w: 2, h: 0.3, fontSize: 10, fontFace: FONT_HEAD, margin: 0, valign: "middle" });
    s.addText(`${n}`, { x: W - 0.9, y: H - 0.42, w: 0.4, h: 0.3, fontSize: 10, color: onDark ? C.dimOnDark : C.dim, fontFace: FONT_BODY, align: "right", valign: "middle" });
  };
  const eyebrow = (s, txt, color = C.amber) =>
    s.addText(txt.toUpperCase(), { x: 0.6, y: 0.55, w: 8, h: 0.3, fontSize: 12, bold: true, color, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  const title = (s, txt, color = C.pine) =>
    s.addText(txt, { x: 0.6, y: 0.92, w: 8.8, h: 0.95, fontSize: 32, bold: true, color, fontFace: FONT_HEAD, margin: 0 });

  // ---------- 1. Cover ----------
  let s = p.addSlide(); s.background = { color: C.pineDeep };
  stackMark(s, 0.62, 0.7, 0.6, C.amberLight);
  wordmark(s, 0.55, 1.95, 78, C.cream, C.amberLight);
  s.addText("The operating system for hay growers and dealers.",
    { x: 0.6, y: 3.25, w: 9, h: 0.6, fontSize: 24, italic: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Inventory, driver tickets, and invoicing in one purpose-built tool.",
    { x: 0.62, y: 4.0, w: 8.7, h: 0.5, fontSize: 15, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  s.addText("Pitch deck", { x: 0.62, y: 4.85, w: 5, h: 0.3, fontSize: 12, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 2, margin: 0 });

  // ---------- 2. Problem ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Problem");
  title(s, "A multi-million-bale business runs on paper");
  s.addText("Hay growers and dealers move serious volume — but the operations layer is a whiteboard, a glovebox full of paper tickets, and a spreadsheet that never quite ties out.",
    { x: 0.6, y: 1.95, w: 8.7, h: 0.85, fontSize: 14.5, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  const pains = [
    [I.stack, "Counts drift", "Nobody trusts the inventory number by week's end."],
    [I.truck, "The field-to-office hand-off leaks", "Paper load tickets get lost, misread, or never make it back."],
    [I.invoice, "Getting paid is slow & messy", "Invoices are clumsy PDFs; reconciling loads to bills is manual."],
  ];
  pains.forEach((pn, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("rect", { x, y: 3.0, w: 2.75, h: 1.95, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addImage({ data: pn[0], x: x + 0.28, y: 3.25, w: 0.42, h: 0.42 });
    s.addText(pn[1], { x: x + 0.28, y: 3.78, w: 2.25, h: 0.55, fontSize: 14, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(pn[2], { x: x + 0.28, y: 4.34, w: 2.3, h: 0.55, fontSize: 11, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 2);

  // ---------- 3. Solution ----------
  s = p.addSlide(); s.background = { color: C.pine };
  s.addText("SOLUTION", { x: 0.6, y: 0.7, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  s.addText("One clean flow from the barn to the bank",
    { x: 0.6, y: 1.1, w: 8.8, h: 0.9, fontSize: 31, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Drivers file tickets on their phone. The office approves with one tap. Approved tickets bundle into a clean, shareable invoice — and inventory updates itself the whole way.",
    { x: 0.62, y: 2.05, w: 8.7, h: 0.85, fontSize: 14.5, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  const steps = ["Hay in the barn", "Driver files ticket", "Office approves", "Invoice + share link", "Paid"];
  const sw = 1.62, sgap = 0.21, sx0 = 0.6, sy = 3.35;
  steps.forEach((t, i) => {
    const x = sx0 + i * (sw + sgap);
    s.addShape("roundRect", { x, y: sy, w: sw, h: 1.0, fill: { color: C.pineDeep }, line: { color: C.pineSoft, width: 1 }, rectRadius: 0.1 });
    s.addText(`${i + 1}`, { x: x + 0.12, y: sy + 0.12, w: 0.5, h: 0.4, fontSize: 20, bold: true, color: C.amberLight, fontFace: FONT_HEAD, margin: 0 });
    s.addText(t, { x: x + 0.12, y: sy + 0.48, w: sw - 0.24, h: 0.45, fontSize: 11, bold: true, color: C.cream, fontFace: FONT_BODY, margin: 0 });
    if (i < steps.length - 1)
      s.addText(">", { x: x + sw + 0.02, y: sy + 0.28, w: 0.18, h: 0.4, fontSize: 18, bold: true, color: C.amberLight, fontFace: FONT_BODY, align: "center", margin: 0 });
  });
  s.addText("No double entry. No paper. No PDF acrobatics.",
    { x: 0.6, y: 4.65, w: 9, h: 0.3, fontSize: 13, italic: true, color: C.amberLight, fontFace: FONT_HEAD, margin: 0 });
  footer(s, 3, true);

  // ---------- 4. Why now / why us ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Why HayFlow wins");
  title(s, "Built for hay — not bent to fit it");
  const edges = [
    [I.seed, "Domain-native", "Speaks bales, tons, cuttings, barns, and quality — not generic SKUs and units."],
    [I.users, "Role-shaped UX", "Drivers, bookkeepers, and owners each see exactly their slice — nothing more."],
    [I.tag, "Field-first design", "Phone-first for drivers; warm, modern, and trusted by people who work with their hands."],
    [I.robot, "AI built in", "An assistant that knows the product and the user's role, with human escalation."],
  ];
  edges.forEach((e, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.25, y: y + 0.32, w: 0.6, h: 0.6, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: e[0], x: x + 0.37, y: y + 0.44, w: 0.36, h: 0.36 });
    s.addText(e[1], { x: x + 1.0, y: y + 0.2, w: 3.1, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(e[2], { x: x + 1.0, y: y + 0.56, w: 3.15, h: 0.62, fontSize: 10.5, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 4);

  // ---------- 5. Market ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Market");
  title(s, "Every hay operation needs this layer");
  s.addText("Hay and forage is one of the largest U.S. field crops by acreage, run by tens of thousands of growers, dealers, and brokers — almost all of them still on paper and spreadsheets.",
    { x: 0.6, y: 1.95, w: 8.7, h: 0.85, fontSize: 14, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  const mkt = [
    ["TAM", "[ Add #s ]", "U.S. hay growers, dealers & brokers"],
    ["Wedge", "Dealers", "High volume, most ticket/invoice pain"],
    ["Expansion", "Adjacent", "Straw, feed, other baled commodities"],
  ];
  mkt.forEach((m, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("rect", { x, y: 3.0, w: 2.75, h: 1.9, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
    s.addText(m[0].toUpperCase(), { x: x + 0.28, y: 3.22, w: 2.2, h: 0.3, fontSize: 11, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 2, margin: 0 });
    s.addText(m[1], { x: x + 0.26, y: 3.55, w: 2.3, h: 0.6, fontSize: 26, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
    s.addText(m[2], { x: x + 0.28, y: 4.2, w: 2.3, h: 0.6, fontSize: 11, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  });
  s.addText("Note: replace TAM/SAM with sourced figures before external use.",
    { x: 0.6, y: 5.05, w: 8.8, h: 0.3, fontSize: 10, italic: true, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  footer(s, 5);

  // ---------- 6. Product status / what's built ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Status");
  title(s, "The product is built and live");
  s.addShape("rect", { x: 0.6, y: 2.0, w: 5.45, h: 3.0, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
  s.addText("Shipping today", { x: 0.85, y: 2.18, w: 5, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
  const built = [
    "Inventory ledger, stacks & locations",
    "Driver tickets + office approval flow",
    "Multi-line Quick Sale & invoicing",
    "Public shareable invoice links",
    "Dashboard, reports & analytics",
    "Onboarding tours + AI help assistant",
    "Roles, billing & multi-tenancy wired",
  ];
  built.forEach((b, i) => {
    const y = 2.6 + i * 0.33;
    s.addImage({ data: I.check, x: 0.88, y: y + 0.02, w: 0.22, h: 0.22 });
    s.addText(b, { x: 1.2, y, w: 4.75, h: 0.3, fontSize: 12, color: C.ink, fontFace: FONT_BODY, margin: 0, valign: "middle" });
  });
  s.addShape("rect", { x: 6.25, y: 2.0, w: 3.15, h: 3.0, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
  s.addImage({ data: I.warn, x: 6.5, y: 2.2, w: 0.4, h: 0.4 });
  s.addText("One step to revenue", { x: 7.0, y: 2.22, w: 2.3, h: 0.4, fontSize: 14, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0, valign: "middle" });
  s.addText("Subscription gating, trial logic, and Stripe-via-Clerk plans are all coded.",
    { x: 6.5, y: 2.85, w: 2.7, h: 0.8, fontSize: 11.5, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  s.addText("Remaining: finish the Clerk Billing + Stripe dashboard config to switch on live charging.",
    { x: 6.5, y: 3.65, w: 2.7, h: 1.0, fontSize: 11.5, color: C.cream, fontFace: FONT_BODY, margin: 0 });
  footer(s, 6);

  // ---------- 7. Business model ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Business model");
  title(s, "Recurring SaaS, priced per business");
  // Pro
  s.addShape("rect", { x: 0.6, y: 2.05, w: 4.1, h: 2.6, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
  s.addText("Pro", { x: 0.9, y: 2.25, w: 3.5, h: 0.35, fontSize: 18, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
  s.addText([{ text: "$25", options: { fontSize: 36, bold: true, color: C.amber } }, { text: " /mo", options: { fontSize: 15, color: C.dim } }],
    { x: 0.9, y: 2.65, w: 3.5, h: 0.65, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Up to 2 users · full product", { x: 0.92, y: 3.4, w: 3.6, h: 0.3, fontSize: 12, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  s.addText("Solo growers & small operations", { x: 0.92, y: 3.75, w: 3.6, h: 0.5, fontSize: 11, italic: true, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  // Team
  s.addShape("rect", { x: 5.0, y: 2.05, w: 4.1, h: 2.6, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
  s.addText("Team", { x: 5.3, y: 2.25, w: 3.5, h: 0.35, fontSize: 18, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText([{ text: "$100", options: { fontSize: 36, bold: true, color: C.amberLight } }, { text: " /mo", options: { fontSize: 15, color: C.dimOnDark } }],
    { x: 5.3, y: 2.65, w: 3.5, h: 0.65, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Unlimited users · whole crew", { x: 5.32, y: 3.4, w: 3.6, h: 0.3, fontSize: 12, color: C.cream, fontFace: FONT_BODY, margin: 0 });
  s.addText("Dealers & multi-driver operations", { x: 5.32, y: 3.75, w: 3.6, h: 0.5, fontSize: 11, italic: true, color: C.amberLight, fontFace: FONT_BODY, margin: 0 });
  s.addText("14-day trial converts to paid · land solo, expand to Team as the crew grows.",
    { x: 0.6, y: 4.8, w: 8.8, h: 0.3, fontSize: 12, italic: true, color: C.dim, fontFace: FONT_BODY, align: "center", margin: 0 });
  footer(s, 7);

  // ---------- 8. Go-to-market ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Go-to-market");
  title(s, "Low-touch, trial-led, autonomous");
  const gtm = [
    [I.bolt, "Self-serve signup", "Org creation → guided checklist → first sale, with no sales call."],
    [I.robot, "AI does the hand-holding", "In-app tours and assistant reduce support load to near zero."],
    [I.hand, "Land and expand", "Start a grower on Pro; grow into Team as they add drivers."],
    [I.chart, "Channels", "Ag forums, dealer networks, word-of-mouth, content. [Refine in plan]"],
  ];
  gtm.forEach((g, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.25, y: y + 0.32, w: 0.6, h: 0.6, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: g[0], x: x + 0.37, y: y + 0.44, w: 0.36, h: 0.36 });
    s.addText(g[1], { x: x + 1.0, y: y + 0.2, w: 3.1, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(g[2], { x: x + 1.0, y: y + 0.56, w: 3.15, h: 0.62, fontSize: 10.5, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 8);

  // ---------- 9. Roadmap ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Roadmap");
  title(s, "From launch to category leader");
  const phases = [
    ["Now", "Launch", "Switch on billing, onboard first paying growers & dealers."],
    ["Next", "Deepen", "Payments capture, email automation, mobile polish, deeper reports."],
    ["Later", "Expand", "Adjacent commodities, integrations, broker & marketplace features."],
  ];
  phases.forEach((ph, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("rect", { x, y: 2.1, w: 2.75, h: 2.7, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("rect", { x, y: 2.1, w: 2.75, h: 0.62, fill: { color: i === 0 ? C.amber : C.pine }, line: { type: "none" } });
    s.addText(ph[0].toUpperCase(), { x: x + 0.25, y: 2.24, w: 2.3, h: 0.35, fontSize: 13, bold: true, color: C.cream, fontFace: FONT_BODY, charSpacing: 2, margin: 0, valign: "middle" });
    s.addText(ph[1], { x: x + 0.25, y: 2.92, w: 2.3, h: 0.45, fontSize: 18, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(ph[2], { x: x + 0.25, y: 3.5, w: 2.32, h: 1.2, fontSize: 11.5, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 9);

  // ---------- 10. The ask / close ----------
  s = p.addSlide(); s.background = { color: C.pineDeep };
  stackMark(s, 0.62, 0.7, 0.5, C.amberLight);
  wordmark(s, 0.55, 1.7, 56, C.cream, C.amberLight);
  s.addText("Built. Live. Ready to switch on revenue.",
    { x: 0.6, y: 2.55, w: 9, h: 0.55, fontSize: 22, italic: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText([
    { text: "The ask:  ", options: { bold: true, color: C.amberLight } },
    { text: "[ funding / pilots / partnerships — fill in ] to finish billing, launch, and own the hay ops category.", options: { color: C.dimOnDark } },
  ], { x: 0.62, y: 3.45, w: 8.7, h: 0.8, fontSize: 15, fontFace: FONT_BODY, margin: 0 });
  s.addText("Designed for the field.  Engineered for the books.",
    { x: 0.62, y: 4.55, w: 9, h: 0.3, fontSize: 13, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 1, margin: 0 });
  s.addText("tommercourtright@gmail.com", { x: 0.62, y: 5.0, w: 6, h: 0.3, fontSize: 12, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });

  await p.writeFile({ fileName: "HayFlow-Pitch-Deck.pptx" });
  console.log("wrote HayFlow-Pitch-Deck.pptx");
})();
