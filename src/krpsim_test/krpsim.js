const { parseLines, getLines } = require("../krpsim/parser");
const { validateParams, printParseResult } = require("../krpsim/utils");
const { Simulation } = require("./Simulation");
const { ParallelSGS } = require("./Solver");

const getResources = (file) => {
  try {
    const parsedLines = getLines(file);
    const resources = parseLines(parsedLines);
    printParseResult(resources);
    return resources;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

function main() {
  const args = process.argv.slice(2);
  const { file, delay } = validateParams(args);
  const { stocks, processes, optimize } = getResources(file);
  const simulation = new Simulation(stocks, Object.values(processes), [
    optimize,
  ]);
  const solver = new ParallelSGS(simulation, { delay });
  solver.run();
}

main();
