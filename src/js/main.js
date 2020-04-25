(() => {
  const main = $('#main-textarea');
  const spell = new SpellChecker();
  const txtHistory = new UndoRedoJs(5);
  const doneTypingInterval = 1000;
  let typingTimer;

  window.replaceWord = (word, replace) => {
    main.val(main.val().replace(word, replace));
    checkText();
  };

  function checkText() {
    main.highlightWithinTextarea(spell.checkText(main.val()));
  }

  function doneTyping() {
    checkText();
  }

  main.on('keyup', () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(doneTyping, doneTypingInterval);
  });

  main.on('keydown', () => {
    clearTimeout(typingTimer);
  });

  main.on('input', () => {
    const value = main.val();
    if (txtHistory.current() !== value) {
      // Check for pastes, auto corrects..
      if (
        value.length - txtHistory.current().length > 2 ||
        value.length - txtHistory.current().length < -2 ||
        value.length - txtHistory.current().length === 0
      ) {
        // Record the textarea value and force to bypass cooldown
        txtHistory.record(value, true);
        // Check for single key press, single character paste..
      } else {
        // Record the textarea value
        txtHistory.record(value);
      }
    }
  });

  setTimeout(() => {
    const value = main.val();
    if (value) {
      txtHistory.record(value, true);
    }
  }, 100);

  (() => {
    const fontSize = localStorage.getItem('font');
    if (fontSize) {
      $(document.body).css({ fontSize });
    }

    const request = new XMLHttpRequest();
    request.open('GET', window.location.origin + '/words', true);
    request.onreadystatechange = () => {
      if (request.readyState === 4 && request.status === 200) {
        window.allWords = JSON.parse(request.response);
        checkText();
      }
    };
    request.send(null);
  })();

  function saveFont() {
    var fontSize =
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
    var text = main.val();
    text = text.replace(/\n/g, '\r\n'); // To retain the Line breaks.
    var blob = new Blob([text], { type: 'text/plain' });
    var anchor = document.createElement('a');
    anchor.download = 'my-filename.txt';
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
