import { readFileSync, writeFileSync } from "node:fs";
import { makeBadge } from "badge-maker";

function readLineCoverage(summaryPath) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  return summary.total.lines;
}

const server = readLineCoverage("server/coverage/coverage-summary.json");
const client = readLineCoverage("client/coverage/coverage-summary.json");

const totalCovered = server.covered + client.covered;
const totalLines = server.total + client.total;
const pct = Math.floor((totalCovered / totalLines) * 100);

const color = pct >= 90 ? "brightgreen" : pct >= 75 ? "yellow" : "red";

const svg = makeBadge({
  label: "coverage",
  message: `${pct}%`,
  color,
});

writeFileSync("badges/coverage.svg", svg);
console.log(`Coverage badge written: ${pct}% (server ${server.pct}%, client ${client.pct}%)`);
