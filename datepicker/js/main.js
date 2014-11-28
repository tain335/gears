(function(global) {

	global.DatePicker = DatePicker;

	var mainTpl = [
	];

	var defaults = {
		container: 'body',
		title: '{year}-{month}',
		touchHold: 100,
		selectCallback: function(year, month, date) {}
	}

	function DatePicker(options) {
		this.options = $.extend({}, defaults, options);
		this.$container = $(this.options.container);
		if(!this.$container.length) {
			throw new Error('Container Is A Inavild Element!');
		}
		this.title = this.options.title;
		this.date = null;
		this.init();
	}

	DatePicker.prototype.init = function() {
		this.initUI();
		this.bindEvents();
	}

	DatePicker.prototype.initUI = function() {
		var d = this.options.date || new Date(),
			lis = $('.date-list li', this.$container);
		this._updateTitle(d.getFullYear(), d.getMonth() + 1);
		d.setDate(d.getDate() - 7 - d.getDay());
		for(var i = 0; i < 21; i++) {
			lis.eq(i)
				.data('date', [d.getFullYear(), d.getMonth() + 1, d.getDate()])
				.find('.day').text(d.getDate());
			d.setDate(d.getDate() + 1);
		}
		this.date = d;
	}

	DatePicker.prototype._updateTitle = function(year, month) {
		$('.datepicker .title', this.$container).text(this.title.replace(/{year}/g, year).replace(/{month}/g, this._pad(month, 2)));
	}

	DatePicker.prototype._getDaysInMonth = function(d) {
		return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
	}

	DatePicker.prototype._pad = function(num, size) {
		var s = "0000000000" + num;
		return s.substring(s.length - size);
	}

	DatePicker.prototype.bindEvents = function() {
		var $dl = $('.date-list', this.$container),
			options = this.options,
			self = this,
			moving = false;
		$dl.on('touchstart', function(evt) {
			evt.preventDefault();
			var startX, touchMoveHandler, touchEndHandler,
				oldOffset = parseInt($dl.css('marginLeft')),
				newOffset = oldOffset,
				lw = $dl.width() / 21,
				$self = $(this);
			startX = evt.originalEvent.touches[0].pageX;
			touchMoveHandler = function(evt) {
				evt.preventDefault();
				moving = true;
				newOffset = oldOffset + evt.originalEvent.touches[0].pageX - startX;
				$dl.css('marginLeft', newOffset);
			};

			touchEndHandler = function(evt) {
				evt.preventDefault();
				var _newOffset = Math.round(newOffset / lw) * lw,
					nlw = Math.round((_newOffset - oldOffset) / lw),
					date = self.date,
					lis;
				$self.off('touchmove', touchMoveHandler);
				if(nlw > 1) {
					lis = $(this).find('li:gt(' + (20 - nlw) + ')').detach().removeClass('selected');
					date.setDate(date.getDate() - 22 - nlw);
					lis.each(function() {
						self.date.setDate(date.getDate() + 1);
						$(this)
							.data('date', [date.getFullYear(), date.getMonth() + 1, date.getDate()])
							.find('.day').text(date.getDate());
					});
					$(this).prepend(lis);
					date.setDate(date.getDate() + 22 - nlw);
				} else if(nlw < -1) {
					lis = $(this).find('li:lt(' + -nlw + ')').detach().removeClass('selected');
					lis.each(function() {
						$(this)
							.data('date',  [date.getFullYear(), date.getMonth() + 1, date.getDate()])
							.find('.day').text(date.getDate());
						date.setDate(date.getDate() + 1);
					});
					$(this).append(lis);
				}
				$dl.css('marginLeft', '-100%');
				var d = $dl.children('li:eq(7)').data('date');
				self._updateTitle(d[0], d[1]);
				moving = false;
			};

			$self.on('touchmove', touchMoveHandler);
			$self.one('touchend', touchEndHandler);
		}).delegate('li', 'touchstart', function(evt) {
			evt.preventDefault();
			var $this = this;
			setTimeout(function() {
				if(moving) {
					return;
				}
				$($this).addClass('selected').siblings().removeClass('selected');
				var date = $($this).data('date');
				options.selectCallback && options.selectCallback(date[0], date[1], date[2]);
			}, options.touchHold);
		});
	}

})(this)