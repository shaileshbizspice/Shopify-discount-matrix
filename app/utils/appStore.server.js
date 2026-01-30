// app/utils/appStore.server.js
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "store.json");

export function readAppStore() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

export function writeAppStore(next) {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(next, null, 2));
}