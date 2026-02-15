#!/usr/bin/env node
import { detectActivityState } from "./linux-activity";

(async function main() {
  try {
    const state = await detectActivityState();
    console.log(JSON.stringify(state, null, 2));
  } catch (err) {
    console.error("Failed to detect activity:", err);
    process.exit(1);
  }
})();
