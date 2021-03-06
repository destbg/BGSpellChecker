class SpellChecker {
  constructor(allWords) {
    this.checkedWords = [];
    this.wrongCheckedWords = [];
    this.allWords = allWords;
  }

  /**
   * Text spell checking
   * @public
   * @param {string} text
   */
  checkText(text) {
    if (text.length === 0) {
      this.checkedWords = [];
      this.wrongCheckedWords = [];
      return [];
    }

    const textArr = new Set(text.match(/[а-я-]{2,}/gim));

    const outArr = [];

    for (const value of textArr) {
      const checked = this.checkWord(value);
      if (checked) {
        this.checkedWords.push(value);
      } else {
        outArr.push(value);
      }
    }

    this.wrongCheckedWords = outArr;
    return outArr;
  }

  /**
   * Find top matches for a word
   * @public
   * @param {string} word
   */
  findBestMatch(word) {
    if (word.length === 0) {
      return [];
    }

    const ratings = [];

    for (const string of this.allWords) {
      if (string.length < word.length - 2) continue;
      else if (string.length > word.length + 2) break;

      const currentRating = SpellChecker.compareTwoStrings(word, string);

      if (currentRating < 0.6) continue;
      ratings.push({ target: string, rating: currentRating });
    }

    ratings.sort((a, b) => b.rating - a.rating);
    return ratings.slice(0, 9);
  }

  /**
   * @private
   */
  checkWord(wordProp) {
    // Way of reducing the load-time of dictionary
    // Post-escaping comments from files
    const word = wordProp.replace(/^#/, '');
    const wordLower = word.toLowerCase();

    // If the word was checked
    if (this.checkedWords.includes(word)) {
      return true;
    }

    // If the word was checked and was wrong
    if (this.wrongCheckedWords.includes(word)) {
      return false;
    }

    // If the word exists
    if (this.allWords.includes(word)) {
      return true;
    }

    // If the word is lower case
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
