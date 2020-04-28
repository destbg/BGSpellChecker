class SpellChecker {
  constructor() {
    this.checkedWords = [];
  }

  /**
   * Text spell checking
   * @public
   * @param {string} text
   */
  checkText(text) {
    const textArr = text
      .split(/[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/g)
      .filter((word) => word && word !== word.toUpperCase());

    const outArr = [];

    for (let i = 0; i < textArr.length; i++) {
      const checked = this.checkWord(textArr[i]);
      if (checked) {
        this.checkedWords.push(textArr[i].toLowerCase());
      } else {
        outArr.push(textArr[i]);
      }
    }

    return outArr;
  }

  /**
   * Word spell checking
   * @private
   */
  checkWord(wordProp) {
    // Way of reducing the load-time of dictionary
    // Post-escaping comments from files
    const word = wordProp.replace(/^#/, '');
    const wordLower = word.toLowerCase();

    if (this.checkedWords.includes(wordLower)) {
      return true;
    }

    // If the word exists, returns true
    if (window.allWords.includes(word)) {
      return true;
    }

    if (window.allWords.includes(wordLower)) {
      return true;
    }

    return false;
  }
}
