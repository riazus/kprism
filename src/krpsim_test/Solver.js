const { Process } = require("../krpsim/Process");
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

    this.begin = Date.now(); // Start time of the simulation.
    this.delay = delay; // Max running time for the simulation.
    this.cycle = cycle ?? Infinity; // Max number of cycles.
    // this.file = file ?? "test_" + Date.now() + ".log"; // Output file path.
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
   * Finds the minimum finished time among active jobs.
   * @param {{time: number, process: Process}[]} Ag - Active jobs list.
   * @param {{[name: string]: number}} F - Job finish times.
   * @returns {number} - Minimum finished time.
   */
  minimumFinishedTime(Ag, F) {
    let minF = Infinity;
    Ag.forEach(({ process }) => {
      if (F[process.name] < minF) {
        minF = F[process.name];
      }
    });
    return minF === Infinity ? 0 : minF;
  }

  /**
   * Updates the active job list and stocks after job completion.
   * @param {{time: number, name: string}[]} Cg - Completed jobs list.
   * @param {{time: number, process: Process}[]} Ag - Active jobs list.
   * @param {{[name: string]: number}} F - Job finish times.
   * @param {number} tg - Current time.
   * @returns {Array} - Updated Cg and Ag lists.
   */
  updateJobs(Cg, Ag, F, tg) {
    /**
     * @type {{time: number, process: Process}[]}
     */
    const toRemove = [];

    Ag.forEach(({ time, process }) => {
      if (F[process.name] <= tg) {
        this.sim.updateStocks(process.output); // Update stocks with process results.
        // Cg.push([time, process.name]);
        Cg.push({ time, name: process.name });
        toRemove.push({ time, process });
      }
    });

    // Remove completed jobs from the active list.
    for (const remove of toRemove) {
      const idx = Ag.findIndex(
        (j) => j.time === remove.time && j.process.name === remove.process.name
      );
      if (idx > -1) {
        Ag.splice(idx, 1);
      }
    }

    // Update theoretical stocks with the current stocks.
    this.theoreticalStocks = { ...this.sim.stocks };
  }

  /**
   * Updates the theoretical stocks after executing a job.
   * @param {Process} job - The job to execute.
   */
  updateStocks(job) {
    this.sim.updateStocks(job.need, true); // Remove stocks consumed by the job.

    for (const [key, value] of Object.entries(job.need)) {
      this.theoreticalStocks[key] -= value;
    }
    for (const [key, value] of Object.entries(job.output)) {
      this.theoreticalStocks[key] += value;
    }
  }

  /**
   * Heuristic-based job selection.
   * @param {Process[]} Eg - Eligible jobs list.
   * @returns {Process|null} - Selected job or null.
   */
  heuristicSelect(Eg) {
    for (const job of Eg) {
      for (const key in job.output) {
        if (this.sim.optimize.includes(key)) {
          return job;
        }
      }
    }

    for (const job of Eg) {
      for (const key in job.output) {
        if (
          key in this.Rbounds &&
          this.theoreticalStocks[key] >= this.Rbounds[key]
        ) {
          continue;
        }
        return job;
      }
    }

    return null;
  }

  /**
   * Checks whether the algorithm should terminate.
   * @param {{time: number, process: Process}[]} Ag - Active jobs list.
   * @param {number} tg - Current time.
   * @returns {boolean} - Whether the algorithm is finished.
   */
  isFinished(Ag, tg) {
    const timeElapsed = Date.now() - this.begin;
    return (
      timeElapsed > this.delay ||
      tg >= this.cycle ||
      (tg !== 0 && Ag.length === 0)
    );
  }

  /**
   * Main PSGS algorithm.
   */
  run() {
    let tg = 0; // Time at depth g
    let Ag = []; // Active jobs | { time: number; process: Process }
    let Cg = []; // Completed jobs
    const F = {}; // Finish times for jobs

    while (!this.isFinished(Ag, tg)) {
      tg = this.minimumFinishedTime(Ag, F); // Get minimum finished time
      this.updateJobs(Cg, Ag, F, tg); // Update active and completed jobs

      let Eg = this.sim.getElligibles(); // Get eligible jobs

      while (Eg.length > 0) {
        const j = this.heuristicSelect(Eg); // Select job based on heuristic
        if (!j) break;

        F[j.name] = tg + j.time;
        Ag.push({ time: tg, process: j }); // Add job to active list
        this.updateStocks(j); // Update stocks after executing job
        Eg = this.sim.getElligibles(); // Refresh eligible jobs
      }
    }

    Ag.forEach(({ process }) => {
      this.sim.updateStocks(process.need);
    });

    Cg.sort((a, b) => a.time - b.time); // Sort by cycle
    this.output(Cg, tg); // Output the final job sequence
  }
}

module.exports = { ParallelSGS };
