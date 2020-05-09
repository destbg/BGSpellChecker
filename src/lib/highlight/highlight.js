(function ($) {
  const ID = 'hwt';

  class HighlightWithinTextarea {
    constructor(el, config) {
      this.backScrolling = false;
      this.frontScrolling = false;
      this.$el = $('.note-editable');
      this.highlight = config;
      this.$el.on('scroll.' + ID, this.handleScroll.bind(this));

      this.$highlights = $('<div>', {
        class: ID + '-highlights',
      }).on('scroll', this.highlightsScroll.bind(this));

      el.parent().append(this.$highlights);

      // plugin function checks this for success
      this.isGenerated = true;
    }

    handleInput(text, html) {
      if (text.length === 0) {
        this.$highlights.html('');
        return;
      }
      const ranges = this.getRanges(text, this.highlight);
      ranges.sort((a, b) => b[0] - a[0]);
      this.renderMarks(ranges, html);
      this.handleScroll();
    }

    getRanges(text, highlight) {
      let ranges = highlight.map(window.getStringRanges.bind(this, text));
      ranges = Array.prototype.concat.apply([], ranges);
      return ranges.filter(
        (value, index) => ranges.findIndex((f) => f[0] === value[0]) === index,
      );
    }

    renderMarks(ranges, html) {
      this.$highlights.html(html);
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
        this.$highlights
          .html()
          .replace(new RegExp('<span><h></h></span>', 'g'), '<span><h></h>')
          .replace(new RegExp('<span></span>', 'g'), '</span>'),
      );

      this.$highlights.find('span').on('click', (ev) => {
        return window.openTextChecker(ev);
      });
    }

    handleScroll() {
      if (!this.backScrolling) {
        this.$highlights.scrollTop(this.$el.scrollTop());
        this.frontScrolling = true;
      }
      this.backScrolling = false;
    }

    highlightsScroll() {
      if (!this.frontScrolling) {
        this.$el.scrollTop(this.$highlights.scrollTop());
        this.backScrolling = true;
      }
      this.frontScrolling = false;
    }
  }

  // register the jQuery plugin
  $.fn.highlightWithinTextarea = function (options, text, html) {
    return this.each(function () {
      const $this = $(this);
      let plugin = $this.data(ID);

      if (plugin && plugin.isGenerated) {
        plugin.highlight = options;
        plugin.handleInput(text, html);
      } else {
        plugin = new HighlightWithinTextarea($this, options);
        if (plugin.isGenerated) {
          $this.data(ID, plugin);
        }
      }
    });
  };
})(jQuery);
