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
})();
