const { Process } = require("../krpsim/Process");

class Simulation {
  /**
   *
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

  /**
   * Returns a string representation of the simulation.
   */
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
   * Adds or updates a stock.
   * @param {string} name - The name of the stock.
   * @param {number} quantity - The quantity to add.
   */
  stock(name, quantity) {
    if (this.stocks.hasOwnProperty(name)) {
      this.stocks[name] += quantity;
    } else {
      this.stocks[name] = quantity;
    }
    return this;
  }

  /**
   * Updates the stocks based on new stock quantities.
   * @param {Object} newStocks - The new stocks to update.
   * @param {boolean} remove - Whether to remove stocks (default: false).
   */
  updateStocks(newStocks, remove = false) {
    for (const [key, value] of Object.entries(newStocks)) {
      const sign = remove ? -1 : 1;
      if (this.stocks.hasOwnProperty(key)) {
        this.stocks[key] += sign * value;
      } else {
        this.stocks[key] = sign * value;
      }
    }
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
    for (const [key, value] of Object.entries(this.stocks)) {
      output(`#  ${key} => ${value}`);
    }
  }

  /**
   * Adds a process to the simulation.
   * @param {Object} process - The process to add.
   */
  addProcess(process) {
    this.processes.push(process);
    return this;
  }

  /**
   * Adds a stock to optimize.
   * @param {string} name - The name of the stock to optimize.
   */
  // optimize(name) {
  //   this.optimize.push(name);
  //   return this;
  // }

  /**
   * Filters processes based on optimization needs.
   * @private
   */
  _filterProcess(optimizing, seen, depth) {
    for (const p of this.processes) {
      for (const r of Object.keys(p.output)) {
        if (optimizing.includes(r)) {
          for (const n of Object.keys(p.need)) {
            if (!this.priority.hasOwnProperty(n)) {
              this.priority[n] = depth;
            }
            this.priority[n] = Math.min(this.priority[n], depth);
          }
          if (!seen.includes(p)) {
            seen.push(p);
            seen = this._filterProcess(Object.keys(p.need), seen, depth + 1);
          }
        }
      }
    }
    return seen;
  }

  /**
   * Filters eligible processes for the simulation.
   */
  filterProcesses() {
    this.elligibles = this._filterProcess(this.optimize, [], 0);
    for (const o of this.optimize) {
      this.priority[o] = -2;
    }
    return this;
  }

  /**
   * Checks if a process can be paid based on current stock.
   * @private
   * @param {Object} process - The process to check.
   * @param {Object} R - The available resources (stocks).
   */
  _canPay(process, R) {
    for (const [key, value] of Object.entries(process.need)) {
      if (R[key] < value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Returns the list of eligible processes that can be executed.
   * @private
   * @param {Object} R - The available resources (stocks).
   */
  _getElligibles(R) {
    return this.elligibles.filter((process) => this._canPay(process, R));
  }

  /**
   * Gets the list of eligible processes, sorted by heuristic.
   */
  getElligibleProcesses() {
    let elligibles = this._getElligibles(this.stocks);

    // Sorting heuristic for the processes.
    const keyFunc = (x) => {
      let sortKeys = [];
      for (const optimize of this.optimize) {
        const oScore =
          x.score[optimize] !== undefined ? x.score[optimize] : -Infinity;
        let score = 0;
        for (const key in x.score) {
          if (key !== optimize) {
            score += x.score[key];
          }
        }
        sortKeys.push(oScore);
        sortKeys.push(score);
      }
      return sortKeys;
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

  /**
   * Gets a process by its name.
   * @param {string} name - The name of the process.
   */
  getProcess(name) {
    return this.processes.find((process) => process.name === name) || null;
  }
}

module.exports = { Simulation };
