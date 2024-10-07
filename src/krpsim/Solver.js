const { Process } = require("./Process");
const { Simulation } = require("./Simulation");

class Solver {
  /**
   * Initializes the solver.
   * @param {Simulation} sim - Current simulation to evaluate.
   * @param {Object} kwargs - Additional configuration parameters.
   */
  constructor(sim, { delay, cycle, verbose, file }) {
    this.sim = sim;
    this.sim.filterProcesses(); // Filter eligible processes.

    this.delay = delay; // Max running time for the simulation.
    this.file = file;
    this.begin = Date.now(); // Start time of the simulation.
    this.cycle = cycle ?? Infinity; // Max number of cycles.
    this.verbose = verbose ?? true; // Enable or disable verbose output.

    this.Rbounds = this.calculateRbounds();
  }

  /**
   * Calculates the resource bounds (Rbounds) for eligible processes.
   * @returns {Object} - Rbounds object.
   */
  calculateRbounds() {
    const Rbounds = {};

    // Find the maximum resource needs for eligible processes.
    for (const process of this.sim.elligibles) {
      for (const [need, amount] of Object.entries(process.need)) {
        Rbounds[need] = Math.max(Rbounds[need] || 0, amount);
      }
    }

    // Remove optimizing resources from Rbounds.
    for (const opt of this.sim.optimize) {
      delete Rbounds[opt];
    }

    return Rbounds;
  }

  /**
   * Prints or writes output to file and console.
   * @param {string} message - The output message.
   */
  manageOutput(message) {
    if (this.verbose) {
      console.log(message);
    }

    // Optionally write to file.
    if (this.file) {
      require("fs").appendFileSync(this.file, message + "\n");
    }
  }

  /**
   * Outputs the result path and simulation stocks.
   * @param {{time: string; name: string}[]} Cg - The sequence of cycles and processes.
   * @param {number} tg - The time at which no more processes can be executed.
   */
  output(Cg, tg) {
    this.manageOutput("# Main walk");
    Cg.forEach(({ time, name }) => this.manageOutput(`${time}: ${name}`));
    this.manageOutput(`# No more process doable at cycle ${tg + 1}`);
    // this.sim.printStocks({ file: this.file });

    if (this.verbose) {
      this.sim.printStocks();
    }
  }

  // Placeholder for run method (implemented in ParallelSGS).
  run() {}
}

// Parallel Schedule Generation Scheme (PSGS) implementation.
class ParallelSGS extends Solver {
  /**
   * Initializes the PSGS.
   * @param {Simulation} sim - Current simulation to evaluate.
   * @param {Object} kwargs - Additional configuration parameters.
   */
  constructor(sim, kwargs) {
    super(sim, kwargs);
    this.theoreticalStocks = { ...this.sim.stocks }; // Copy of the initial stocks.
  }

  /**
   * Finds the minimum finished time among active processes.
   * @param {ActiveProcess[]} activeProcesses
   * @param {{[name: string]: number}} finishTimeByName
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
   * @param {{[name: string]: number}} finishTimeByName
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
   * Heuristic-based job selection.
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
    /** @type {[name: string]: number} */
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
      let eligibleProcesses = this.sim.getElligibleProcesses();
      while (eligibleProcesses.length) {
        const selectedProcess = this.heuristicSelect(eligibleProcesses);
        if (!selectedProcess) {
          break;
        }

        finishTimeByName[selectedProcess.name] =
          loopTime + selectedProcess.time;
        activeProcesses.push({ time: loopTime, process: selectedProcess });
        this.updateStocks(selectedProcess);
        eligibleProcesses = this.sim.getElligibleProcesses(); // Refresh eligible processes
      }
    }

    activeProcesses.forEach(({ process }) => {
      this.sim.updateStocks(process.need);
    });

    completeProcesses.sort((a, b) => a.time - b.time); // Sort by cycle
    this.output(completeProcesses, loopTime); // Output the final job sequence
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
