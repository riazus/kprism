class Process {
  /**
   * @param {string} line
   */
  constructor(line) {
    const match = line.match(/^(\w+):\((.*)\):\((.*)\):(\d+)$/);
    if (!match) {
      throw new Error(`Invalid format for process: '${line}'`);
    }

    const [_, name, needs, outputs, time] = match;
    const need = Object.fromEntries(needs.split(";").map(parseStock));
    const output = Object.fromEntries(outputs.split(";").map(parseStock));

    this.name = name;
    this.need = need;
    this.output = output;
    this.time = parseInt(time);
  }

  toString() {
    return `name: ${this.name} | need: ${getNameAndValue(
      this.need
    )} | output: ${getNameAndValue(this.output)} | time: ${this.time}`;
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

module.exports = { Process };
