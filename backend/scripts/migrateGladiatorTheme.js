// one-time migration: re-theme the 3 cases and their 25 items to the gladiator
// aesthetic (new names + local images in /images/cases and /images/items).
// rarity and prices are never touched — only names and images.
//
// it also rewrites every stored copy of the item data so existing players see
// the new look: user inventories, users' fixed (showcase) item and marketplace
// listings. atomic per-field updates, safe on a live DB, idempotent.
//
// items are matched per case by a prefix of the old name (or the new name if
// already migrated). if any mapping doesn't resolve to exactly one item, the
// script refuses to --apply and lists what it found so it can be adjusted.
//
// usage (from backend/, after a mongodump backup):
//   node scripts/migrateGladiatorTheme.js          # dry run, reports what would change
//   node scripts/migrateGladiatorTheme.js --apply   # actually writes the changes
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Item = require("../models/Item");
const Case = require("../models/Case");
const Marketplace = require("../models/Marketplace");

const APPLY = process.argv.includes("--apply");
const img = (slug) => `/images/items/${slug}.webp`;

// accent-insensitive prefix match on the old name
const rx = (prefix) =>
  new RegExp(
    "^\\s*" +
      prefix
        .replace(/a/g, "[aáà]")
        .replace(/e/g, "[eéè]")
        .replace(/i/g, "[iíì]")
        .replace(/o/g, "[oóò]")
        .replace(/u/g, "[uúù]")
        .replace(/n/g, "[nñ]"),
    "i"
  );

const CASES = [
  {
    id: "6a2f299c986691072d9df8a3", // Caja Inicial
    image: "/images/cases/inicial.webp",
    items: [
      { old: "corona", name: "Corona de Laurel de Crixus", slug: "corona-de-laurel-de-crixus" },
      { old: "diamante", name: "Gladius de Bronce", slug: "gladius-de-bronce" },
      { old: "as de picas", name: "Casco de Murmillo", slug: "casco-de-murmillo" },
      { old: "herradura", name: "Escudo de Tracio", slug: "escudo-de-tracio" },
      { old: "carta", name: "Brazal de Cuero", slug: "brazal-de-cuero" },
      { old: "ficha", name: "As de Bronce", slug: "as-de-bronce" },
      { old: "trebol", name: "Sandalias de Arena", slug: "sandalias-de-arena" },
      { old: "dado", name: "Dados de Hueso", slug: "dados-de-hueso" },
    ],
  },
  {
    id: "6a2f299c986691072d9df8ac", // Caja Premium
    image: "/images/cases/premium.webp",
    items: [
      { old: "caliz", name: "Cáliz del Emperador", slug: "caliz-del-emperador" },
      { old: "lingote", name: "Áureo de César", slug: "aureo-de-cesar" },
      { old: "rubi", name: "Anillo de Senador", slug: "anillo-de-senador" },
      { old: "mas", name: "Máscara de Bronce Ceremonial", slug: "mascara-de-bronce-ceremonial" },
      { old: "anillo", name: "Tridente de Retiario", slug: "tridente-de-retiario" },
      { old: "reloj", name: "Clepsidra del Coliseo", slug: "clepsidra-del-coliseo" },
      { old: "moneda", name: "Denario de Plata", slug: "denario-de-plata" },
      { old: "trebol", name: "Lámpara de Aceite", slug: "lampara-de-aceite" },
    ],
  },
  {
    id: "6a2f299c986691072d9df8b5", // Caja Legendaria
    image: "/images/cases/legendaria.webp",
    items: [
      { old: "trono", name: "Trono de Crixus", slug: "trono-de-crixus" },
      { old: "dragon", name: "Águila de la Legión", slug: "aguila-de-la-legion" },
      { old: "diamante", name: "Yelmo Imperial de Oro", slug: "yelmo-imperial-de-oro" },
      { old: "fenix", name: "Carro de Guerra Dorado", slug: "carro-de-guerra-dorado" },
      { old: "tigre", name: "Tigre de la Arena", slug: "tigre-de-la-arena" },
      { old: "pavo", name: "Armadura de Centurión", slug: "armadura-de-centurion" },
      { old: "zafiro", name: "Scutum de Legionario", slug: "scutum-de-legionario" },
      { old: "esmeralda", name: "Pilum de Pretoriano", slug: "pilum-de-pretoriano" },
      { old: "gema", name: "Pugio de Hierro", slug: "pugio-de-hierro" },
    ],
  },
];

