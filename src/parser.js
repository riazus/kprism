const fs = require("fs");
const { Process } = require("./Process");

/**
 *
 * @param {Process} process
 * @param {Object.<string, number>} stocks
 */
function createStocksFromProcess(process, stocks) {
  const processStockNames = Object.keys({ ...process.need, ...process.output });
  return Object.fromEntries(
    processStockNames.filter((name) => !stocks[name]).map((name) => [name, 0])
  );
}

/** @param {Buffer} file */
const getLines = (file) => {
  const lines = file.toString().split("\n");
  const processedLines = lines
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.trim());

  if (!processedLines.length) {
    throw new Error("File is empty.");
  }

  return processedLines;
};

const isStockLine = (line) => /^\w+:\d+$/.test(line);
const isProcessLine = (line) =>
  /^\w+:(\((\w+:\d+;?)+\))?:(\((\w+:\d+;?)+\))?:\d+$/.test(line);
const isOptimizeLine = (line) => /^optimize:\((\w+;?)+\)$/.test(line);

/**
 * Parses all file lines and returns process, stocks, optimize
 * @param {string} lines
 */
const parseLines = (lines) => {
  const { stocks, processes, optimize } = lines.reduce(
    (acc, line) => {
      if (isStockLine(line)) {
        const [stock, val] = line.split(":");
        return { ...acc, stocks: { ...acc.stocks, [stock]: parseInt(val) } };
      } else if (isProcessLine(line)) {
        const process = new Process(line);
        const newStocks = createStocksFromProcess(process, acc.stocks);
        return {
          ...acc,
          processes: [...acc.processes, process],
          stocks: { ...acc.stocks, ...newStocks },
        };
      } else if (isOptimizeLine(line)) {
        const occurrence = /optimize:\((.*)\)/.exec(line)[1];
        const optimize = occurrence.split(";");
        return { ...acc, optimize };
      } else {
        throw new Error("Unrecognized line format:", line);
      }
    },
    { stocks: {}, processes: [], optimize: [] }
  );

  if (stocks[optimize.at(-1)] === undefined) {
    throw new Error("Stocks don't have optimize parameter:", optimize);
  }

  return { stocks, processes, optimize };
};

/**
 * Parses the trace file.
 * @param {string} filePath - Path to the trace file.
 * @returns {string[][]} - Parsed trace.
 */
function parseTrace(filePath) {
  try {
    const raw = fs
      .readFileSync(filePath, "utf8")
      .split("\n") // Split file into lines
      .map((line) => line.replace(/#.*$/, "").trim()) // Remove comments and trim spaces
      .filter((line) => line)
      .map((line) => line.split(":"));

    return raw.map(([time, name]) => [parseInt(time, 10), name.trim()]);
  } catch (error) {
    console.log("Error encountered while parsing.");
    process.exit(1);
  }
}

module.exports = { getLines, parseLines, parseTrace };
