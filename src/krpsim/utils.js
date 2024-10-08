const fs = require("fs");
const { parseLines, getLines } = require("./parser");
const { Process } = require("./Process");

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

const validateParams = (params) => {
  if (params.length !== 2) {
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

/**
 * Updates the resource allocation.
 * @param {Object} R - Resource map.
 * @param {number} t - Time point.
 * @param {Object} r - Resource changes (needs or outputs).
 * @param {boolean} [remove=false] - Whether to remove the resources.
 * @returns {Object} - Updated resource map.
 */
function updateR(R, t, r, remove = false) {
  const sign = remove ? -1 : 1;

  if (!R[t]) {
    R[t] = {};
  }

  for (const [key, amount] of Object.entries(r)) {
    if (!R[t][key]) {
      R[t][key] = sign * amount;
    } else {
      R[t][key] += sign * amount;
    }
  }

  return R;
}

/**
 * Checks if resources are available.
 * @param {Object} R - Resource map.
 * @param {number} t - Time point.
 * @param {Object} r - Required resources.
 * @returns {boolean} - Whether all required resources are available.
 */
function availableR(R, t, r) {
  for (const [key, amount] of Object.entries(r)) {
    if (!R[t] || R[t][key] < amount) {
      return false;
    }
  }
  return true;
}

/**
 * Performs a check on the execution trace and resource allocation.
 * @param {Object} R0 - Initial resources.
 * @param {(string | Process)[][]} S - Execution trace (time, job pairs).
 * @returns {number} - The index of the failed job or -1 if all succeed.
 */
function check(R0, S) {
  let R = { [0]: { ...R0 } };
  let prevT = new Set([0]);
  let idx = 0;

  try {
    S.forEach(([t, process]) => {
      console.log(`Evaluating: ${t}:${process.name}`);

      const toRemove = [];
      for (const T of prevT) {
        if (T < t) {
          toRemove.push(T);
          for (const [key, amount] of Object.entries(R[T])) {
            if (!R[t]) {
              R[t] = {};
            }
            R[t][key] = (R[t][key] || 0) + amount;
          }
        }
      }

      for (const T of toRemove) {
        prevT.delete(T);
        delete R[T];
      }

      if (!availableR(R, t, process.need)) {
        return idx;
      }

      R = updateR(R, t, process.need, true); // Remove process needs
      R = updateR(R, t + process.time, process.output); // Add process results
      prevT.add(t + process.time);
      idx++;
    });

    /*
    for (const [t, job] of S) {
      if (verbose) {
        console.log(`Evaluating: ${t}:${job.name}`);
      }

      const toRemove = [];
      for (const T of prevT) {
        if (T < t) {
          toRemove.push(T);
          for (const [key, amount] of Object.entries(R[T])) {
            if (!R[t]) {
              R[t] = {};
            }
            R[t][key] = (R[t][key] || 0) + amount;
          }
        }
      }

      for (const T of toRemove) {
        prevT.delete(T);
        delete R[T];
      }

      if (!availableR(R, t, job.needs)) {
        return idx;
      }

      R = updateR(R, t, job.needs, true); // Remove job needs
      R = updateR(R, t + job.delay, job.results); // Add job results
      prevT.add(t + job.delay);
      idx++;
    }
    */
  } catch (error) {
    console.error("Error occurred during execution trace evaluation:", error);
    return idx;
  }

  return -1;
}

module.exports = { validateParams, printParseResult, getResources, check };
