window.openTextChecker = ({ originalEvent, target }) => {
  originalEvent.preventDefault();
  setPosition({
    left: originalEvent.pageX,
    top: originalEvent.pageY
  }, target.innerText);
  return false;
};

let menuDiv;
let menuVisible = false;

function toggleMenu(command) {
  if (!command) {
    menuDiv.remove();
    menuDiv = undefined;
  }
  menuVisible = !menuVisible;
}

function setPosition({ top, left }, word) {
  if (menuVisible) {
    menuDiv.remove();
    menuDiv = undefined;
  }
  createMenu(word);
  menuDiv.css({ left: `${left}px`, top: `${top}px` });
  toggleMenu(true);
}

function createMenu(word) {
  menuDiv = $('<div></div>');

  menuDiv.addClass('menu');

  const list = $('<ul></ul>');
  list.addClass('menu-options');

  const ratings = findBestMatch(word);
  for (let i = 0; i < ratings.length && i < 5; i++) {
    const listItem = $('<li></li>');
    listItem.html(ratings[i].target);
    listItem.addClass('menu-option');
    listItem.on('click', () => {
      window.replaceWord(word, ratings[i].target);
      toggleMenu(false);
    });
    list.append(listItem);
  }

  menuDiv.append(list);

  $(document.body).append(menuDiv);
}

$('#main-textarea').on('click', () => {
  if (menuVisible) {
    toggleMenu(false);
  }
});
