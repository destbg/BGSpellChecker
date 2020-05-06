(() => {
  const optionsList = $('#optionsList');
  const optionRight = $('#optionRight');
  const optionLeft = $('#optionLeft');
  let optionsPage = 0;

  function optionsMenu() {
    for (const li of optionsList.children()) {
      li.classList.remove('hide');
    }

    if (optionsPage === 0) {
      optionLeft.addClass('disabled');
    } else {
      optionLeft.removeClass('disabled');
    }

    optionsList.removeClass('options-flex');
    const pages = Math.floor(optionsList.prop('clientHeight') / 50);
    if (pages === 1) {
      optionLeft.addClass('hide');
      optionRight.addClass('hide');
    } else {
      optionLeft.removeClass('hide');
      optionRight.removeClass('hide');
      optionsList.addClass('options-flex');
    }

    if (pages <= optionsPage) {
      optionsPage = pages - 1;
    }

    if (optionsPage === pages - 1) {
      optionRight.addClass('disabled');
    } else {
      optionRight.removeClass('disabled');
    }

    let visible = Math.floor(optionsList.prop('clientWidth') / 66);
    if (visible === optionsList.prop('clientWidth') / 66) {
      visible--;
    }

    const children = optionsList.children();
    for (let i = 0; i < children.length; i++) {
      const li = children[i];
      if (i >= optionsPage * visible && i < (optionsPage + 1) * visible) {
        li.classList.remove('hide');
      } else {
        li.classList.add('hide');
      }
    }
  }

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
    window.main.focus();
  }

  function fixFontSize() {
    for (const font of window.main.find('font')) {
      if (!font.hasAttribute('style')) {
        font.removeAttribute('size');
        font.style.fontSize = fontSize + 'px';
      }
    }
    fontSize = undefined;
  }

  optionLeft.on('click', () => {
    optionsPage--;
    if (optionsPage < 0) {
      optionsPage = 0;
    }
    optionsMenu();
  });

  optionRight.on('click', () => {
    optionsPage++;
    optionsMenu();
  });

  window.onresize = () => optionsMenu();

  optionsMenu();

  AColorPicker.from('.picker').on('change', (picker) => {
    document.execCommand('foreColor', false, picker.rgbhex);
  });

  $('#newFile').on('change', (event) => {
    const reader = new FileReader();
    reader.onload = () => {
      window.main.html(
        reader.result.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      );
      if (reader.result) {
        txtHistory.record(reader.result, true);

        corrections.css({ backgroundColor: 'darkmagenta' });
        corrections.html('<div class="loader"></div>');
      }

      window.checkText();
    };
    reader.readAsText(event.target.files[0]);
  });

  $('button[data-tippy-content="Save"]').on('click', () => {
    const text = window.main.text().replace(/\n/g, '\r\n'); // To retain the Line breaks.
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

  $('button[data-tippy-content="Undo"]').on('click', () => {
    if (txtHistory.undo(true) !== undefined) {
      window.main.html(txtHistory.undo());
      window.checkText();
    }
  });

  $('button[data-tippy-content="Redo"]').on('click', () => {
    if (txtHistory.redo(true) !== undefined) {
      window.main.html(txtHistory.redo());
      window.checkText();
    }
  });

  $('.dropdown-content')
    .children('li')
    .on('click', ({ target }) => {
      $(document.body).css({ fontSize: target.innerHTML + 'px' });
      const font = parseFloat(
        window
          .getComputedStyle(document.body, null)
          .getPropertyValue('font-size'),
      );
      localStorage.setItem('font', font + 'px');
      const children = window.main.find('font');
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

  $('button[data-tippy-content="Zoom In"]').on('click', () => {
    optionUsed = true;
    changeFontWithinTextarea(4);
  });

  $('button[data-tippy-content="Zoom Out"]').on('click', () => {
    optionUsed = true;
    changeFontWithinTextarea(-4);
  });

  $('button[data-tippy-content="Bold"]').on('click', () => {
    optionUsed = true;
    document.execCommand('bold', false, null);
    window.main.focus();
  });

  $('button[data-tippy-content="Italic"]').on('click', () => {
    optionUsed = true;
    document.execCommand('italic', false, null);
    window.main.focus();
  });

  $('button[data-tippy-content="Underline"]').on('click', () => {
    optionUsed = true;
    document.execCommand('underline', false, null);
    window.main.focus();
  });

  $('button[data-tippy-content="StrikeThrough"]').on('click', () => {
    optionUsed = true;
    document.execCommand('strikeThrough', false, null);
    window.main.focus();
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
})();
