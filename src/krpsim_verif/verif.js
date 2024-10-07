const fs = require("fs");
const { getResources } = require("../krpsim/utils");
const { Simulation } = require("../krpsim/Simulation");

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

  console.log(simulation.toString());
}

main();
