class SpellChecker {
  /**
   * Text spell checking
   * @public
   * @param {string} text
   */
  checkText(text) {
    const textArr = text
      .split(/[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/g)
      .filter((word) => word && word[0] !== word[0].toUpperCase());

    const outObj = {};

    for (let i = 0; i < textArr.length; i++) {
      const checked = this.checkWord(textArr[i]);
      const checkedList = Array.isArray(checked) ? checked : [checked];

      for (let j = 0; j < checkedList.length; j++) {
        if (checkedList[j] == null) {
          outObj[textArr[i]] = true;
        }
      }
    }

    return Object.keys(outObj);
  }

  /**
   * Word spell checking
   * @private
   */
  checkWord(wordProp, recblock) {
    // Just go away, if the word is not literal
    if (wordProp == null || wordProp === '' || !isNaN(Number(wordProp))) {
      return;
    }

    // Way of reducing the load-time of dictionary
    // Post-escaping comments from files
    const word = wordProp.replace(/^#/, '');

    // If the word exists, returns true
    if (window.allWords.includes(word)) {
      return true;
    }

    // Try to remove the case
    if (window.allWords.includes(word.toLowerCase())) {
      return true;
    }

    // Check for the presence of the add. chars
    const esymb = "-/'";

    // Checking parts of words
    for (let i = 0; i < esymb.length; i++) {
      if (recblock || word.indexOf(esymb[i]) === -1) {
        continue;
      }

      const retArray = word.split(esymb[i]).map((item, i) => {
        if (i === 0) {
          return this.checkWord(item, true);
        } else {
          const res = this.checkWord(item, true);
          return res || this.checkWord(esymb[i] + item, true);
        }
      });

      return retArray;
    }
  }
}
