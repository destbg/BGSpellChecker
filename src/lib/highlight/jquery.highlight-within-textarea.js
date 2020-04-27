/*
 * highlight-within-textarea
 *
 * @author  Will Boyd
 * @github  https://github.com/lonekorean/highlight-within-textarea
 */

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

      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.indexOf('firefox') !== -1) {
        this.fixFirefox();
      } else if (
        !!ua.match(/ipad|iphone|ipod/) &&
        ua.indexOf('windows phone') === -1
      ) {
        this.fixIOS();
      }

      this.isMobile = /Android|webOS|iPhone|iPad|iPod/i.test(
        navigator.userAgent,
      );

      // plugin function checks this for success
      this.isGenerated = true;

      // trigger input event to highlight any existing input
      this.handleInput();
    }

    fixFirefox() {
      this.$highlights.css({
        padding: '0',
        'border-width': '0',
      });
    }

    fixIOS() {
      this.$highlights.css({
        'padding-left': '+=3px',
        'padding-right': '+=3px',
      });
    }

    handleInput() {
      const input = this.$el.val().toLowerCase();
      if (input.length === 0) {
        this.$highlights.html('');
        return;
      }
      const ranges = this.getRanges(input, this.highlight);
      const boundaries = this.getBoundaries(ranges);
      this.renderMarks(boundaries);
      this.handleScroll();
    }

    getRanges(input, highlight) {
      const ranges = highlight.map(this.getStringRanges.bind(this, input));
      return Array.prototype.concat.apply([], ranges);
    }

    getStringRanges(input, string) {
      const ranges = [];
      const str = string.toLowerCase();
      let index = 0;

      while (((index = input.indexOf(str, index)), index !== -1)) {
        if (
          (index <= 0 ||
            input[index - 1].match(
              /[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/,
            )) &&
          (index + str.length >= input.length ||
            input[index + str.length].match(
              /[!"#$%&'()*+,./:;<=>?@[\]^_`{|}~\s\da-zA-Z]/,
            ))
        ) {
          ranges.push([index, index + str.length]);
        }
        index += str.length;
      }
      return ranges;
    }

    getBoundaries(ranges) {
      const boundaries = [];
      ranges.forEach(function (range) {
        boundaries.push({
          type: 'start',
          index: range[0],
        });
        boundaries.push({
          type: 'stop',
          index: range[1],
        });
      });

      boundaries.sort(function (a, b) {
        if (a.index !== b.index) {
          return b.index - a.index;
        } else if (a.type === 'stop' && b.type === 'start') {
          return 1;
        } else if (a.type === 'start' && b.type === 'stop') {
          return -1;
        } else {
          return 0;
        }
      });

      return boundaries;
    }

    renderMarks(boundaries) {
      let input = this.$el.val();
      boundaries.forEach(function (boundary, index) {
        let markup;
        if (boundary.type === 'start') {
          markup = '{{hwt-mark-start|' + index + '}}';
        } else {
          markup = '{{hwt-mark-stop}}';
        }
        input =
          input.slice(0, boundary.index) + markup + input.slice(boundary.index);
      });

      // this keeps scrolling aligned when input ends with a newline
      input = input.replace(/\n(\{\{hwt-mark-stop\}\})?$/, '\n\n$1');

      // encode HTML entities
      input = input.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      if (this.browser === 'ie') {
        // IE/Edge wraps whitespace differently in a div vs textarea, this fixes it
        input = input.replace(/ /g, ' <wbr>');
      }

      // replace start tokens with opening <mark> tags with class name
      input = input.replace(
        /\{\{hwt-mark-start\|(\d+)\}\}/g,
        this.isMobile ? '<span><mark>' : '<mark>',
      );

      // replace stop tokens with closing </mark> tags
      input = input.replace(
        /\{\{hwt-mark-stop\}\}/g,
        this.isMobile ? '</mark></span>' : '</mark>',
      );

      this.$highlights.html(input);

      this.$highlights
        .children(this.isMobile ? 'span' : 'mark')
        .on('click', (ev) => {
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
