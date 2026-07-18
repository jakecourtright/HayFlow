const pptxgen = require("pptxgenjs");
const { C, FONT_HEAD, FONT_BODY, FA, loadIcons, softShadow, stackMark, wordmark } = require("./lib");

(async () => {
  const I = await loadIcons({
    warehouse: [FA.FaWarehouse, C.amber],
    stack: [FA.FaLayerGroup, C.amber],
    ledger: [FA.FaClipboardList, C.amber],
    ticket: [FA.FaTruck, C.amber],
    invoice: [FA.FaFileInvoiceDollar, C.amber],
    chart: [FA.FaChartLine, C.amber],
    users: [FA.FaUsers, C.amber],
    check: [FA.FaCheckCircle, C.success],
    robot: [FA.FaRobot, C.amber],
    compass: [FA.FaCompass, C.amber],
    shield: [FA.FaShieldAlt, C.amber],
    mobile: [FA.FaMobileAlt, C.amber],
    tag: [FA.FaTag, C.amber],
    palette: [FA.FaPenFancy, C.amber],
    server: [FA.FaServer, C.amber],
    bolt: [FA.FaBolt, C.amber],
    arrow: [FA.FaArrowRight, C.pine],
    arrowAmber: [FA.FaArrowRight, C.amber],
    admin: [FA.FaUserShield, C.cream],
    book: [FA.FaUserTie, C.cream],
    driver: [FA.FaTruck, C.cream],
    seedling: [FA.FaSeedling, C.amber],
    receipt: [FA.FaReceipt, C.amber],
    lock: [FA.FaLock, C.amber],
  });
  // dark-bg variants
  const ID = await loadIcons({
    warehouseD: [FA.FaWarehouse, C.amberLight],
    stackD: [FA.FaLayerGroup, C.amberLight],
    ledgerD: [FA.FaClipboardList, C.amberLight],
    ticketD: [FA.FaTruck, C.amberLight],
    invoiceD: [FA.FaFileInvoiceDollar, C.amberLight],
  });

  const p = new pptxgen();
  p.layout = "LAYOUT_16x9";
  p.author = "HayFlow";
  p.title = "HayFlow — Product Overview";
  const W = 10, H = 5.625;

  // ---------- helpers ----------
  const footer = (s, n, onDark = false) => {
    s.addText([{ text: "Hay", options: { bold: true, color: onDark ? C.cream : C.pine } }, { text: "Flow", options: { bold: true, color: onDark ? C.amberLight : C.amber } }],
      { x: 0.5, y: H - 0.42, w: 2, h: 0.3, fontSize: 10, fontFace: FONT_HEAD, margin: 0, valign: "middle" });
    s.addText(`${n}`, { x: W - 0.9, y: H - 0.42, w: 0.4, h: 0.3, fontSize: 10, color: onDark ? C.dimOnDark : C.dim, fontFace: FONT_BODY, align: "right", valign: "middle" });
  };
  const eyebrow = (s, txt, color = C.amber) =>
    s.addText(txt.toUpperCase(), { x: 0.6, y: 0.55, w: 8, h: 0.3, fontSize: 12, bold: true, color, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  const title = (s, txt, color = C.pine) =>
    s.addText(txt, { x: 0.6, y: 0.92, w: 8.8, h: 0.95, fontSize: 33, bold: true, color, fontFace: FONT_HEAD, margin: 0 });

  // ---------- Slide 1: Cover ----------
  let s = p.addSlide();
  s.background = { color: C.pineDeep };
  stackMark(s, 0.62, 0.6, 0.62, C.amberLight);
  s.addText("INVENTORY & INVOICING FOR HAY GROWERS & DEALERS",
    { x: 0.6, y: 1.55, w: 9, h: 0.3, fontSize: 13, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  wordmark(s, 0.55, 1.95, 80, C.cream, C.amberLight);
  s.addText("Hay inventory, made well.",
    { x: 0.6, y: 3.35, w: 9, h: 0.6, fontSize: 26, italic: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Track bales from the barn. Approve driver tickets. Send clean invoices customers can actually read.",
    { x: 0.62, y: 4.05, w: 8.6, h: 0.6, fontSize: 15, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  s.addText("Designed for the field.  Engineered for the books.",
    { x: 0.62, y: 4.95, w: 9, h: 0.3, fontSize: 13, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 1, margin: 0 });

  // ---------- Slide 2: The problem ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "The problem");
  title(s, "Hay businesses run on whiteboards and scribbled tickets");
  const probs = [
    ["Inventory drifts", "Bale counts live on a whiteboard or in someone's head. Nobody trusts the number by Friday."],
    ["The field-to-office hand-off is lossy", "Drivers scribble paper load tickets. Half get lost; the rest are hard to read."],
    ["Invoicing is painful", "Bills are clumsy PDFs and email attachments customers struggle to open and understand."],
    ["Generic software doesn't fit", "ERP and spreadsheets don't speak hay — bales, tons, cuttings, barns, quality."],
  ];
  probs.forEach((pr, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("rect", { x, y, w: 0.09, h: 1.25, fill: { color: C.amber }, line: { type: "none" } });
    s.addText(pr[0], { x: x + 0.28, y: y + 0.14, w: 3.9, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(pr[1], { x: x + 0.28, y: y + 0.52, w: 3.85, h: 0.64, fontSize: 11.5, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 2);

  // ---------- Slide 3: The solution ----------
  s = p.addSlide(); s.background = { color: C.pine };
  s.addText("THE SOLUTION", { x: 0.6, y: 0.7, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  s.addText("One clean flow from the barn to the bank",
    { x: 0.6, y: 1.1, w: 8.8, h: 0.9, fontSize: 32, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("HayFlow is the tool your hay business has been missing — purpose-built for how forage actually moves and gets paid for.",
    { x: 0.62, y: 2.05, w: 8.7, h: 0.6, fontSize: 14, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  const pillars = [
    [ID.warehouseD, "Track every bale", "Production, purchases, sales, transfers — stock updates as work happens."],
    [ID.ticketD, "Tickets, approved fast", "Drivers file on their phone. Office approves with one tap."],
    [ID.invoiceD, "Invoices that look professional", "Bundle approved tickets into a clean, shareable link."],
  ];
  pillars.forEach((pl, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("roundRect", { x, y: 2.95, w: 2.75, h: 2.15, fill: { color: C.pineDeep }, line: { color: C.pineSoft, width: 1 }, rectRadius: 0.12 });
    s.addShape("oval", { x: x + 0.28, y: 3.2, w: 0.66, h: 0.66, fill: { color: "16271E" }, line: { type: "none" } });
    s.addImage({ data: pl[0], x: x + 0.41, y: 3.33, w: 0.4, h: 0.4 });
    s.addText(pl[1], { x: x + 0.28, y: 4.0, w: 2.25, h: 0.6, fontSize: 15, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
    s.addText(pl[2], { x: x + 0.28, y: 4.55, w: 2.25, h: 0.5, fontSize: 10.5, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 3, true);

  // ---------- Slide 4: How it works (5 pieces) ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "How it works");
  title(s, "Five pieces. Once they click, the app makes sense.");
  const flow = [
    [I.warehouse, "Locations", "Barns & yards where hay is stored."],
    [I.stack, "Stacks", "A lot of hay: commodity, bale size, quality, price."],
    [I.ledger, "Transactions", "Every movement: baled, bought, sold, adjusted."],
    [I.ticket, "Tickets", "Filed when hay leaves a barn. Office approves."],
    [I.invoice, "Invoices", "Approved tickets, bundled & billed via share link."],
  ];
  const fw = 1.72, fgap = 0.13, fx0 = 0.55, fy = 2.4;
  flow.forEach((f, i) => {
    const x = fx0 + i * (fw + fgap);
    s.addShape("rect", { x, y: fy, w: fw, h: 2.0, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + fw / 2 - 0.33, y: fy + 0.22, w: 0.66, h: 0.66, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: f[0], x: x + fw / 2 - 0.2, y: fy + 0.35, w: 0.4, h: 0.4 });
    s.addText(f[1], { x: x + 0.1, y: fy + 1.0, w: fw - 0.2, h: 0.32, fontSize: 14, bold: true, color: C.pine, fontFace: FONT_HEAD, align: "center", margin: 0 });
    s.addText(f[2], { x: x + 0.12, y: fy + 1.34, w: fw - 0.24, h: 0.62, fontSize: 9.5, color: C.dim, fontFace: FONT_BODY, align: "center", margin: 0 });
    if (i < 4) s.addImage({ data: I.arrowAmber, x: x + fw + fgap / 2 - 0.085, y: fy + 0.92, w: 0.17, h: 0.17 });
  });
  s.addText("Canonical units: bales for amounts, $/ton for price — normalized automatically.",
    { x: 0.55, y: 4.75, w: 9, h: 0.3, fontSize: 11.5, italic: true, color: C.dim, fontFace: FONT_BODY, align: "center", margin: 0 });
  footer(s, 4);

  // ---------- Slide 5: Roles ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Built for the whole team");
  title(s, "Three roles. Everyone sees what they need — nothing they don't.");
  const roles = [
    [I.admin, "Admin", "The owner", ["Full access to everything", "Team management & billing", "All inventory, tickets, invoices"]],
    [I.book, "Bookkeeper", "The office", ["Approves driver tickets", "Builds & sends invoices", "Runs Quick Sale, edits inventory"]],
    [I.driver, "Driver", "The field", ["Files tickets from a phone", "Sees only their own loads", "No prices, invoices, or reports"]],
  ];
  roles.forEach((r, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("rect", { x, y: 2.05, w: 2.75, h: 2.95, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.3, y: 2.3, w: 0.7, h: 0.7, fill: { color: C.amber }, line: { type: "none" } });
    s.addImage({ data: r[0], x: x + 0.44, y: 2.44, w: 0.42, h: 0.42 });
    s.addText(r[1], { x: x + 0.3, y: 3.08, w: 2.2, h: 0.35, fontSize: 19, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
    s.addText(r[2].toUpperCase(), { x: x + 0.31, y: 3.45, w: 2.2, h: 0.25, fontSize: 10, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 2, margin: 0 });
    s.addText(r[3].map((t, j) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 5 } })),
      { x: x + 0.32, y: 3.78, w: 2.25, h: 1.1, fontSize: 10.5, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 5);

  // ---------- Slide 6: Field experience ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "In the field");
  title(s, "Drivers file a ticket whenever hay leaves a barn");
  // left: narrative; right: feature cards
  s.addImage({ data: I.mobile, x: 0.62, y: 2.1, w: 0.5, h: 0.5 });
  s.addText("Phone-first by design", { x: 1.25, y: 2.12, w: 4, h: 0.4, fontSize: 17, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0, valign: "middle" });
  s.addText("A driver's whole job is simple: record the load. Pick the stack, the amount, and where it went — a sale to a customer or a barn-to-barn transfer. The office takes it from there.",
    { x: 0.62, y: 2.75, w: 4.1, h: 1.4, fontSize: 13, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  s.addText('"Drivers file tickets; the office handles the money."',
    { x: 0.62, y: 4.2, w: 4.1, h: 0.6, fontSize: 13, italic: true, color: C.amber, fontFace: FONT_HEAD, margin: 0 });
  const fcards = [
    ["Two ticket types", "Sale to a customer, or a transfer between barns."],
    ["Pending → approved", "Every ticket waits for office sign-off before it counts."],
    ["Inventory moves on approval", "No double entry — stock adjusts automatically."],
  ];
  fcards.forEach((fc, i) => {
    const y = 2.05 + i * 1.0;
    s.addShape("rect", { x: 5.1, y, w: 4.3, h: 0.86, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addImage({ data: I.check, x: 5.32, y: y + 0.28, w: 0.3, h: 0.3 });
    s.addText(fc[0], { x: 5.75, y: y + 0.12, w: 3.5, h: 0.3, fontSize: 13.5, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(fc[1], { x: 5.75, y: y + 0.43, w: 3.5, h: 0.36, fontSize: 10.5, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 6);

  // ---------- Slide 7: Office / invoicing ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "In the office");
  title(s, "Approve, bundle, and bill — without the PDF acrobatics");
  const office = [
    [I.check, "Dispatch queue", "See what needs review and what's ready to invoice, at a glance."],
    [I.invoice, "Bundle into invoices", "Group approved tickets into one clean invoice, per customer."],
    [I.receipt, "Quick Sale", "Sell and invoice in one step — multi-line, with per-line pricing."],
    [I.lock, "Shareable link", "Customers open a print-friendly invoice — no login, no attachment."],
  ];
  office.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.25, y: y + 0.32, w: 0.6, h: 0.6, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: o[0], x: x + 0.37, y: y + 0.44, w: 0.36, h: 0.36 });
    s.addText(o[1], { x: x + 1.0, y: y + 0.2, w: 3.1, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(o[2], { x: x + 1.0, y: y + 0.56, w: 3.15, h: 0.6, fontSize: 11, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 7);

  // ---------- Slide 8: Inventory & reporting ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Inventory & insight");
  title(s, "The ledger is the single source of truth");
  s.addText("Every production, purchase, sale, and adjustment posts to one ledger. Stacks show live stock by barn; the dashboard and reports read straight from the same numbers — so the money you see is the money that's real.",
    { x: 0.6, y: 1.95, w: 5.0, h: 1.3, fontSize: 13, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  const stats = [
    [I.stack, "Stock by commodity & barn", "Live bale and ton counts, Empty / Low / OK status."],
    [I.chart, "Revenue & cost trends", "Monthly money over time, top buyers and sellers."],
    [I.warehouse, "Location utilization", "Capacity vs. actual stock per barn."],
  ];
  stats.forEach((st, i) => {
    const y = 3.35 + 0; const x = 0.6 + i * 0;
  });
  // right column: customizable dashboard callout
  s.addShape("rect", { x: 5.95, y: 1.95, w: 3.45, h: 2.95, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
  s.addImage({ data: ID ? I.chart : I.chart, x: 6.25, y: 2.2, w: 0.5, h: 0.5 });
  s.addText("Dashboard, your way", { x: 6.85, y: 2.22, w: 2.4, h: 0.45, fontSize: 16, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0, valign: "middle" });
  s.addText([
    { text: "Revenue this month", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Outstanding invoices", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Total stock on hand", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Stock by commodity", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Recent activity", options: { bullet: { indent: 12 } } },
  ], { x: 6.27, y: 2.9, w: 2.95, h: 1.6, fontSize: 12, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  s.addText("Drag to reorder. Hide what you don't use. Saved per user.",
    { x: 6.27, y: 4.5, w: 2.95, h: 0.35, fontSize: 9.5, italic: true, color: C.amberLight, fontFace: FONT_BODY, margin: 0 });
  // left lower: three small report rows
  stats.forEach((st, i) => {
    const y = 3.4 + i * 0.55;
    s.addImage({ data: st[0], x: 0.62, y: y + 0.02, w: 0.32, h: 0.32 });
    s.addText([{ text: st[1] + "  ", options: { bold: true, color: C.pine } }, { text: st[2], options: { color: C.dim } }],
      { x: 1.05, y, w: 4.6, h: 0.5, fontSize: 11, fontFace: FONT_BODY, margin: 0, valign: "middle" });
  });
  footer(s, 8);

  // ---------- Slide 9: Onboarding & AI help ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Self-serve from minute one");
  title(s, "Onboarding and an AI assistant built in");
  const onb = [
    [I.compass, "Guided setup checklist", "Profile → barn → stack → production → team → first sale. Auto-hides when done."],
    [I.seedling, "Role-aware tours", "A 7-step office tour and a 5-step driver tour start on first visit."],
    [I.robot, "Ask HayFlow (AI)", "Claude-powered help, grounded in the product, aware of your role."],
    [I.users, "Human escalation", "One tap to reach a real person when the assistant isn't enough."],
  ];
  onb.forEach((o, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.25, y: y + 0.32, w: 0.6, h: 0.6, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: o[0], x: x + 0.37, y: y + 0.44, w: 0.36, h: 0.36 });
    s.addText(o[1], { x: x + 1.0, y: y + 0.2, w: 3.1, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(o[2], { x: x + 1.0, y: y + 0.56, w: 3.15, h: 0.62, fontSize: 11, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 9);

  // ---------- Slide 10: Design identity ----------
  s = p.addSlide(); s.background = { color: C.pine };
  s.addText("DESIGNED FOR HAY", { x: 0.6, y: 0.7, w: 8, h: 0.3, fontSize: 12, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 3, margin: 0 });
  s.addText("Agricultural craft meets modern software",
    { x: 0.6, y: 1.1, w: 8.8, h: 0.9, fontSize: 30, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Built for people who work with their hands and know their land — and are tired of ag software that looks like it was built in 2004. Warm, sturdy, honest, and uncommonly well-made.",
    { x: 0.62, y: 2.05, w: 8.7, h: 0.8, fontSize: 14, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });
  const brand = [
    ["Voice", "Grounded, confident, warm. “Bales moved,” not “units transacted.”"],
    ["Type", "Fraunces serif for headings & numbers; Geist for clean UI."],
    ["Palette", "Harvest: warm cream, amber, deep pine. Plus dark & seasonal themes."],
  ];
  brand.forEach((b, i) => {
    const x = 0.6 + i * 3.0;
    s.addShape("roundRect", { x, y: 3.1, w: 2.75, h: 1.9, fill: { color: C.pineDeep }, line: { color: C.pineSoft, width: 1 }, rectRadius: 0.1 });
    s.addText(b[0].toUpperCase(), { x: x + 0.28, y: 3.32, w: 2.2, h: 0.3, fontSize: 12, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 2, margin: 0 });
    s.addText(b[1], { x: x + 0.28, y: 3.72, w: 2.25, h: 1.1, fontSize: 12.5, color: C.cream, fontFace: FONT_BODY, margin: 0 });
  });
  // swatches
  [C.cream, C.amber, C.amberLight, C.pine, C.pineDeep].forEach((col, i) => {
    s.addShape("oval", { x: 7.95 + (i % 5) * 0, y: 0.7, w: 0, h: 0 });
  });
  footer(s, 10, true);

  // ---------- Slide 11: Tech & scale ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Built to scale");
  title(s, "Modern stack, clean multi-tenancy");
  const tech = [
    [I.bolt, "Modern foundation", "Next.js 16, React 19, TypeScript. Deploys on Vercel."],
    [I.shield, "True multi-tenancy", "Every business is a Clerk Organization; every row scoped by org_id."],
    [I.server, "Postgres + serverless", "Neon Postgres, indexed per-tenant. Reads scale horizontally."],
    [I.lock, "Secure by design", "Public invoice links use unguessable 256-bit share tokens."],
  ];
  tech.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 4.55, y = 2.05 + row * 1.45;
    s.addShape("rect", { x, y, w: 4.3, h: 1.25, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
    s.addShape("oval", { x: x + 0.25, y: y + 0.32, w: 0.6, h: 0.6, fill: { color: C.amberPale }, line: { type: "none" } });
    s.addImage({ data: t[0], x: x + 0.37, y: y + 0.44, w: 0.36, h: 0.36 });
    s.addText(t[1], { x: x + 1.0, y: y + 0.2, w: 3.1, h: 0.35, fontSize: 15, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
    s.addText(t[2], { x: x + 1.0, y: y + 0.56, w: 3.15, h: 0.62, fontSize: 11, color: C.dim, fontFace: FONT_BODY, margin: 0 });
  });
  footer(s, 11);

  // ---------- Slide 12: Pricing ----------
  s = p.addSlide(); s.background = { color: C.cream };
  eyebrow(s, "Pricing");
  title(s, "Simple, per-business plans");
  // Pro
  s.addShape("rect", { x: 0.6, y: 2.05, w: 4.1, h: 2.95, fill: { color: C.white }, line: { color: C.hair, width: 1 }, shadow: softShadow() });
  s.addText("Pro", { x: 0.9, y: 2.3, w: 3.5, h: 0.4, fontSize: 20, bold: true, color: C.pine, fontFace: FONT_HEAD, margin: 0 });
  s.addText([{ text: "$25", options: { fontSize: 40, bold: true, color: C.amber } }, { text: " /mo", options: { fontSize: 16, color: C.dim } }],
    { x: 0.9, y: 2.75, w: 3.5, h: 0.7, fontFace: FONT_HEAD, margin: 0 });
  s.addText([
    { text: "Up to 2 users", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Full inventory & invoicing", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "All reports & AI help", options: { bullet: { indent: 12 } } },
  ], { x: 0.95, y: 3.6, w: 3.5, h: 1.2, fontSize: 12.5, color: C.ink, fontFace: FONT_BODY, margin: 0 });
  // Team (highlighted)
  s.addShape("rect", { x: 5.0, y: 2.05, w: 4.1, h: 2.95, fill: { color: C.pine }, line: { type: "none" }, shadow: softShadow() });
  s.addText("MOST TEAMS", { x: 5.3, y: 2.18, w: 3.5, h: 0.25, fontSize: 9.5, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 2, margin: 0 });
  s.addText("Team", { x: 5.3, y: 2.42, w: 3.5, h: 0.4, fontSize: 20, bold: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText([{ text: "$100", options: { fontSize: 40, bold: true, color: C.amberLight } }, { text: " /mo", options: { fontSize: 16, color: C.dimOnDark } }],
    { x: 5.3, y: 2.85, w: 3.5, h: 0.7, fontFace: FONT_HEAD, margin: 0 });
  s.addText([
    { text: "Unlimited users", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Everything in Pro", options: { bullet: { indent: 12 }, breakLine: true, paraSpaceAfter: 7 } },
    { text: "Whole field + office team", options: { bullet: { indent: 12 } } },
  ], { x: 5.35, y: 3.65, w: 3.5, h: 1.2, fontSize: 12.5, color: C.cream, fontFace: FONT_BODY, margin: 0 });
  s.addText("14-day free trial  ·  secure checkout powered by Stripe  ·  cancel anytime",
    { x: 0.6, y: 5.08, w: 8.8, h: 0.3, fontSize: 11.5, italic: true, color: C.dim, fontFace: FONT_BODY, align: "center", margin: 0 });
  footer(s, 12);

  // ---------- Slide 13: Closing ----------
  s = p.addSlide(); s.background = { color: C.pineDeep };
  stackMark(s, 0.62, 0.85, 0.55, C.amberLight);
  wordmark(s, 0.55, 2.0, 60, C.cream, C.amberLight);
  s.addText("The tool your hay business has been missing.",
    { x: 0.6, y: 3.0, w: 9, h: 0.6, fontSize: 22, italic: true, color: C.cream, fontFace: FONT_HEAD, margin: 0 });
  s.addText("Designed for the field.  Engineered for the books.",
    { x: 0.62, y: 3.75, w: 9, h: 0.3, fontSize: 14, bold: true, color: C.amberLight, fontFace: FONT_BODY, charSpacing: 1, margin: 0 });
  s.addText("Start free — 14 days, full team features.",
    { x: 0.62, y: 4.45, w: 9, h: 0.4, fontSize: 15, color: C.dimOnDark, fontFace: FONT_BODY, margin: 0 });

  await p.writeFile({ fileName: "HayFlow-Product-Overview.pptx" });
  console.log("wrote HayFlow-Product-Overview.pptx");
})();
