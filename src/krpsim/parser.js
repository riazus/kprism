const { Process } = require("./Process");

/**
 *
 * @param {{[name: string] : number}} stocks
 * @param {string} optimize
 * @returns
 */
const parseOptimize = (stocks, optimize) => {
  const match = optimize.match(/^optimize:\(([\w;]+)\)$/);
  if (!match) {
    throw new Error(`Invalid format for optimize: '${optimize}'`);
  }
  const parsedOptimize = optimize.split(":")[1].slice(1, -1).split(";");
  const filteredOptimize = parsedOptimize.filter(
    (stock) => stock && stock !== "time"
  );

  filteredOptimize.forEach((stock) => {
    if (stocks[stock] === undefined) {
      throw new Error(`Stock '${stock}' to optimize is not defined`);
    }
  });

  return filteredOptimize;
};

/**
 * @param {string} process
 */
const parseProcess = (process) => {
  const match = process.match(/^(\w+):\((.*)\):\((.*)\):(\d+)$/);
  if (!match) {
    throw new Error(`Invalid format for process: '${process}'`);
  }

  const [_, name, needs, outputs, time] = match;
  const need = {};
  needs.split(";").forEach((stock) => {
    const { name, quantity } = parseStock(stock);
    need[name] = quantity;
  });

  const output = {};
  outputs.split(";").forEach((stock) => {
    const { name, quantity } = parseStock(stock);
    output[name] = quantity;
  });

  return new Process(name, need, output, parseInt(time));
};

/**
 * @param {string} stock
 */
const parseStock = (stock) => {
  const stockMatch = stock.match(/(\w+):(\d+)/);
  if (!stockMatch) {
    throw new Error(`Invalid format for stock: '${stock}'`);
  }

  return { name: stockMatch[1], quantity: parseInt(stockMatch[2]) };
};

/**
 *
 * @param {{[name: string]: number}} stocks
 * @param {Process} process
 */
function updateStocksQuantity(stocks, process) {
  const updatedStocks = { ...stocks };

  for (const name in process.need) {
    if (!(name in updatedStocks)) {
      updatedStocks[name] = 0;
    }
  }

  for (const name in process.output) {
    if (!(name in updatedStocks)) {
      updatedStocks[name] = 0;
    }
  }

  return updatedStocks;
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

/**
 * Parses all file lines and returns process, stocks, optimize
 * @param {string[]} lines
 */
const parseLines = (lines) => {
  const { res, status } = lines.reduce(
    (acc, curr) => {
      const { processes, stocks } = acc.res;

      if (curr.includes("optimize")) {
        if (!Object.keys(processes).length) {
          throw new Error("Can't optimize before having any process.");
        }

        if (acc.status !== "process") {
          throw new Error("Optimize step is not after 'process'.");
        }

        const parsedOptimize = parseOptimize(stocks, curr);
        return {
          res: { ...acc.res, optimize: parsedOptimize },
          status: "optimize",
        };
      } else if (curr.includes("(")) {
        if (acc.status === "optimize") {
          throw new Error(`Expected ${acc.status} for line: ${curr}.`);
        }

        const parsedProcess = parseProcess(curr);
        const updatedStocks = updateStocksQuantity(stocks, parsedProcess);

        return {
          res: {
            ...acc.res,
            stocks: updatedStocks,
            processes: { ...processes, [parsedProcess.name]: parsedProcess },
          },
          status: "process",
        };
      } else {
        if (acc.status !== "stock") {
          throw new Error(`Expected ${acc.status} for line: ${curr}.`);
        }

        const { name, quantity } = parseStock(curr);
        return {
          res: { ...acc.res, stocks: { ...stocks, [name]: quantity } },
          status: "stock",
        };
      }
    },
    {
      res: { stocks: {}, processes: {}, optimize: [] },
      status: "stock",
    }
  );

  if (!Object.keys(res.processes).length) {
    throw new Error("Expected at least one process.");
  }

  if (status !== "optimize") {
    throw new Error("No stock to optimize");
  }

  const firstOptimize = res.optimize.at(0);

  return { ...res, optimize: firstOptimize };
};

module.exports = { getLines, parseLines };
