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
}

const parseStock = (stock) => {
  const stockMatch = stock.match(/(\w+):(\d+)/);
  if (!stockMatch) {
    throw new Error(`Invalid format for stock: '${stock}'`);
  }

  return [stockMatch[1], parseInt(stockMatch[2])];
};

/** @typedef {Object.<string, number>} Stock */

module.exports = { Process };
