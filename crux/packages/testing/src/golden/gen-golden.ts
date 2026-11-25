import { writeFile } from "node:fs/promises";
import { buildGoldenDataset } from "./dataset";
import { EXPECTED_PATH } from "./files";

const dataset = buildGoldenDataset();
await writeFile(EXPECTED_PATH, `${JSON.stringify(dataset.expected, null, 2)}\n`, "utf8");
console.log(`golden/expected.json zapisany (${String(dataset.entries.length)} wpisów)`);
