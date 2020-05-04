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

      // trigger input event to highlight any existing input
      this.handleInput();
    }

    handleInput() {
      const input = this.$el.text().toLowerCase();
      if (input.length === 0) {
        this.$highlights.html('');
        return;
      }
      const ranges = this.getRanges(input, this.highlight);
      this.renderMarks(ranges);
      this.handleScroll();
    }

    getRanges(input, highlight) {
      const ranges = highlight.map(window.getStringRanges.bind(this, input));
      return Array.prototype.concat.apply([], ranges);
    }

    renderMarks(ranges) {
      let input = window.fixHtml(this.$el.contents());
      const markStart = '<span><h></h>';
      const markEnd = '</span>';
      ranges.forEach((range) => {
        let length = 0;
        let index = -1;
        while (
          ((index = input.indexOf('<', index + 1)),
          index !== -1 && range[0] + length >= index)
        ) {
          length += input.slice(index, input.indexOf('>', index) + 1).length;
        }

        input =
          input.slice(0, range[0] + length) +
          markStart +
          input.slice(range[0] + length);

        length += markStart.length;

        if (index < range[0] + length) {
          index = range[0] + length;
        }

        while (
          ((index = input.indexOf('<', index + 1)),
          index !== -1 && range[1] + length >= index)
        ) {
          length += input.slice(index, input.indexOf('>', index) + 1).length;
        }

        input =
          input.slice(0, range[1] + length) +
          markEnd +
          input.slice(range[1] + length);
      });

      this.$highlights.html(input);

      this.$highlights.children('span').on('click', (ev) => {
        return window.openTextChecker(ev);
      });
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
