const { getLines, parseLines } = require("./parser");
const { validateParams, printParseResult } = require("./utils");

const getResources = (file) => {
  try {
    const parsedLines = getLines(file);
    const resources = parseLines(parsedLines);
    printParseResult(resources);
    return resources;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

function main() {
  const args = process.argv.slice(2);
  const { file, delay } = validateParams(args);
  const { stocks, processes, optimize } = getResources(file);

  let time = 0;
  let executionLog = []; // To store the sequence of actions

  while (true) {
    let processExecuted = false;

    for (const process of Object.values(processes)) {
      if (process.canExecute(stocks)) {
        // Execute the process, update stocks and time
        const processTime = process.execute(stocks);
        time += processTime;
        executionLog.push(`${time - processTime}:${process.name}`);

        processExecuted = true;
        break; // Execute one process at a time
      }
    }

    // If no process was executed, break the loops
    if (!processExecuted) {
      console.log(`No more process doable at time ${time}`);
      break;
    }
  }

  // Output the execution log
  console.log("Main walk");
  executionLog.forEach((log) => console.log(log));

  // Output the final stock state
  console.log("Stock :");
  for (const [stock, qty] of Object.entries(stocks)) {
    console.log(`${stock} => ${qty}`);
  }
}

main();
