const { validateParams, getResources } = require("./utils");
const { Simulation } = require("./Simulation");
const { ParallelSGS } = require("./ParallelSGS");

function main() {
  const args = process.argv.slice(2);
  const { file, delay } = validateParams(args);
  const { stocks, processes, optimize } = getResources(file);
  const simulation = new Simulation(stocks, processes, optimize);

  const logFile = args[0] + ".log";
  const solver = new ParallelSGS(simulation, { delay, file: logFile });
  solver.run();
}

main();
