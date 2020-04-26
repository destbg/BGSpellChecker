(() => {
  const main = $('#main-textarea');
  const charCount = $('#charCount');
  const wordCount = $('#wordCount');
  const corrections = $('#corrections');
  const spell = new SpellChecker();
  const txtHistory = new UndoRedoJs(5);
  const doneTypingInterval = 3 * 1000;
  let typingTimer;

  window.replaceWord = (word, replace) => {
    main.val(main.val().replace(word, replace));
    checkText();
  };

  function checkText() {
    const value = main.val();
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
    const check = spell.checkText(main.val());
    main.highlightWithinTextarea(check);
    if (check.length > 0) {
      corrections.css({ backgroundColor: 'darkred' });
    } else {
      corrections.css({ backgroundColor: 'darkmagenta' });
    }
    corrections.html(check.length);
  }

  function userTyping() {
    clearTimeout(typingTimer);
    if (!corrections.html().includes('div')) {
      corrections.css({ backgroundColor: 'darkmagenta' });
      corrections.html('<div class="loader"></div>');
    }
  }

  main.on('keyup', () => {
    userTyping();
    typingTimer = setTimeout(() => checkText(), doneTypingInterval);
  });

  main.on('keydown', () => {
    userTyping();
  });

  main.on('input', () => {
    const value = main.val();
    charCount.html(value.length);
    wordCount.html(value.split(' ').filter((f) => f !== '').length);
  });

  setTimeout(() => {
    const value = main.val();
    if (value) {
      txtHistory.record(value, true);
    }
  }, 100);

  (() => {
    const fontSize = localStorage.getItem('font');
    if (fontSize && document.body.offsetWidth > 768) {
      $(document.body).css({ fontSize });
    }

    const request = new XMLHttpRequest();
    request.open('GET', window.location.origin + '/words', true);
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        window.allWords = JSON.parse(request.response);
        $('.loading-bar').remove();
        checkText();
      }
    };
    request.send(null);
  })();

  function saveFont() {
    const fontSize =
      parseFloat(
        window
          .getComputedStyle(document.body, null)
          .getPropertyValue('font-size'),
      ) + 1;
    localStorage.setItem('font', fontSize + 'px');
  }

  $('#newFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      main.val(reader.result);
      checkText();
    };
    reader.readAsText(event.target.files[0]);
  });

  $('button[title="Save"]').on('click', () => {
    const text = main.val();
    text = text.replace(/\n/g, '\r\n'); // To retain the Line breaks.
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
      main.val(txtHistory.undo());
      checkText();
    }
  });

  $('button[title="Redo"]').on('click', () => {
    if (txtHistory.redo(true) !== undefined) {
      main.val(txtHistory.redo());
      checkText();
    }
  });

  $('button[title="Zoom In"]').on('click', () => {
    $(document.body).css({ fontSize: '+=1px' });
    saveFont();
  });

  $('button[title="Zoom Out"]').on('click', () => {
    $(document.body).css({ fontSize: '-=1px' });
    saveFont();
  });
})();
