window.fixHtml = (elements) => {
  let input = '';
  for (const elem of elements) {
    const type = elem.localName;
    if (type) {
      const html = elem.outerHTML;
      input +=
        html.slice(0, html.indexOf('>') + 1) +
        window.fixHtml(elem.childNodes) +
        html.slice(html.lastIndexOf('<'));
    } else {
      input += elem.textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  }
  return input;
};

window.getStringRanges = (input, string) => {
  const ranges = [];
  const str = string.toLowerCase();
  let index = 0;

  while (((index = input.indexOf(str, index)), index !== -1)) {
    if (
      (index <= 0 ||
        input[index - 1].match(
          /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/,
        )) &&
      (index + str.length >= input.length ||
        input[index + str.length].match(
          /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/,
        ))
    ) {
      ranges.push([index, index + str.length]);
    }
    index += str.length;
  }
  return ranges;
};

window.getTextNodeAtPosition = (root, index) => {
  const treeWalker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    function next(elem) {
      if (index > elem.textContent.length) {
        index -= elem.textContent.length;
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  );
  const c = treeWalker.nextNode();
  return {
    node: c ? c : root,
    position: c ? index : 0,
  };
};

window.replaceWord = (word, replace) => {
  const ranges = window.getStringRanges(window.main.text().toLowerCase(), word);
  const mainElem = window.main.get(0);
  replace =
    word[0] === word[0].toUpperCase()
      ? replace[0].toUpperCase() + replace.slice(1)
      : replace;
  ranges.forEach((range) => {
    const selection = document.getSelection();
    const startPos = window.getTextNodeAtPosition(mainElem, range[0]);
    const endPos = window.getTextNodeAtPosition(mainElem, range[1]);
    selection.removeAllRanges();
    const docRange = new Range();
    docRange.setStart(startPos.node, startPos.position);
    docRange.setEnd(endPos.node, endPos.position);
    selection.addRange(docRange);
    document.execCommand('insertText', false, replace);
  });
  optionUsed = true;
  mainElem.dispatchEvent(new Event('input'));
};

(() => {
  const color = localStorage.getItem('color');
  if (color && color === 'white') {
    document.documentElement.setAttribute('color', 'white');
    const element = document.getElementsByClassName('fa-moon-o')[0];
    element.classList.remove('fa-moon-o');
    element.classList.add('fa-sun-o');
  }

  const fontSize = localStorage.getItem('font');
  if (fontSize && document.body.offsetWidth > 768) {
    $(document.body).css({ fontSize });
  }

  tippy('[data-tippy-content]');
})();

(() => {
  window.main = $('#main-textarea');
  const socket = io();
  const charCount = $('#charCount');
  const wordCount = $('#wordCount');
  const corrections = $('#corrections');
  const wordList = $('.dropdown-words');
  const contextMenu = new ContextMenu();
  const txtHistory = new UndoRedoJs(5);
  const doneTypingInterval = 1000;
  let addedWords = [];
  let optionUsed = false;
  let pageFontSize;
  let typingTimer;
  let fontSize;

  socket.on('checked', (check) => {
    const checkLowered = check.map((f) => f.toLowerCase());
    const indexes = addedWords
      .map((f) => checkLowered.indexOf(f))
      .filter((f) => f !== -1);
    for (const index of indexes) {
      check.splice(index, 1);
    }

    window.main.highlightWithinTextarea(check);
    if (check.length > 0) {
      corrections.css({
        backgroundColor: 'darkred',
      });
    } else {
      corrections.css({
        backgroundColor: 'darkmagenta',
      });
    }
    corrections.html(check.length);
  });

  socket.on('string-similarity', (matches) => {
    contextMenu.createMenu(matches);
  });

  window.openTextChecker = ({ originalEvent, target }) => {
    originalEvent.preventDefault();
    contextMenu.parameters = {
      left: originalEvent.pageX,
      top: originalEvent.pageY,
      word:
        target.innerText.length === 0
          ? target.parentElement.innerText
          : target.innerText,
    };
    socket.emit('similarity', contextMenu.parameters.word);
    return false;
  };

  function addWordToDiv(word) {
    const li = $('<li></li>');
    li.append(document.createTextNode(word));
    const i = $('<i></i>');
    i.addClass('fa fa-times');
    i.on('click', ({ target }) => {
      addedWords.splice(
        addedWords.indexOf((f) => f === target.parentElement.innerText),
        1,
      );
      li.remove();
      if (addedWords.length === 0) {
        wordList.html('');
        wordList.append('<li>No words added</li>');
      }
      localStorage.setItem('added', JSON.stringify(addedWords));
      window.checkText();
    });
    li.append(i);
    wordList.append(li);
  }

  window.addWord = (word) => {
    word = word.toLowerCase();
    addedWords.push(word);
    if (addedWords.length === 1) {
      wordList.html('');
    }
    addWordToDiv(word);

    localStorage.setItem('added', JSON.stringify(addedWords));
    window.checkText();
  };

  window.checkText = () => {
    const value = window.fixHtml(window.main.contents());
    const current = txtHistory.current();
    if (current !== value) {
      // Check for pastes, auto corrects..
      if (
        value.length - current.length > 2 ||
        value.length - current.length < -2 ||
        value.length - current.length === 0
      ) {
        // Record the textarea value and force to bypass cooldown
        txtHistory.record(value, true);
        // Check for single key press, single character paste..
      } else {
        // Record the textarea value
        txtHistory.record(value);
      }
    }

    socket.emit('check', window.main.text());
  };

  window.main.on('click', () => {
    if (contextMenu.menuVisible) {
      contextMenu.toggleMenu(false);
    }
  });

  window.main.on('input', () => {
    clearTimeout(typingTimer);
    if (fontSize) {
      fixFontSize();
    }
    if (!corrections.html().includes('div')) {
      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
    }
    const value = window.main.text();
    charCount.html(value.length);
    wordCount.html(value.split(' ').filter((f) => f !== '').length);

    if (value.length === 0) {
      window.main.html('');
    }

    if (!optionUsed) {
      const timerMultiplier = Math.pow(Math.log10(value.length), 0.75);
      typingTimer = setTimeout(
        () => window.checkText(),
        (timerMultiplier > 1 ? timerMultiplier : 1) * doneTypingInterval,
      );
    } else {
      window.checkText();
      optionUsed = false;
    }
  });

  setTimeout(() => {
    const value = window.fixHtml(window.main.contents());
    const current = txtHistory.current();
    if (value !== current) {
      txtHistory.record(value, true);

      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
      window.main.html(current);
    }

    const words = localStorage.getItem('added');
    if (words && words !== '[]') {
      addedWords = JSON.parse(words);
      for (const word of addedWords) {
        addWordToDiv(word);
      }
    } else {
      wordList.html('');
      wordList.append('<li>No words added</li>');
    }

    pageFontSize = parseFloat(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue('font-size'),
    );

    window.checkText();
  }, 100);

  function saveText() {
    localStorage.setItem('text', JSON.stringify(txtHistory.stack));
  }

  window.onbeforeunload = saveText;
  window.onblur = saveText;

  $('.help-menu-bg').on('click', () => {
    $('.help-menu-bg').hide();
  });
})();
