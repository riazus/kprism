const { validateParams, getResources } = require("./utils");
const { Simulation } = require("./Simulation");
const { ParallelSGS } = require("./ParallelSGS");

function main() {
  const args = process.argv.slice(2);
  const { file, delay, verbose, logFile, cycle } = validateParams(args);
  const { stocks, processes, optimize } = getResources(file);
  const simulation = new Simulation(stocks, processes, optimize);
  const solver = new ParallelSGS(simulation, { delay, logFile, verbose, cycle });
  solver.run();
}

main();
