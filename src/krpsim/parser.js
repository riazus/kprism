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
        if (!processes.length) {
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

        // !!! TODO: update_stocks_quantity(stocks, process)

        return {
          res: {
            ...acc.res,
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

// TODO:
const parseOptimize = () => {};
const parseProcess = () => {};
const parseStock = () => {};

module.exports = {
  getLines,
  parseLines,
};
