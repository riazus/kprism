const fs = require("fs");

const validateParams = (params) => {
  if (params.length < 2) {
    throw new Error("Two parameters are required.");
  }

  const [param1, param2] = params;

  if (!param1 || !param2) {
    throw new Error("Both parameters must be non-empty.");
  }

  if (!fs.existsSync(param1)) {
    throw new Error(`File at path ${param1} does not exist.`);
  }

  const file = fs.readFileSync(param1);
  return { file, delay: param2 };
};

const printParseResult = ({ stocks, processes, optimize }) => {
  console.log(
    `Nice file! ${Object.keys(processes).length} processes, ${
      Object.keys(stocks).length
    } stocks, ${[optimize].length} to optimize\n`
  );
};

module.exports = { validateParams, printParseResult };
