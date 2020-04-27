function compareTwoStrings(s1, s2) {
  let longer = s1,
    shorter = s2;
  if (s1.length < s2.length) {
    longer = s2;
    shorter = s1;
  }
  return (
    (longer.length -
      editDistance(longer.toLowerCase(), shorter.toLowerCase())) /
    parseFloat(longer.length)
  );
}

function editDistance(s1, s2) {
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

function findBestMatch(mainString) {
  const ratings = [];

  for (let i = 0; i < window.allWords.length; i++) {
    if (window.allWords[i].length < mainString.length - 2) continue;
    else if (window.allWords[i].length > mainString.length + 2) break;

    const currentTargetString = window.allWords[i];
    const currentRating = compareTwoStrings(mainString, currentTargetString);

    if (currentRating < 0.6) continue;
    ratings.push({ target: currentTargetString, rating: currentRating });
  }

  ratings.sort((a, b) => b.rating - a.rating);

  return ratings;
}
