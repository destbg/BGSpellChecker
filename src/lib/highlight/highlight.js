(function ($) {
  const ID = 'hwt';

  class HighlightWithinTextarea {
    constructor($el, config) {
      this.$el = $el;
      this.highlight = config;
      this.$el
        .addClass(ID + '-input ' + ID + '-content')
        .on('scroll.' + ID, this.handleScroll.bind(this));

      this.$highlights = $('<div>', {
        class: ID + '-highlights ' + ID + '-content',
      });

      this.$backdrop = $('<div>', { class: ID + '-backdrop' }).append(
        this.$highlights,
      );

      this.$container = $('<div>', { class: ID + '-container' })
        .insertAfter(this.$el)
        .append(this.$backdrop, this.$el) // moves $el into $container
        .on('scroll', this.blockContainerScroll.bind(this));

      // plugin function checks this for success
      this.isGenerated = true;
    }

    handleInput() {
      const input = this.$el.get(0).innerText.toLowerCase();
      if (input.length === 0) {
        this.$highlights.html('');
        return;
      }
      const ranges = this.getRanges(input, this.highlight);
      ranges.sort((a, b) => b[0] - a[0]);
      const position = this.saveCaretPosition();
      this.renderMarks(ranges);
      this.restoreCaretPosition(position);
      this.handleScroll();
    }

    getRanges(input, highlight) {
      let ranges = highlight.map(window.getStringRanges.bind(this, input));
      ranges = Array.prototype.concat.apply([], ranges);
      return ranges.filter(
        (value, index) => ranges.findIndex((f) => f[0] === value[0]) === index,
      );
    }

    renderMarks(ranges) {
      this.$highlights.html(window.fixHtml(this.$el.contents()));
      const highlightsElem = this.$highlights.get(0);
      const selection = document.getSelection();
      ranges.forEach((range) => {
        const startPos = window.getTextNodeAtPosition(highlightsElem, range[0]);
        selection.removeAllRanges();
        let docRange = new Range();
        docRange.setStart(startPos.node, startPos.position);
        selection.addRange(docRange);
        const span = document.createElement('span');
        span.append(document.createElement('h'));
        docRange.insertNode(span);
        const endPos = window.getTextNodeAtPosition(highlightsElem, range[1]);
        selection.removeAllRanges();
        docRange = new Range();
        docRange.setStart(endPos.node, endPos.position);
        selection.addRange(docRange);
        docRange.insertNode(document.createElement('span'));
      });

      this.$highlights.html(
        window
          .fixHtml(this.$highlights.contents())
          .replace(new RegExp('<span><h></h></span>', 'g'), '<span><h></h>')
          .replace(new RegExp('<span></span>', 'g'), '</span>'),
      );

      this.$highlights.find('span').on('click', (ev) => {
        return window.openTextChecker(ev);
      });
    }

    saveCaretPosition() {
      try {
        const selection = document.getSelection();
        const range = selection.getRangeAt(0);
        range.setStart(this.$el.get(0), 0);
        return range.toString().length;
      } catch (err) {
        return undefined;
      }
    }

    restoreCaretPosition(position) {
      if (!position) {
        return;
      }
      const selection = document.getSelection();
      const pos = window.getTextNodeAtPosition(this.$el.get(0), position);
      selection.removeAllRanges();
      const range = new Range();
      range.setStart(pos.node, pos.position);
      selection.addRange(range);
    }

    handleScroll() {
      this.$backdrop.scrollTop(this.$el.scrollTop());
    }

    blockContainerScroll() {
      this.$container.scrollLeft(0);
    }
  }

  // register the jQuery plugin
  $.fn.highlightWithinTextarea = function (options) {
    return this.each(function () {
      const $this = $(this);
      let plugin = $this.data(ID);

      if (plugin && plugin.isGenerated) {
        plugin.highlight = options;
        plugin.handleInput();
      } else {
        plugin = new HighlightWithinTextarea($this, options);
        if (plugin.isGenerated) {
          $this.data(ID, plugin);
        }
      }
    });
  };
})(jQuery);
