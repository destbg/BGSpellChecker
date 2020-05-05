class ContextMenu {
  toggleMenu(command) {
    if (!command && this.menuDiv) {
      this.menuDiv.remove();
      this.menuDiv = undefined;
    }
    this.menuVisible = command;
  }

  checkIfOutOfScreen() {
    const pos = this.menuDiv.get(0).getBoundingClientRect();
    if (pos.bottom > window.innerHeight) {
      this.menuDiv.css({
        top: `${pos.y - (pos.bottom - window.innerHeight)}px`,
      });
    } else if (pos.right > window.innerWidth) {
      this.menuDiv.css({
        left: `${pos.x - (pos.right - window.innerWidth)}px`,
      });
    }
  }

  createMenu(matches) {
    if (this.menuVisible && this.menuDiv) {
      this.menuDiv.remove();
      this.menuDiv = undefined;
    }

    this.menuDiv = $('<div></div>');
    this.menuDiv.addClass('menu');

    const list = $('<ul></ul>');
    list.addClass('menu-options');

    for (let i = 0; i < matches.length; i++) {
      const listItem = $('<li></li>');
      listItem.html(matches[i].target);
      listItem.addClass('menu-option option-hover');
      listItem.on('click', () => {
        window.replaceWord(this.parameters.word, matches[i].target);
        this.toggleMenu(false);
      });
      list.append(listItem);
    }

    if (matches.length === 0) {
      const listItem = $('<li></li>');
      listItem.html('No matches found');
      listItem.addClass('menu-option');
      listItem.on('click', () => {
        this.toggleMenu(false);
      });
      list.append(listItem);
    } else {
      const listItem = $('<li></li>');
      listItem.html('Add word');
      listItem.addClass('menu-option menu-add-option');
      listItem.on('click', () => {
        this.toggleMenu(false);
        window.addWord(this.parameters.word);
      });
      list.append(listItem);
    }

    this.menuDiv.append(list);

    $(document.body).append(this.menuDiv);
    this.menuDiv.css({
      left: `${this.parameters.left}px`,
      top: `${this.parameters.top}px`,
    });
    this.checkIfOutOfScreen();
    this.toggleMenu(true);
  }
}
