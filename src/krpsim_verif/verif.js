const fs = require("fs");
const { getResources, check } = require("../krpsim/utils");
const { Simulation } = require("../krpsim/Simulation");
const { parseTrace } = require("../krpsim/parser");

/**
 * Verifies that the execution runs correctly or outputs the cycle/process that causes trouble.
 * @param {Simulation} sim - The simulation object.
 * @param {string[][]} trace - The trace of the execution.
 * @returns {boolean} - Whether the execution was valid.
 */
function verif(sim, trace) {
  const S = trace.map(([cycle, name]) => [cycle, sim.getProcessByName(name)]);

  // Check for any issues in the stock
  const idx = check(sim.stocks, S);

  if (idx !== -1) {
    const [t, name] = trace[idx];
    const j = sim.getProcessByName(name);
    console.log("====== Error detected");
    console.log(`at ${t}:${j.name} stock insufficient`);
    console.log("======= Exiting...");
    return false;
  }

  return true;
}

function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    throw new Error("Two parameters are required.");
  }

  const [param1, param2] = args;
  if (!param1 || !param2) {
    throw new Error("Both parameters must be non-empty.");
  }

  if (!fs.existsSync(param1)) {
    throw new Error(`File at path ${param1} does not exist.`);
  }

  const file = fs.readFileSync(param1);
  const { stocks, processes, optimize } = getResources(file);

  const simulation = new Simulation(stocks, Object.values(processes), [
    optimize,
  ]);
  const trace = parseTrace(param2);

  if (!simulation || !trace) {
    process.exit(1);
  }

  console.log(simulation.toString());
  if (verif(simulation, trace)) {
    console.log("Trace completed, no error detected.");
  }
}

main();
