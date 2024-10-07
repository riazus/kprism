const { Process } = require("../krpsim/Process");

class Simulation {
  /**
   * @param {{[name: string]: number}} stocks
   * @param {Process[]} processes
   * @param {string[]} optimize
   */
  constructor(stocks, processes, optimize) {
    this.stocks = stocks;
    this.processes = processes;
    this.optimize = optimize;
    this.elligibles = [];
    this.priority = {};
  }

  /** Returns a string representation of the simulation. */
  toString() {
    let rep = "# Simulation description:\n";
    rep += `# ${this.processes.length} processes, `;
    rep += `# ${Object.keys(this.stocks).length} stocks, `;
    rep += `# ${this.optimize.length} to optimize\n`;
    rep += "# === Stocks:\n";
    for (const [name, quantity] of Object.entries(this.stocks)) {
      rep += `# ${name}: ${quantity}\n`;
    }
    rep += "# === Processes:\n";
    for (const process of this.processes) {
      rep += `# ${process}\n`;
    }
    rep += "# === Optimizing:\n";
    for (const name of this.optimize) {
      rep += `# ${name}\n`;
    }
    return rep;
  }

  /**
   * Updates the stocks based on new stock quantities.
   * @param {Object} stocks - The stocks to update.
   * @param {boolean} remove - Whether to remove stocks (default: false).
   */
  updateStocks(stocks, remove = false) {
    Object.entries(stocks).forEach(([key, value]) => {
      const sign = remove ? -1 : 1;
      if (this.stocks.hasOwnProperty(key)) {
        this.stocks[key] += sign * value;
      } else {
        this.stocks[key] = sign * value;
      }
    });
    return this;
  }

  /**
   * Prints the current stocks to the console or a file.
   * @param {Object} [file] - Optional file to print the stocks to.
   */
  printStocks(file = null) {
    const output = file
      ? (str) => require("fs").appendFileSync(file, str + "\n")
      : console.log;

    output("# Stock:");
    Object.entries(this.stocks).forEach(([key, value]) =>
      output(`#  ${key} => ${value}`)
    );
  }

  /**
   * Filters processes based on optimization needs.
   * @private
   */
  _filterProcess(optimizing, seen, depth) {
    this.processes.forEach((p) => {
      Object.keys(p.output).forEach((r) => {
        if (optimizing.includes(r)) {
          Object.keys(p.need).forEach((n) => {
            if (!this.priority.hasOwnProperty(n)) {
              this.priority[n] = depth;
            }
            this.priority[n] = Math.min(this.priority[n], depth);
          });

          if (!seen.includes(p)) {
            seen.push(p);
            seen = this._filterProcess(Object.keys(p.need), seen, depth + 1);
          }
        }
      });
    });

    return seen;
  }

  /** Filters eligible processes for the simulation. */
  filterProcesses() {
    this.elligibles = this._filterProcess(this.optimize, [], 0);
    this.optimize.forEach((o) => (this.priority[o] = -2));
    return this;
  }

  /**
   * Checks if a process can be paid based on current stock.
   * @private
   * @param {Object} process - The process to check.
   * @param {Object} R - The available resources (stocks).
   */
  _canPay(process, R) {
    return Object.entries(process.need).every(
      ([key, value]) => R[key] >= value
    );
  }

  /**
   * Returns the list of eligible processes that can be executed.
   * @private
   * @param {Object} R - The available resources (stocks).
   */
  _getElligibles(R) {
    return this.elligibles.filter((process) => this._canPay(process, R));
  }

  /** Gets the list of eligible processes, sorted by heuristic. */
  getElligibleProcesses() {
    let elligibles = this._getElligibles(this.stocks);

    // Sorting heuristic for the processes.
    const keyFunc = (x) => {
      return this.optimize.reduce((acc, curr) => {
        const oScore = x.score[curr] !== undefined ? x.score[curr] : -Infinity;
        const score = Object.keys(x.score).reduce((acc, key) =>
          key !== curr ? acc + x.score[key] : acc
        );
        return [...acc, oScore, score];
      }, []);
    };

    elligibles.sort((a, b) => {
      const aKeys = keyFunc(a);
      const bKeys = keyFunc(b);
      for (let i = 0; i < aKeys.length; i++) {
        if (aKeys[i] !== bKeys[i]) {
          return bKeys[i] - aKeys[i];
        }
      }
      return 0;
    });

    return elligibles;
  }
}

module.exports = { Simulation };
