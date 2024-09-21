const fs = require("fs");
const { getLines } = require("./parser");

function validateParams(params) {
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
}

function main() {
  const args = process.argv.slice(2);

  try {
    const { file, delay } = validateParams(args);
    const parsedLines = getLines(file);
    console.log(parsedLines);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
