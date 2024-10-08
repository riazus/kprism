const fs = require("fs");
const { Process } = require("./Process");

/**
 *
 * @param {Process} process
 * @param {{[name: string]: number}} stocks
 */
function createStocksFromProcess(process, stocks) {
  const processStockNames = Object.keys({ ...process.need, ...process.output });
  return Object.fromEntries(
    processStockNames.filter((name) => !stocks[name]).map((name) => [name, 0])
  );
}

/**
 * @param {Buffer} file
 */
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
          processes: { ...acc.processes, [process.name]: process },
          stocks: { ...acc.stocks, ...newStocks },
        };
      } else if (isOptimizeLine(line)) {
        const optimize = line.match(/\w+\)$/)[0].slice(0, -1);
        return { ...acc, optimize };
      } else {
        throw new Error("Unrecognized line format:", line);
      }
    },
    {
      stocks: {},
      processes: {},
      optimize: "",
    }
  );

  if (stocks[optimize] === undefined) {
    throw new Error("Stocks don't have optimize parameter:", optimize);
  }

  return { stocks, processes, optimize };
};

/**
 * Parses the trace file.
 * @param {string} filePath - Path to the trace file.
 * @returns {string[][]|null} - Parsed trace or null in case of an error.
 */
function parseTrace(filePath) {
  try {
    const raw = fs
      .readFileSync(filePath, "utf8")
      .split("\n") // Split file into lines
      .map((line) => line.replace(/#.*$/, "").trim()) // Remove comments and trim spaces
      .filter((line) => line) // Remove empty lines
      .map((line) => line.split(":")); // Split by ':'

    return raw.map(([cycle, name]) => [parseInt(cycle, 10), name.trim()]);
  } catch (error) {
    console.error("Error encountered while parsing.");
    console.error(`=====\n${error}\n=====\nExiting...`);
    return null;
  }
}

module.exports = { getLines, parseLines, parseTrace };
