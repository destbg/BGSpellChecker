class UndoRedoJs {
  constructor(cooldownNumber) {
    this.cooldownNumber = cooldownNumber;
    this.currentCooldownNumber = 0;

    const stored = localStorage.getItem('text');
    if (stored) {
      this.stack = JSON.parse(stored);
    } else {
      this.stack = [''];
    }
    this.currentNumber = this.stack.length - 1;
  }

  record(data, force) {
    if (this.currentNumber === this.stack.length - 1) {
      //checking for regular history updates
      if (
        (this.currentCooldownNumber >= this.cooldownNumber ||
          this.currentCooldownNumber === 0) &&
        force !== true
      ) {
        //history updates after a new cooldown
        this.stack.push(data);
        this.currentNumber++;
        this.currentCooldownNumber = 1;
      } else if (
        this.currentCooldownNumber < this.cooldownNumber &&
        force !== true
      ) {
        //history updates during cooldown
        this.current(data);
        this.currentCooldownNumber++;
      } else if (force === true) {
        //force to record without cooldown
        this.stack.push(data);
        this.currentNumber++;
        this.currentCooldownNumber = this.cooldownNumber;
      }
    } else if (this.currentNumber < this.stack.length - 1) {
      //checking for history updates after undo
      if (force !== true) {
        //history updates after undo
        this.stack.length = this.currentNumber + 1;
        this.stack.push(data);
        this.currentNumber++;
        this.currentCooldownNumber = 1;
      } else if (force === true) {
        ////force to record after undo
        this.stack.length = this.currentNumber + 1;
        this.stack.push(data);
        this.currentNumber++;
        this.currentCooldownNumber = this.cooldownNumber;
      }
    }
    if (this.stack.length > 100) {
      this.stack.splice(0, this.stack.length - 100);
      if (this.currentNumber >= this.stack.length) {
        this.currentNumber = this.stack.length - 1;
      }
    }
  }

  undo(readOnly) {
    if (this.currentNumber > 0) {
      if (readOnly !== true) {
        this.currentNumber--;
        return this.stack[this.currentNumber];
      } else {
        return this.stack[this.currentNumber - 1];
      }
    }
  }

  redo(readOnly) {
    if (this.currentNumber < this.stack.length - 1) {
      if (readOnly !== true) {
        this.currentNumber++;
        return this.stack[this.currentNumber];
      } else {
        return this.stack[this.currentNumber + 1];
      }
    }
  }

  current(data) {
    if (data) {
      this.stack[this.currentNumber] = data;
    }
    return this.stack[this.currentNumber];
  }
}
