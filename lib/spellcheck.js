class SpellChecker {
  constructor(allWords) {
    this.checkedWords = [];
    this.allWords = allWords;
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
   * Find top matches for a word
   * @public
   * @param {string} word
   */
  findBestMatch(word) {
    const ratings = [];

    for (let i = 0; i < this.allWords.length; i++) {
      if (this.allWords[i].length < word.length - 2) continue;
      else if (this.allWords[i].length > word.length + 2) break;

      const currentTargetString = this.allWords[i];
      const currentRating = SpellChecker.compareTwoStrings(
        word,
        currentTargetString,
      );

      if (currentRating < 0.6) continue;
      ratings.push({ target: currentTargetString, rating: currentRating });
    }

    ratings.sort((a, b) => b.rating - a.rating);

    return ratings.slice(0, 10);
  }

  /**
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
    if (this.allWords.includes(word)) {
      return true;
    }

    if (this.allWords.includes(wordLower)) {
      return true;
    }

    return false;
  }

  /**
   * @private
   */
  static compareTwoStrings(s1, s2) {
    let longer = s1,
      shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    return (
      (longer.length -
        this.editDistance(longer.toLowerCase(), shorter.toLowerCase())) /
      parseFloat(longer.length)
    );
  }

  /**
   * @private
   */
  static editDistance(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}

module.exports = SpellChecker;
