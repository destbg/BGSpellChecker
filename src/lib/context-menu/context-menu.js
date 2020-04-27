window.openTextChecker = ({ originalEvent, target }) => {
  originalEvent.preventDefault();
  setPosition(
    {
      left: originalEvent.pageX,
      top: originalEvent.pageY,
    },
    target.innerText,
  );
  return false;
};

let menuDiv;
let menuVisible = false;

function toggleMenu(command) {
  if (!command && menuDiv) {
    menuDiv.remove();
    menuDiv = undefined;
  }
  menuVisible = !menuVisible;
}

function checkIfOutOfScreen() {
  const pos = menuDiv.get(0).getBoundingClientRect();
  if (pos.bottom > window.innerHeight) {
    menuDiv.css({ top: `${pos.y - (pos.bottom - window.innerHeight)}px` });
  } else if (pos.right > window.innerWidth) {
    menuDiv.css({ left: `${pos.x - (pos.right - window.innerWidth)}px` });
  }
}

function setPosition({ top, left }, word) {
  if (menuVisible && menuDiv) {
    menuDiv.remove();
    menuDiv = undefined;
  }
  createMenu(word);
  menuDiv.css({ left: `${left}px`, top: `${top}px` });
  checkIfOutOfScreen();
  toggleMenu(true);
}

function createMenu(word) {
  menuDiv = $('<div></div>');

  menuDiv.addClass('menu');

  const list = $('<ul></ul>');
  list.addClass('menu-options');

  const ratings = findBestMatch(word);
  for (let i = 0; i < ratings.length && i < 9; i++) {
    const listItem = $('<li></li>');
    listItem.html(ratings[i].target);
    listItem.addClass('menu-option');
    listItem.on('click', () => {
      window.replaceWord(word, ratings[i].target);
      toggleMenu(false);
    });
    list.append(listItem);
  }

  const addItem = $('<li></li>');
  addItem.html('Добави думата');
  addItem.addClass('menu-option menu-add-option');
  addItem.on('click', () => {
    window.addWord(word);
    toggleMenu(false);
  });
  list.append(addItem);

  menuDiv.append(list);

  $(document.body).append(menuDiv);
}

$('#main-textarea').on('click', () => {
  if (menuVisible) {
    toggleMenu(false);
  }
});
