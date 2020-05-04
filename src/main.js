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
})();

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

(() => {
  const socket = io();
  const main = $('#main-textarea');
  const charCount = $('#charCount');
  const wordCount = $('#wordCount');
  const corrections = $('#corrections');
  const contextMenu = new ContextMenu(main);
  const txtHistory = new UndoRedoJs(5);
  const doneTypingInterval = 1000;
  let pageFontSize;
  let typingTimer;
  let checkedArr;
  let fontSize;

  function changeText(check) {
    main.highlightWithinTextarea(check);
    if (check.length > 0) {
      corrections.css({ backgroundColor: 'darkred' });
    } else {
      corrections.css({ backgroundColor: 'darkmagenta' });
    }
    corrections.html(check.length);
  }

  socket.on('checked', (check) => {
    checkedArr = check;
    changeText(check);
  });

  socket.on('string-similarity', (matches) => {
    contextMenu.createMenu(matches);
  });

  window.replaceWord = (word, replace) => {
    const ranges = window.getStringRanges(main.text(), word);
    ranges.forEach((range) => {
      const selection = document.getSelection();
      const startPos = window.getTextNodeAtPosition(main.get(0), range[0]);
      const endPos = window.getTextNodeAtPosition(main.get(0), range[1]);
      selection.removeAllRanges();
      const docRange = new Range();
      docRange.setStart(startPos.node, startPos.position);
      docRange.setEnd(endPos.node, endPos.position);
      selection.addRange(docRange);
      document.execCommand('insertHTML', false, replace);
    });
    checkedArr.splice(checkedArr.indexOf(word), 1);
    changeText(checkedArr);
  };

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

  function checkText() {
    const value = main.text();
    const current = txtHistory.current();
    if (current !== value) {
      // Check for pastes, auto corrects..
      if (
        value.length - current.length > 2 ||
        value.length - current.length < -2 ||
        value.length - current.length === 0
      ) {
        // Record the textarea value and force to bypass cooldown
        txtHistory.record(window.fixHtml(main.contents()), true);
        // Check for single key press, single character paste..
      } else {
        // Record the textarea value
        txtHistory.record(window.fixHtml(main.contents()));
      }
    }

    socket.emit('check', main.text());
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
    const value = main.text();
    charCount.html(value.length);
    wordCount.html(value.split(' ').filter((f) => f !== '').length);

    const timerMultiplier = Math.pow(Math.log10(value.length), 0.75);
    typingTimer = setTimeout(
      () => checkText(),
      (timerMultiplier > 1 ? timerMultiplier : 1) * doneTypingInterval,
    );
  });

  setTimeout(() => {
    const value = window.fixHtml(main.contents());
    if (value !== txtHistory.current()) {
      txtHistory.record(value, true);

      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
    } else {
      main.html(txtHistory.current());
    }

    pageFontSize =
      parseFloat(
        window
          .getComputedStyle(document.body, null)
          .getPropertyValue('font-size'),
      ) + 1;

    checkText();
    main.focus();
  }, 100);

  $(document.body).on('unload blur', () => {
    localStorage.setItem('text', JSON.stringify(txtHistory.stack));
  });

  $('#newFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      main.html(reader.result.replace(/</g, '&lt;').replace(/>/g, '&gt;'));
      if (reader.result) {
        txtHistory.record(reader.result, true);

        corrections.css({ backgroundColor: 'darkmagenta' });
        corrections.html('<div class="loader"></div>');
      }

      checkText();
    };
    reader.readAsText(event.target.files[0]);
  });

  $('button[title="Save"]').on('click', () => {
    const text = main.text().replace(/\n/g, '\r\n'); // To retain the Line breaks.
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

  $('button[title="Undo"]').on('click', () => {
    if (txtHistory.undo(true) !== undefined) {
      main.html(txtHistory.undo());
      checkText();
    }
  });

  $('button[title="Redo"]').on('click', () => {
    if (txtHistory.redo(true) !== undefined) {
      main.html(txtHistory.redo());
      checkText();
    }
  });

  $('.dropdown-content')
    .children('li')
    .on('click', ({ target }) => {
      $(document.body).css({ fontSize: target.innerHTML + 'px' });
      const fontSize =
        parseFloat(
          window
            .getComputedStyle(document.body, null)
            .getPropertyValue('font-size'),
        ) + 1;
      localStorage.setItem('font', fontSize + 'px');
      main.children('font').css({
        fontSize:
          pageFontSize - fontSize > 0
            ? `+=${fontSize - pageFontSize}px`
            : `-=${pageFontSize - fontSize}px`,
      });
      pageFontSize = fontSize;
    });

  $('button[title="Zoom In"]').on('click', () => {
    changeFontWithinTextarea(4);
  });

  $('button[title="Zoom Out"]').on('click', () => {
    changeFontWithinTextarea(-4);
  });

  $('button[title="Bold"]').on('click', () => {
    document.execCommand('bold', false, null);
    main.focus();
  });

  $('button[title="Italic"]').on('click', () => {
    document.execCommand('italic', false, null);
    main.focus();
  });

  $('button[title="Underline"]').on('click', () => {
    document.execCommand('underline', false, null);
    main.focus();
  });

  $('button[title="Color"]').on('click', () => {
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

  $('button[title="Help"]').on('click', () => {
    $('.help-menu-bg').show();
  });

  $('.help-menu-bg').on('click', () => {
    $('.help-menu-bg').hide();
  });

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
    for (const font of main.children('font')) {
      if (!font.hasAttribute('style')) {
        font.removeAttribute('size');
        font.style.fontSize = fontSize + 'px';
      }
    }
    fontSize = undefined;
  }
})();
