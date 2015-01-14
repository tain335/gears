(function(root, factory) {
	if(typeof define === 'function' && define.amd) {
		define('DatePicker', factory);
	} else {
		root.DatePicker = factory()
	}
})(this, function() {

	var ots = Object.prototype.toString,
		slice = Array.prototype.slice,
		$ = document.querySelectorAll,
		noop = function() {},
		mainTpl = [];

	var cssPrefix = ['webkit', 'moz',  'ms', ''];

	var defaults = {
		container: 'body',
		title: '{year}-{month}',
		touchHold: 100,
		selectCallback: function(year, month, date) {}
	}

	function isObject(obj) {
		return ots.call(obj) === '[object Object]';
	}

	function isArray(arr) {
		return ots.call(arr) === '[object Array]';
	}

	function mixin(target, src) {
		if(!isObject(target) || !isObject(src)) return target || src || {};
		var args = slice.call(arguments, 2);
		if(args.length) {
			args.forEach(function(arg) {
				mixin(target, arg);
			});
		} else {
			for(var prop in src) {
				target[prop] = src[prop];
			}
		}
	}

	function setTranslate(ele, x, y, z) {
		var valid = !cssPrefix.every(function(prefix) {
			var name = prefix ? prefix + 'Transform' : 'transform';
			if(name in ele.style) {
				setTranslate = function(ele, x, y, z) {
					ele.style[name] = 'translate3d(' + (x ? x + '%,' : '0,') + ( y ? y + '%,' : '0,') + (z ? z + '%' : 0) + ')';
				}
				return false;
			}
			return true;
		});
		valid && setTranslate(ele, x, y, z);
	}

	function getTranslate(ele) {
		var valid = !cssPrefix.every(function(prefix) {
			var name = prefix ? prefix + 'Transform' : 'transform';
			if(name in ele.style) {
				getTranslate = function(ele) {
					var coord = ele.style[name].match(/\-?[0-9]+\.?[0-9]*/g);
					return {
						x: parseFloat(coord[1]),
						y: parseFloat(coord[2]),
						z: parseFloat(coord[3])
					}
				}
				return false;
			} else {
				return true;
			}
		});
		return valid && getTranslate(ele);
	}

	function detach(parent, nodes) {
		var len = nodes.length;
		for(var i = 0; i < len; i++) {
			parent.removeChild(nodes[i]);
		}
	}

	function attach(parent, nodes, appended) {
		var fragment = document.createDocumentFragment(), len = nodes.length;
		for(var i = 0; i < len; i++) {
			fragment.appendChild(nodes[i]);
		}
		if(appended) {
			parent.appendChild(fragment);
		} else {
			parent.insertBefore(fragment, parent.firstChild);
		}
	}

	function DatePicker(options) {
		this.options = mixin(defaults, options);
		this.$container = document.querySelector(this.options.container);
		if(!this.$container) {
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
			$lis = this.$container.querySelector('.date-list').children;
		this._updateTitle(d.getFullYear(), d.getMonth() + 1);
		d.setDate(d.getDate() - 7 - d.getDay());
		for(var i = 0; i < $lis.length; i++) {
			$lis[i].setAttribute('data-date', [d.getFullYear(), d.getMonth() + 1, d.getDate()].join('/'))
			$lis[i].querySelector('.day').innerText = d.getDate();
			d.setDate(d.getDate() + 1);
		}
		this.date = d;
		setTranslate(this.$container.querySelector('.date-list'), -33.33333, 0 , 0);
	}

	DatePicker.prototype._updateTitle = function(year, month) {
		this.$container.querySelector('.datepicker .title').innerText = this.title.replace(/{year}/g, year).replace(/{month}/g, this._pad(month, 2));
	}

	DatePicker.prototype._getDaysInMonth = function(d) {
		return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
	}

	DatePicker.prototype._pad = function(num, size) {
		var s = "0000000000" + num;
		return s.substring(s.length - size);
	}

	DatePicker.prototype.bindEvents = function() {
		var $dl = this.$container.querySelector('.date-list'),
			offsetWidth = $dl.offsetWidth,
			options = this.options,
			lw = 100 / 21,
			moving = false,
			touchTimer = 0,
			self = this,
			oldOffsetX = 0, 
			newOffsetX = 0,
			startX = 0;

		$dl.addEventListener('touchmove', function(evt) {
			evt.preventDefault();
			moving = true;
			newOffsetX = oldOffsetX + (evt.touches[0].pageX - startX) * 100 / offsetWidth;
			setTranslate($dl, newOffsetX, 0, 0);
		});

		$dl.addEventListener('touchstart', function(evt) {
			evt.preventDefault();
			oldOffsetX = getTranslate($dl).x;
			newOffsetX = oldOffsetX,
			startX = evt.touches[0].pageX;
			var target = evt.target;
			do {
				if(target.nodeName === 'LI') {
					clearTimeout(touchTimer);
					touchTimer = setTimeout(function() {
						if(moving) {
							return;
						}
						var $select = $dl.querySelectorAll('.selected')[0];
						$select && $select.classList.remove('selected');
						target.classList.add('selected');
						//$($this).addClass('selected').siblings().removeClass('selected');
						//var date = $($this).data('date');
						//options.selectCallback && options.selectCallback(date[0], date[1], date[2]);
					}, options.touchHold);
					break;
				}
			} while((target = target.parentNode) && target !== $dl)
		});

		$dl.addEventListener('touchend', function(evt) {
			evt.preventDefault();
			var _newOffset = Math.round(newOffsetX / lw) * lw,
				nOfl = Math.round((_newOffset - oldOffsetX) / lw),
				date = self.date;
			
			if(nOfl > 1) {
				var total = $dl.children.length,
					$lis = slice.call($dl.children, total - nOfl, total);
				date.setDate(date.getDate() - total - nOfl);
				detach($dl, $lis);
				for(var i = 0; i < $lis.length; i++) {
					date.setDate(date.getDate() + 1);
					$lis[i].setAttribute('data-date', [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('/'));
					$lis[i].querySelector('.day').innerText = date.getDate();
				}
				attach($dl, $lis);
				date.setDate(date.getDate() + total - nOfl);
			} else if(nOfl < -1) {
				var $lis = slice.call($dl.children, 0, -nOfl);
				detach($dl, $lis);
				for(var i = 0; i < $lis.length; i++) {
					$lis[i].setAttribute('data-date', [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('/'));
					$lis[i].querySelector('.day').innerText = date.getDate();
					date.setDate(date.getDate() + 1);
				}
				attach($dl, $lis, true);
			}
			setTranslate($dl, '-33.33333', 0, 0, 0);
			var d = $dl.querySelectorAll('li')[7].getAttribute('data-date').split('/');
			self._updateTitle(d[0], d[1]);
			moving = false;
		});
	}
	return DatePicker;
});