const fs = require("fs");
const { getResources, check } = require("./utils");
const { Simulation } = require("./Simulation");
const { parseTrace } = require("./parser");

/**
 * Verifies that the execution runs correctly or outputs the cycle/process that causes trouble.
 * @param {Simulation} sim - The simulation object.
 * @param {string[][]} trace - The trace of the execution.
 * @returns {boolean} - Whether the execution was valid.
 */
function verif(sim, trace) {
  const timeProcessMap = trace.map(([time, name]) => [
    time,
    sim.getProcessByName(name),
  ]);

  // Check for any issues in the stock
  const idx = check(sim.stocks, timeProcessMap);
  if (idx === -1) {
    return true;
  }

  const [time, name] = trace[idx];
  const j = sim.getProcessByName(name);
  console.log("====== Error detected");
  console.log(`at ${time}: ${j.name} stock insufficient`);
  return false;
}

/**
 * Validate user input and returns paths to files
 * @param {string[]} args
 */
function validateParams(args) {
  try {
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
    return { pathToConfig: param1, pathToTrace: param2 };
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  const { pathToConfig, pathToTrace } = validateParams(args);
  const file = fs.readFileSync(pathToConfig);
  const { stocks, processes, optimize } = getResources(file);

  const simulation = new Simulation(stocks, processes, optimize);
  const trace = parseTrace(pathToTrace);

  console.log(simulation.toString());
  if (verif(simulation, trace)) {
    console.log("Trace completed, no error detected.");
  }
}

main();
