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
      const input = this.$el.get(0).innerText.toLowerCase();
      if (input.length === 0) {
        this.$highlights.html('');
        return;
      }
      const ranges = this.getRanges(input, this.highlight);
      ranges.sort((a, b) => b[0] - a[0]);
      this.renderMarks(ranges);
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
      let input = window.fixHtml(this.$el.contents());
      const markStart = '<span><h></h>';
      const markEnd = '</span>';
      ranges.forEach((range) => {
        let length = 0;
        let index = -1;
        // go around html tags
        while (
          ((index = input.indexOf('<', index + 1)),
          index !== -1 && range[0] + length >= index)
        ) {
          length += input.indexOf('>', index) - index + 1;
        }

        index = range[0] + length;
        let lengthEnd = length;

        while (
          ((index = input.indexOf('<', index + 1)),
          index !== -1 && range[1] + lengthEnd > index)
        ) {
          lengthEnd += input.indexOf('>', index) - index + 1;
        }

        // insert highlighter around the word
        input =
          input.slice(0, range[0] + length) +
          markStart +
          input.slice(range[0] + length, range[1] + lengthEnd) +
          markEnd +
          input.slice(range[1] + lengthEnd);
      });

      this.$highlights.html(input);

      this.$highlights.find('span').on('click', (ev) => {
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
