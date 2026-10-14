// automatic data migrations. runs on every backend start (so every deploy):
// each file in this folder named like `2026-10-14-some-change.js` is applied
// once, in filename order, and recorded in the `migrations` collection so it
// never runs again.
//
// a migration file exports:
//   module.exports = {
//     description: "what it does",
//     async up({ db, mongoose, backup, log }) { ... },
//   };
// - db:     the raw mongodb Db (db.collection("items")...)
// - backup: await backup("items", { case: someId }) copies the matching docs
//           into `migration_backups` (tagged with the migration name) before
//           you change them, so any change can be reverted by hand.
// - log:    prefixed console.log
//
// rules: make `up` idempotent (safe if it runs twice) and call backup() before
// writing. if a migration throws, it is NOT recorded, later ones are skipped,
// the server keeps running, and it is retried on the next start.
//
// manual use (from backend/):  node migrations/runner.js           -> apply pending
//                              node migrations/runner.js --status  -> list state
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const DIR = __dirname;
const LOCK_TTL_MS = 10 * 60 * 1000;
const FILE_RX = /^\d{4}-\d{2}-\d{2}-[\w-]+\.js$/;

const listFiles = () => fs.readdirSync(DIR).filter((f) => FILE_RX.test(f)).sort();

async function runMigrations({ status = false } = {}) {
  const db = mongoose.connection.db;
  const applied = db.collection("migrations");
  const backups = db.collection("migration_backups");
  const locks = db.collection("migration_locks");

  const done = new Set((await applied.find({}, { projection: { _id: 1 } }).toArray()).map((d) => d._id));
  const pending = listFiles().filter((f) => !done.has(f));

  if (status) {
    for (const f of listFiles()) console.log(`${done.has(f) ? "applied" : "PENDING"}  ${f}`);
    return { pending };
  }
  if (!pending.length) return { applied: [] };

  // single-runner lock (stale locks expire), in case two processes start at once
  const now = Date.now();
  try {
    await locks.deleteOne({ _id: "lock", at: { $lt: new Date(now - LOCK_TTL_MS) } });
    await locks.insertOne({ _id: "lock", at: new Date(now) });
  } catch (err) {
    if (err.code === 11000) {
      console.log("[migrations] another process is running them, skipping");
      return { applied: [] };
    }
    throw err;
  }

  const ran = [];
  try {
    for (const file of pending) {
      const log = (...a) => console.log(`[migrations:${file}]`, ...a);
      const backup = async (collection, filter = {}) => {
        const docs = await db.collection(collection).find(filter).toArray();
        if (docs.length) {
          await backups.insertMany(
            docs.map((doc) => ({ migration: file, collection, at: new Date(), doc }))
          );
        }
        log(`backed up ${docs.length} doc(s) from ${collection}`);
        return docs.length;
      };

      const mod = require(path.join(DIR, file));
      log("applying —", mod.description || "");
      try {
        await mod.up({ db, mongoose, backup, log });
      } catch (err) {
        log("FAILED, stopping (will retry next start):", err);
        break;
      }
      await applied.insertOne({ _id: file, description: mod.description || "", appliedAt: new Date() });
      log("done");
      ran.push(file);
    }
  } finally {
    await locks.deleteOne({ _id: "lock" });
  }
  return { applied: ran };
}

module.exports = { runMigrations };

// CLI
if (require.main === module) {
  require("dotenv").config({ path: path.join(DIR, "..", ".env") });
  (async () => {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is not set");
      process.exit(1);
    }
    await mongoose.connect(process.env.MONGO_URI);
    const r = await runMigrations({ status: process.argv.includes("--status") });
    if (r.applied) console.log(`applied: ${r.applied.length ? r.applied.join(", ") : "none pending"}`);
    await mongoose.disconnect();
  })().catch(async (err) => {
    console.error(err);
    try { await mongoose.disconnect(); } catch (_) {}
    process.exit(1);
  });
}
