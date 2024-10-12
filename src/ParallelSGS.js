const { Process } = require("./Process");
const { Simulation } = require("./Simulation");

// Parallel Schedule Generation Scheme (PSGS) implementation.
class ParallelSGS {
  /**
   * @param {Simulation} sim - Current simulation to evaluate.
   * @param {Object} kwargs - Additional configuration parameters.
   */
  constructor(sim, { delay, logFile, cycle, verbose }) {
    this.sim = sim;
    this.sim.filterProcesses(); // Filter eligible processes.

    this.delay = delay; // Max running time for the simulation.
    this.logFile = logFile;
    this.begin = Date.now(); // Start time of the simulation.
    this.verbose = verbose; // Enable or disable verbose output.
    this.cycle = cycle ?? Infinity; // Max number of cycles.

    this.Rbounds = this.calculateRbounds();
    this.theoreticalStocks = { ...this.sim.stocks }; // Copy of the initial stocks.
  }

  /**
   * Finds the minimum finished time among active processes.
   * @param {ActiveProcess[]} activeProcesses
   * @param {Object.<string,number>} finishTimeByName
   */
  minimumFinishedTime(activeProcesses, finishTimeByName) {
    const minF = activeProcesses.reduce((acc, { process: { name } }) => {
      if (finishTimeByName[name] < acc) {
        return finishTimeByName[name];
      }
      return acc;
    }, Infinity);
    return minF === Infinity ? 0 : minF;
  }

  /**
   * @param {CompleteProcess[]} completeProcesses
   * @param {ActiveProcess[]} activeProcesses
   * @param {Object.<string,number>} finishTimeByName
   * @param {number} loopTime
   */
  updateProcesses(
    completeProcesses,
    activeProcesses,
    finishTimeByName,
    loopTime
  ) {
    /** @type {ActiveProcess[]} */
    const toRemove = [];

    activeProcesses.forEach(({ time, process }) => {
      if (finishTimeByName[process.name] <= loopTime) {
        this.sim.updateStocks(process.output); // Update stocks with process results.
        completeProcesses.push({ time, name: process.name });
        toRemove.push({ time, process });
      }
    });

    // Remove completed jobs from the active list.
    for (const remove of toRemove) {
      const idx = activeProcesses.findIndex(
        (j) => j.time === remove.time && j.process.name === remove.process.name
      );
      if (idx > -1) {
        activeProcesses.splice(idx, 1);
      }
    }

    // Update theoretical stocks with the current stocks.
    this.theoreticalStocks = { ...this.sim.stocks };
  }

  /**
   * Updates the theoretical stocks after executing a process.
   * @param {Process} process
   */
  updateStocks(process) {
    this.sim.updateStocks(process.need, true); // Remove stocks consumed by the process.

    for (const [key, value] of Object.entries(process.need)) {
      this.theoreticalStocks[key] -= value;
    }
    for (const [key, value] of Object.entries(process.output)) {
      this.theoreticalStocks[key] += value;
    }
  }

  /**
   * Heuristic-based process selection.
   * @param {Process[]} eligibleProcesses
   * @returns {Process | undefined}
   */
  heuristicSelect(eligibleProcesses) {
    const finalProcess = eligibleProcesses.find((p) =>
      Object.keys(p.output).includes((key) => this.sim.optimize.includes(key))
    );
    if (finalProcess) {
      return finalProcess;
    }

    const processWithInsufficientStock = eligibleProcesses.find((p) =>
      Object.keys(p.output).find(
        (key) =>
          !this.Rbounds[key] || this.theoreticalStocks[key] < this.Rbounds[key]
      )
    );

    return processWithInsufficientStock;
  }

  /**
   * @param {ActiveProcess[]} activeProcesses
   * @param {number} loopTime - Current time.
   */
  isFinished(activeProcesses, loopTime) {
    const timeElapsed = Date.now() - this.begin;
    return (
      timeElapsed > this.delay ||
      loopTime >= this.cycle ||
      (loopTime !== 0 && activeProcesses.length === 0)
    );
  }

  /**
   * Main PSGS algorithm.
   */
  run() {
    let loopTime = 0; // Time at loop
    /** @type {ActiveProcess[]} */
    let activeProcesses = [];
    /** @type {CompleteProcess[]} */
    let completeProcesses = [];
    /** @type {Object.<string,number>} */
    const finishTimeByName = {};

    while (!this.isFinished(activeProcesses, loopTime)) {
      loopTime = this.minimumFinishedTime(activeProcesses, finishTimeByName);
      this.updateProcesses(
        completeProcesses,
        activeProcesses,
        finishTimeByName,
        loopTime
      );

      /** @type {Process[]} */
      let eligibleProcesses = this.sim.getEligibleProcesses();
      while (eligibleProcesses.length) {
        const selectedProcess = this.heuristicSelect(eligibleProcesses);
        if (!selectedProcess) {
          break;
        }

        finishTimeByName[selectedProcess.name] =
          loopTime + selectedProcess.time;
        activeProcesses.push({ time: loopTime, process: selectedProcess });
        this.updateStocks(selectedProcess);
        eligibleProcesses = this.sim.getEligibleProcesses(); // Refresh eligible processes
      }
    }

    activeProcesses.forEach(({ process }) => {
      this.sim.updateStocks(process.need);
    });

    completeProcesses.sort((a, b) => a.time - b.time); // Sort by cycle
    this.output(completeProcesses, loopTime); // Output the final job sequence
  }

  /**
   * Outputs the result path and simulation stocks.
   * @param {CompleteProcess[]} completeProcesses - The sequence of cycles and processes.
   * @param {number} loopTime - The time at which no more processes can be executed.
   */
  output(completeProcesses, loopTime) {
    this.manageOutput("# Main walk");
    completeProcesses.forEach(({ time, name }) =>
      this.manageOutput(`${time}: ${name}`)
    );
    this.manageOutput(`# No more process doable at cycle ${loopTime + 1}`);

    this.sim.printStocks();
    if (this.logFile) {
      this.sim.printStocks(this.logFile);
    }
  }

  /** @param {string} line */
  manageOutput(line) {
    if (this.verbose) {
      console.log(line);
    }
    if (this.logFile) {
      require("fs").appendFileSync(this.logFile, line + "\n", "utf8");
    }
  }

  /** Calculates the resource bounds (Rbounds) for eligible processes. */
  calculateRbounds() {
    return this.sim.eligibles
      .flatMap((p) => Object.entries(p.need))
      .reduce((acc, curr) => {
        const [need, amount] = curr;
        if (this.sim.optimize.includes(need)) {
          return acc;
        }

        return { ...acc, [need]: Math.max(acc[need] || 0, amount) };
      }, {});
  }
}

/**
 * @typedef {Object} ActiveProcess
 * @property {number} time
 * @property {Process} process
 */

/**
 * @typedef {Object} CompleteProcess
 * @property {number} time
 * @property {string} name
 */

module.exports = { ParallelSGS };
