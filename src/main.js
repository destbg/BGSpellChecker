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
  const main = $('#main-textarea');
  const socket = io();
  const charCount = $('#charCount');
  const wordCount = $('#wordCount');
  const corrections = $('#corrections');
  const wordList = $('#addedWords');
  const colorPicker = AColorPicker.from('.picker');
  const contextMenu = new ContextMenu();
  const doneTypingInterval = 1000;
  let summernoteEditor;
  let addedWords = [];
  let optionUsed = false;
  let typingTimer;

  tippy('[data-tippy-content]');
  main.summernote({
    spellCheck: false,
    disableGrammar: true,
    disableDragAndDrop: true,
    placeholder: 'Type here...',
    tabsize: 2,
    toolbar: [],
  });

  $('.note-statusbar').remove();
  main.summernote('focus');

  socket.on('checked', (check) => {
    const checkLowered = check.map((f) => f.toLowerCase());
    const indexes = addedWords
      .map((f) => checkLowered.indexOf(f))
      .filter((f) => f !== -1);
    indexes.sort((a, b) => b - a);
    for (const index of indexes) {
      check.splice(index, 1);
    }

    main.summernote('saveRange');
    main.highlightWithinTextarea(
      check,
      $('<div>' + main.summernote('code') + '</div>')
        .get(0)
        .innerText.trim(),
      main.summernote('code'),
    );
    main.summernote('restoreRange');

    corrections.css({
      backgroundColor: check.length > 0 ? 'darkred' : 'darkmagenta',
    });
    corrections.html(check.length);
  });

  socket.on('string-similarity', (matches) => {
    contextMenu.createMenu(matches);
  });

  function textChanged() {
    clearTimeout(typingTimer);
    if (!corrections.html().includes('div')) {
      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
    }

    const text = main
      .summernote('code')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\/?>/gi, '\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
    charCount.html(text.length);
    wordCount.html(text.split(' ').filter((f) => f !== '').length);

    if (!optionUsed) {
      const timerMultiplier = Math.pow(Math.log10(text.length), 0.65);
      typingTimer = setTimeout(
        () => socket.emit('check', text),
        (timerMultiplier > 1 ? timerMultiplier : 1) * doneTypingInterval,
      );
    } else {
      socket.emit('check', text);
      optionUsed = false;
    }
  }

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
      textChanged();
    });
    li.append(i);
    wordList.append(li);
  }

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

  window.addWord = (word) => {
    word = word.toLowerCase();
    addedWords.push(word);
    if (addedWords.length === 1) {
      wordList.html('');
    }
    addWordToDiv(word);

    localStorage.setItem('added', JSON.stringify(addedWords));
    textChanged();
  };

  window.replaceWord = (word, replace) => {
    const ranges = window.getStringRanges(
      $('<div>' + main.summernote('code') + '</div>')
        .get(0)
        .innerText.trim(),
      word,
    );
    replace =
      word[0] === word[0].toUpperCase()
        ? replace[0].toUpperCase() + replace.slice(1)
        : replace;

    main.summernote('saveRange');
    ranges.forEach((range) => {
      const startPos = window.getTextNodeAtPosition(summernoteEditor, range[0]);
      const endPos = window.getTextNodeAtPosition(summernoteEditor, range[1]);
      const sumRange = $.summernote.range.create(
        startPos.node,
        startPos.position,
        endPos.node,
        endPos.position,
      );
      sumRange.pasteHTML(replace);
    });
    main.summernote('restoreRange');

    optionUsed = true;
    textChanged();
  };

  main.on('summernote.focus', () => {
    if (contextMenu.menuVisible) {
      contextMenu.toggleMenu(false);
    }
  });

  main.on('summernote.change', () => {
    textChanged();
  });

  setTimeout(() => {
    main.highlightWithinTextarea([]);
    summernoteEditor = $('.note-editable').get(0);

    const color = localStorage.getItem('color');
    if (color && color === 'white') {
      document.documentElement.setAttribute('color', 'white');
      const element = document.getElementsByClassName('fa-moon-o')[0];
      element.classList.remove('fa-moon-o');
      element.classList.add('fa-sun-o');
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

    optionUsed = true;
    textChanged();
  }, 100);

  $('#textFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) return;

      const html =
        '<p>' +
        reader.result
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\r\n/gm, '</p><p>')
          .replace(/\n/gm, '</p><p>') +
        '</p>';

      main.summernote('code', html);

      optionUsed = true;
      textChanged();
    };
    reader.readAsText(event.target.files[0]);
  });

  $('#syntaxFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!reader.result) return;

      const html = DOMPurify.sanitize(
        decodeURIComponent(escape(window.atob(reader.result))),
        {
          ALLOWED_TAGS: ['div', 'font', 'b', 'u', 'i', 'strike'],
          ALLOWED_ATTR: ['style', 'color'],
        },
      );

      main.summernote('code', html);

      optionUsed = true;
      textChanged();
    };
    reader.readAsText(event.target.files[0]);
  });

  $('#saveText').on('click', () => {
    const text = main
      .summernote('code')
      .replace(/<\/p>/gi, '\r\n')
      .replace(/<br\/?>/gi, '\r\n')
      .replace(/<\/?[^>]+(>|$)/g, '')
      .trim();
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
    const text = btoa(unescape(encodeURIComponent(main.summernote('code'))));
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
    main.summernote('undo');
  });

  $('button[data-tippy-content="Redo"]').on('click', () => {
    main.summernote('redo');
  });

  $('#fontStyle')
    .children('li')
    .on('click', ({ target }) => {
      switch (target.localName) {
        case 'p':
          main.summernote('formatPara');
          break;
        case 'blockquote':
          main.summernote('editor.formatBlock', 'blockquote');
          break;
        case 'h1':
          main.summernote('formatH1');
          break;
        case 'h2':
          main.summernote('formatH2');
          break;
        case 'h3':
          main.summernote('formatH3');
          break;
        case 'h4':
          main.summernote('formatH4');
          break;
        case 'h5':
          main.summernote('formatH5');
          break;
        case 'h6':
          main.summernote('formatH6');
          break;
      }
    });

  $('#fontSize')
    .children('li')
    .on('click', ({ target }) => {
      main.summernote('fontSize', parseInt(target.innerHTML));
    });

  $('button[data-tippy-content="Change text color"]').on('click', () => {
    main.summernote('foreColor', colorPicker[0].rgbhex);
  });

  colorPicker.on('change', (picker) => {
    main.summernote('foreColor', picker.rgbhex);
  });

  $('button[data-tippy-content="Bold"]').on('click', () => {
    main.summernote('bold');
  });

  $('button[data-tippy-content="Italic"]').on('click', () => {
    main.summernote('italic');
  });

  $('button[data-tippy-content="Underline"]').on('click', () => {
    main.summernote('underline');
  });

  $('button[data-tippy-content="StrikeThrough"]').on('click', () => {
    main.summernote('strikethrough');
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
