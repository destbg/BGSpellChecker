window.fixHtml = (elements) => {
  let input = '';
  for (const elem of elements) {
    const type = elem.localName;
    if (type && type !== 'br') {
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
      const newLines =
        input.slice(0, index).length -
        input.slice(0, index).replace(/\n/g, '').length;
      ranges.push([index - newLines, index + str.length - newLines]);
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
  const main = $('#main-textarea');
  const socket = io();
  const charCount = $('#charCount');
  const wordCount = $('#wordCount');
  const corrections = $('#corrections');
  const wordList = $('#addedWords');
  const colorPicker = AColorPicker.from('.picker');
  const contextMenu = new ContextMenu();
  const txtHistory = new UndoRedoJs(5);
  const doneTypingInterval = 1000;
  let addedWords = [];
  let optionUsed = false;
  let typingTimer;
  let pageFontSize;
  let fontSize;

  socket.on('checked', (check) => {
    const checkLowered = check.map((f) => f.toLowerCase());
    const indexes = addedWords
      .map((f) => checkLowered.indexOf(f))
      .filter((f) => f !== -1);
    for (const index of indexes) {
      check.splice(index, 1);
    }

    main.highlightWithinTextarea(check);
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
          ? target.parentElement.innerText.trim()
          : target.innerText.trim(),
    };
    socket.emit('similarity', contextMenu.parameters.word);
    return false;
  };

  window.replaceWord = (word, replace) => {
    const ranges = window.getStringRanges(
      main.get(0).innerText.toLowerCase(),
      word,
    );
    const mainElem = main.get(0);
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
        wordList.html('<li>No words added</li>');
      }
      localStorage.setItem('added', JSON.stringify(addedWords));
      checkText();
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
    checkText();
  };

  function checkText() {
    const value = window.fixHtml(main.contents());
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

    socket.emit('check', main.get(0).innerText);
  }

  main.on('click', () => {
    if (contextMenu.menuVisible) {
      contextMenu.toggleMenu(false);
    }
  });

  main.on('input', () => {
    clearTimeout(typingTimer);
    if (fontSize) {
      fixFontSize();
    }
    if (!corrections.html().includes('div')) {
      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
    }

    if (main.text().length === 0) {
      main.html('');
    }

    const value = main.get(0).innerText;
    charCount.html(value.length);
    wordCount.html(value.split(' ').filter((f) => f !== '').length);

    if (!optionUsed) {
      const timerMultiplier = Math.pow(Math.log10(value.length), 0.75);
      typingTimer = setTimeout(
        () => checkText(),
        (timerMultiplier > 1 ? timerMultiplier : 1) * doneTypingInterval,
      );
    } else {
      checkText();
      optionUsed = false;
    }
  });

  setTimeout(() => {
    main.highlightWithinTextarea([]);

    const value = window.fixHtml(main.contents());
    const current = txtHistory.current();
    if (value !== current) {
      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
      main.html(
        current.replace(new RegExp('<div></div>', 'g'), '<div><br></div>'),
      );
    }

    const words = localStorage.getItem('added');
    if (words && words !== '[]') {
      addedWords = JSON.parse(words);
      for (const word of addedWords) {
        addWordToDiv(word);
      }
    } else {
      wordList.html('<li>No words added</li>');
    }

    checkText();
  }, 100);

  function saveText() {
    localStorage.setItem('text', JSON.stringify(txtHistory.stack));
  }

  window.onbeforeunload = () => saveText();
  window.onblur = () => saveText();

  function changeFontWithinTextarea(size) {
    const selection = document.getSelection();
    const parent = selection.focusNode.parentElement;
    const selectionType = selection.type;
    document.execCommand('fontSize', false, 1);
    if (parent.localName === 'font') {
      fontSize = parseFloat(parent.style.fontSize.replace('px', '')) + size;
    } else {
      fontSize =
        parseFloat(
          window
            .getComputedStyle(document.body, null)
            .getPropertyValue('font-size'),
        ) + size;
    }
    if (selectionType === 'Range') {
      fixFontSize();
    }
    main.focus();
  }

  function fixFontSize() {
    for (const font of main.find('font')) {
      if (font.hasAttribute('size')) {
        font.removeAttribute('size');
        font.style.fontSize = fontSize + 'px';
      }
    }
    fontSize = undefined;
  }

  $('#textFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) return;

      const html =
        '<div>' +
        reader.result
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r\n/gm, '</div><div>')
          .replace(/\n/gm, '</div><div>')
          .replace(new RegExp('<div></div>', 'g'), '<div><br></div>') +
        '</div>';

      main.html(html);

      optionUsed = true;
      main.get(0).dispatchEvent(new Event('input'));
    };
    reader.readAsText(event.target.files[0]);
  });

  $('#syntaxFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) return;

      const html = DOMPurify.sanitize(
        decodeURIComponent(escape(window.atob(reader.result))).replace(
          new RegExp('<div></div>', 'g'),
          '<div><br></div>',
        ),
        {
          ALLOWED_TAGS: ['div', 'font', 'b', 'u', 'i', 'strike'],
          ALLOWED_ATTR: ['style', 'color'],
        },
      );

      main.html(html);

      optionUsed = true;
      main.get(0).dispatchEvent(new Event('input'));
    };
    reader.readAsText(event.target.files[0]);
  });

  $('#saveText').on('click', () => {
    const text = main.get(0).innerText.replace(/\n/g, '\r\n').trim();
    const blob = new Blob([text], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.download = 'text-file.txt';
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = '_blank';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  $('#saveSyntax').on('click', () => {
    const text = btoa(
      unescape(encodeURIComponent(window.fixHtml(main.contents()))),
    );
    const blob = new Blob([text], { type: 'text/plain' });
    const anchor = document.createElement('a');
    anchor.download = 'syntax-file.bgnote';
    anchor.href = window.URL.createObjectURL(blob);
    anchor.target = '_blank';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  });

  $('button[data-tippy-content="Undo"]').on('click', () => {
    if (txtHistory.undo(true) !== undefined) {
      main.html(
        txtHistory
          .undo()
          .replace(new RegExp('<div></div>', 'g'), '<div><br></div>'),
      );
      socket.emit('check', main.get(0).innerText);
    }
  });

  $('button[data-tippy-content="Redo"]').on('click', () => {
    if (txtHistory.redo(true) !== undefined) {
      main.html(
        txtHistory
          .redo()
          .replace(new RegExp('<div></div>', 'g'), '<div><br></div>'),
      );
      socket.emit('check', main.get(0).innerText);
    }
  });

  $('button[data-tippy-content="Zoom in"]').on('click', () => {
    optionUsed = true;
    changeFontWithinTextarea(4);
  });

  $('button[data-tippy-content="Zoom out"]').on('click', () => {
    optionUsed = true;
    changeFontWithinTextarea(-4);
  });

  wordList.children('li').on('click', ({ target }) => {
    $(document.body).css({ fontSize: target.innerHTML + 'px' });
    const font = parseFloat(
      window
        .getComputedStyle(document.body, null)
        .getPropertyValue('font-size'),
    );
    localStorage.setItem('font', font + 'px');
    const children = main.find('font');
    if (children.length > 0) {
      optionUsed = true;
      children.css({
        fontSize:
          pageFontSize - font > 0
            ? `+=${font - pageFontSize}px`
            : `-=${pageFontSize - font}px`,
      });
    }
    if (fontSize) {
      fontSize += font - pageFontSize;
    }
    pageFontSize = font;
  });

  $('button[data-tippy-content="Change text color"]').on('click', () => {
    document.execCommand('foreColor', false, colorPicker[0].rgbhex);
  });

  colorPicker.on('change', (picker) => {
    document.execCommand('foreColor', false, picker.rgbhex);
  });

  $('button[data-tippy-content="Bold"]').on('click', () => {
    optionUsed = true;
    document.execCommand('bold', false, null);
    main.focus();
  });

  $('button[data-tippy-content="Italic"]').on('click', () => {
    optionUsed = true;
    document.execCommand('italic', false, null);
    main.focus();
  });

  $('button[data-tippy-content="Underline"]').on('click', () => {
    optionUsed = true;
    document.execCommand('underline', false, null);
    main.focus();
  });

  $('button[data-tippy-content="StrikeThrough"]').on('click', () => {
    optionUsed = true;
    document.execCommand('strikeThrough', false, null);
    main.focus();
  });

  $('button[data-tippy-content="Color"]').on('click', () => {
    let elements = document.getElementsByClassName('fa-moon-o');
    if (elements.length === 0) {
      document.documentElement.setAttribute('color', 'dark');
      elements = document.getElementsByClassName('fa-sun-o');
      const element = elements[0];
      element.classList.remove('fa-sun-o');
      element.classList.add('fa-moon-o');
      localStorage.setItem('color', 'dark');
    } else {
      document.documentElement.setAttribute('color', 'white');
      const element = elements[0];
      element.classList.remove('fa-moon-o');
      element.classList.add('fa-sun-o');
      localStorage.setItem('color', 'white');
    }
  });

  $('button[data-tippy-content="Help"]').on('click', () => {
    $('.help-menu-bg').show();
  });

  $('.help-menu-bg').on('click', () => {
    $('.help-menu-bg').hide();
  });
})();
