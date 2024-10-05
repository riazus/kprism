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

const lol = (stocks, processes) => {
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
};

/**
 *
 * @param {Array} completedJobs
 * @param {Array} activeJobs
 * @param {Object} finishTimeByJobName
 * @param {number} timeAtDepth
 */
const updateJobs = (
  completedJobs,
  activeJobs,
  finishTimeByJobName,
  timeAtDepth
) => {
  const toRemove = [];

  for (const [cycle, job] of activeJobs) {
    if (finishTimeByJobName[job.name] <= timeAtDepth) {
      // TODO
    }
  }

  for (const remove of toRemove) {
    const index = activeJobs.indexOf(remove);
    if (index > -1) {
      activeJobs.splice(index, 1);
    }
  }

  // TODO: update theoretical stocks with the current stocks.

  return [completedJobs, activeJobs];
};

const minimumFinishedTime = (activeJobs, finishTimeByJobName) => {
  let minFinishedTime = Infinity;

  activeJobs.forEach((job) => {
    if (finishTimeByJobName[job.name] < minFinishedTime) {
      minFinishedTime = finishTimeByJobName[job.name];
    }
  });

  return minFinishedTime === Infinity ? 0 : minFinishedTime;
};

const isFinished = (beginTime, delay, activeJobs, timeAtDepth) => {
  if (new Date().getTime() - beginTime > delay) {
    return true;
  } else if (timeAtDepth && !activeJobs.length) {
    return true;
  } else {
    return false;
  }
};

const sgs = (delay) => {
  const beginTime = new Date().getTime();
  let depth = 0;
  let timeAtDepth = 0;
  let activeJobs = []; // [[cycle, job]]
  let completedJobs = [];
  let finishTimeByJobName = {};

  while (isFinished(beginTime, delay, activeJobs, timeAtDepth)) {
    depth += 1;
    timeAtDepth = minimumFinishedTime(activeJobs, finishTimeByJobName);

    [completedJobs, activeJobs] = updateJobs(
      completedJobs,
      activeJobs,
      finishTimeByJobName,
      timeAtDepth
    );
  }
};

function main() {
  const args = process.argv.slice(2);
  const { file, delay } = validateParams(args);
  const { stocks, processes, optimize } = getResources(file);
}

main();
