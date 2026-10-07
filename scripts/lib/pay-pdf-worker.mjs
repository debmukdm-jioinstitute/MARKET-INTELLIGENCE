import { parentPort } from "node:worker_threads";
import { extractBrsrPay } from "../../src/lib/research/brsr-pay.mjs";
parentPort.on("message", async ({ bytes, options }) => {
  try { parentPort.postMessage({ result: await extractBrsrPay(new Uint8Array(bytes), options) }); }
  catch (error) { parentPort.postMessage({ error: error.message }); }
});
