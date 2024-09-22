class Process {
  /**
   * @param {string} name
   * @param {{[name: string]: number}} need
   * @param {{[name: string]: number}} output
   * @param {number} time
   */
  constructor(name, need, output, time) {
    this.name = name;
    this.need = need;
    this.output = output;
    this.time = time;
  }

  toString() {
    let s = `\x1b[38;5;70m${this.name}\x1b[0m (time: ${this.time})\n`;
    s += `\t\x1b[1mInput\x1b[0m: `;
    for (const [stock, quantity] of Object.entries(this.need)) {
      s += `\x1b[38;5;62m${stock}\x1b[0m (${quantity}), `;
    }
    s += `\n\t\x1b[1mOutput\x1b[0m: `;
    for (const [stock, quantity] of Object.entries(this.output)) {
      s += `\x1b[38;5;62m${stock}\x1b[0m (${quantity}), `;
    }
    return s;
  }
}

module.exports = { Process };
