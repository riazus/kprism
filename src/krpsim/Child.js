class Child {
  constructor(startStock, optimize, lstProcess, maxCycle, maxInstructions) {
    this.optimize = optimize;
    this.lstProcess = lstProcess;
    this.maxInstructions = maxInstructions;
    this.hasStock = { ...startStock };
    this.postStock = { ...startStock };
    this.needStock = {};
    this.dictInstructions = {};
    this.instructionsGood = [];
    this.score = 0;
    this.created = 0;
    this.loop = true;

    this.getInstructions(lstProcess);
    this.postProcess(maxCycle);
    this.getScore(startStock);
  }

  getInstructions(lstProcess) {
    this.selectProcess(this.optimize, -1, lstProcess);

    while (Object.keys(this.needStock).length > 0) {
      let needName = Object.keys(this.needStock)[0];
      if (!this.selectProcess(needName, this.needStock[needName], lstProcess)) {
        break;
      }
    }
  }

  postProcess(maxCycle) {
    let cycle = 0;
    let lstPossibleProcesses = this.listPossibleProcessesPost(
      this.dictInstructions
    );
    this.instructionsGood = [[cycle, lstPossibleProcesses]];
    let lstTodo = this.updateTodo(cycle, lstPossibleProcesses, {});

    while (Object.keys(lstTodo).length > 0 && cycle <= maxCycle) {
      cycle = Math.min(...Object.keys(lstTodo).map(Number));
      for (let elt of lstTodo[cycle]) {
        updateAddStock(this.lstProcess[elt].result, this.postStock);
      }
      delete lstTodo[cycle];
      lstPossibleProcesses = this.listPossibleProcessesPost(
        this.dictInstructions
      );
      this.instructionsGood.push([cycle, lstPossibleProcesses]);
      lstTodo = this.updateTodo(cycle, lstPossibleProcesses, lstTodo);
    }
    return this.instructionsGood;
  }

  getScore(startStock) {
    try {
      this.created = this.postStock[this.optimize];
    } catch (error) {
      this.created = 0;
    }

    try {
      this.score =
        this.created /
        this.instructionsGood[this.instructionsGood.length - 1][0];
    } catch (error) {
      this.score = 0;
    }

    for (let key in startStock) {
      if (
        this.postStock[key] < startStock[key] ||
        !this.instructionsGood[0][1]
      ) {
        this.loop = false;
      }
    }
  }

  selectProcess(needName, needQuantity, lstProcess) {
    if (
      this.hasStock[needName] !== 0 &&
      needQuantity !== -1 &&
      Math.random() < 0.9 &&
      this.maxInstructions > 0
    ) {
      const tmpNb = this.hasStock[needName] - needQuantity;

      if (tmpNb < 0) {
        this.hasStock[needName] = 0;
        updateSubNeedStock(
          { [needName]: tmpNb },
          this.hasStock,
          this.needStock
        );
      } else {
        this.hasStock[needName] = tmpNb;
        delete this.needStock[needName];
      }
    } else {
      const lstPossibleProcess = this.listPossibleProcesses(
        needName,
        lstProcess
      );
      if (lstPossibleProcess.length === 0 || this.maxInstructions <= 0) {
        return false;
      }

      const chosenProcess =
        lstPossibleProcess[
          Math.floor(Math.random() * lstPossibleProcess.length)
        ];
      if (this.dictInstructions[chosenProcess.name]) {
        this.dictInstructions[chosenProcess.name]++;
      } else {
        this.dictInstructions[chosenProcess.name] = 1;
      }

      updateAddStock(chosenProcess.need, this.needStock);
      updateSubNeedStock(chosenProcess.result, this.hasStock, this.needStock);

      while (needName in this.needStock && this.maxInstructions > 0) {
        if (this.needStock[needName] >= needQuantity) {
          this.maxInstructions--;
          break;
        }

        if (this.dictInstructions[chosenProcess.name]) {
          this.dictInstructions[chosenProcess.name]++;
        } else {
          this.dictInstructions[chosenProcess.name] = 1;
        }

        updateAddStock(chosenProcess.need, this.needStock);
        updateSubNeedStock(chosenProcess.result, this.hasStock, this.needStock);
        this.maxInstructions--;
      }
    }
    return true;
  }

  listPossibleProcessesPost(dictInstructions) {
    const keys = Object.keys(dictInstructions).reverse();
    const processesCycle = [];

    for (let key of keys) {
      while (dictInstructions[key] !== 0) {
        if (this.processIsPossible(key)) {
          processesCycle.push(key);
          dictInstructions[key] -= 1;
        } else {
          break;
        }
      }
    }
    return processesCycle;
  }

  processIsPossible(processName) {
    let tmp = { ...this.postStock };

    for (let elt in this.lstProcess[processName].need) {
      if (this.postStock[elt] < this.lstProcess[processName].need[elt]) {
        return false;
      }
      tmp[elt] -= this.lstProcess[processName].need[elt];
    }

    this.postStock = tmp;
    return true;
  }

  updateTodo(cycle, actions, lstTodo) {
    for (let action of actions) {
      const delay = cycle + this.lstProcess[action].delay;
      if (!lstTodo[delay]) {
        lstTodo[delay] = [];
      }
      lstTodo[delay].push(action);
    }
    return lstTodo;
  }

  

  listPossibleProcesses(needName, lstProcess) {
    const lstPossibleProcess = [];

    for (let process in lstProcess) {
      if (needName in lstProcess[process].result) {
        lstPossibleProcess.push(lstProcess[process]);
      }
    }

    return lstPossibleProcess;
  }
}