(async () => {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set (run from backend/ with its .env)");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log(APPLY ? "APPLY mode — writing changes\n" : "DRY RUN — no changes will be written\n");

  // ---- resolve every mapping to exactly one item before writing anything ----
  const plan = [];
  let problems = 0;
  for (const c of CASES) {
    const caseDoc = await Case.findById(c.id).lean();
    if (!caseDoc) {
      console.error(`✗ case ${c.id} not found`);
      problems++;
      continue;
    }
    const items = await Item.find({
      $or: [{ _id: { $in: caseDoc.items || [] } }, { case: caseDoc._id }],
    }).lean();
    console.log(`== ${caseDoc.title} (${items.length} items)`);
    console.log(`   case image: ${caseDoc.image} -> ${c.image}`);

    const used = new Set();
    for (const m of c.items) {
      const hits = items.filter(
        (it) => !used.has(String(it._id)) && (it.name === m.name || rx(m.old).test(it.name))
      );
      // items claimed by an earlier mapping are skipped, so on a re-run "anillo" won't
      // grab the already-renamed "Anillo de Senador"
      if (hits.length !== 1) {
        console.error(`   ✗ "${m.old}…" -> ${hits.length} matches: ${hits.map((h) => h.name).join(" | ") || "-"}`);
        problems++;
        continue;
      }
      const it = hits[0];
      used.add(String(it._id));
      console.log(`   ${it.name}  ->  ${m.name}`);
      plan.push({ item: it, name: m.name, image: img(m.slug) });
    }
    const left = items.filter((it) => !used.has(String(it._id)));
    if (left.length) console.log(`   (unmapped, left untouched: ${left.map((l) => l.name).join(" | ")})`);
    plan.push({ caseId: caseDoc._id, image: c.image });
    console.log("");
  }

  if (problems) {
    console.error(`${problems} problem(s) — nothing written. Adjust the mapping and re-run.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  // ---- write ----
  const stats = { items: 0, cases: 0, inventory: 0, fixed: 0, listings: 0 };
  for (const p of plan) {
    if (p.caseId) {
      if (APPLY) stats.cases += (await Case.updateOne({ _id: p.caseId }, { $set: { image: p.image } })).modifiedCount;
      else stats.cases++;
      continue;
    }
    const { item, name, image } = p;
    const oldImage = item.image;
    const set = { name, image };

    // copies are matched by item id or by the item's current (old) image url
    const invMatch = [{ "e._id": item._id }, { "e.image": oldImage }];
    const listingFilter = { $or: [{ item: item._id }, { itemImage: oldImage }] };
    const fixedFilter = { "fixedItem.image": oldImage };

    if (APPLY) {
      stats.items += (await Item.updateOne({ _id: item._id }, { $set: set })).modifiedCount;
      for (const af of invMatch) {
        const key = Object.keys(af)[0].slice(2); // "_id" | "image"
        const r = await User.updateMany(
          { inventory: { $elemMatch: { [key]: af[`e.${key}`] } } },
          { $set: { "inventory.$[e].name": name, "inventory.$[e].image": image } },
          { arrayFilters: [af] }
        );
        stats.inventory += r.modifiedCount;
      }
      stats.fixed += (
        await User.updateMany(fixedFilter, { $set: { "fixedItem.name": name, "fixedItem.image": image } })
      ).modifiedCount;
      stats.listings += (
        await Marketplace.updateMany(listingFilter, { $set: { itemName: name, itemImage: image } })
      ).modifiedCount;
    } else {
      stats.items++;
      const agg = await User.aggregate([
        { $unwind: "$inventory" },
        { $match: { $or: [{ "inventory._id": item._id }, { "inventory.image": oldImage }] } },
        { $count: "n" },
      ]);
      stats.inventory += agg.length ? agg[0].n : 0;
      stats.fixed += await User.countDocuments(fixedFilter);
      stats.listings += await Marketplace.countDocuments(listingFilter);
    }
  }

  const verb = APPLY ? "updated" : "to update";
  console.log(`items ${verb}: ${stats.items}`);
  console.log(`cases ${verb}: ${stats.cases}`);
  console.log(`inventory ${APPLY ? "user updates" : "entries to update"}: ${stats.inventory}`);
  console.log(`fixed items ${verb}: ${stats.fixed}`);
  console.log(`marketplace listings ${verb}: ${stats.listings}`);
  console.log(APPLY ? "\ndone." : "\ndry run complete — re-run with --apply to write.");

  await mongoose.disconnect();
})().catch(async (err) => {
  console.error(err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
