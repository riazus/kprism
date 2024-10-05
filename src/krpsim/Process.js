class Process {
  /** @param {string} line */
  constructor(line) {
    const match = line.match(/^(\w+):\((.*)\):\((.*)\):(\d+)$/);
    if (!match) {
      throw new Error(`Invalid format for process: '${line}'`);
    }

    const [_, name, needs, outputs, time] = match;
    /** @type {Stock} */
    const need = Object.fromEntries(needs.split(";").map(parseStock));
    /** @type {Stock} */
    const output = Object.fromEntries(outputs.split(";").map(parseStock));
    /** @type {Stock} */
    const score = Object.fromEntries(
      Object.entries(need).map(([name, qty]) => [
        name,
        (output[name] || 0) - qty,
      ])
    );

    this.name = name;
    this.need = need;
    this.output = output;
    this.time = parseInt(time);
    this.score = score;
  }

  toString() {
    return `name: ${this.name} | need: ${getNameAndValue(
      this.need
    )} | output: ${getNameAndValue(this.output)} | time: ${this.time}`;
  }

  // Check if the process can be executed with the current stock levels
  canExecute(stocks) {
    for (const [item, qty] of Object.entries(this.need)) {
      if (stocks[item] === undefined || stocks[item] < qty) {
        return false; // Not enough stock to execute the process
      }
    }
    return true;
  }

  // Execute the process and return the updated stock levels and time
  execute(stocks) {
    // Deduct needed items from stock
    for (const [item, qty] of Object.entries(this.need)) {
      stocks[item] -= qty;
    }

    // Add produced items to stock
    for (const [item, qty] of Object.entries(this.output)) {
      if (stocks[item] === undefined) {
        stocks[item] = 0;
      }
      stocks[item] += qty;
    }

    // Return the time the process took
    return this.time;
  }
}

const getNameAndValue = (keyValue) => {
  return Object.entries(keyValue)
    .map(([name, val]) => `[${name}|${val}]`)
    .join(",");
};

const parseStock = (stock) => {
  const stockMatch = stock.match(/(\w+):(\d+)/);
  if (!stockMatch) {
    throw new Error(`Invalid format for stock: '${stock}'`);
  }

  return [stockMatch[1], parseInt(stockMatch[2])];
};

/** @typedef {Object.<string, number>} Stock */

module.exports = { Process };
