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

	window.requestAnimationFrame = window.requestAnimationFrame ||
								window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame ||
								window.msRequestAnimationFrame;

	window.cancelAnimationFrame = window.cancelAnimationFrame ||
								window.mozCancelAnimationFrame ||
								window.webkitCancelAnimationFrame ||
								window.msCancelAnimationFrame;

	var cssPrefix = ['webkit', 'moz',  'ms', ''];

	var defaults = {
		container: 'body',
		title: '{year}-{month}',
		touchHold: 100,
		selectedDate: new Date(),
		selectCallback: function(year, month, date) {}
	}

	function isObject(obj) {
		return ots.call(obj) === '[object Object]';
	}

	function isArray(arr) {
		return ots.call(arr) === '[object Array]';
	}

	function easeOut(t, b, c, d){
        return c*((t=t/d-1)*t*t + 1) + b;
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

	function setTransition(ele, css) {
		var valid = !cssPrefix.every(function(prefix) {
			var name = prefix ? prefix + 'Transition' : 'transition';
			if(name in ele.style) {
				setTransition = function(ele, css) {
					ele.style[name] = css;
				}
				return false;
			}
			return true;
		});
		valid && setTransition(ele, css);
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
		this.selectedDate = this.options.selectedDate;
		this.date = this.options.date || new Date();
		this.date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate());
		this.selectedDate = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), this.selectedDate.getDate());
		this.init();
	}

	DatePicker.prototype.init = function() {
		this.initUI();
		this.bindEvents();
	}

	DatePicker.prototype.initUI = function() {
		var d = this.date,
			$lis = this.$container.querySelector('.date-list').children;
		this._updateTitle(d.getFullYear(), d.getMonth() + 1);
		d.setDate(d.getDate() - 7 - d.getDay());
		for(var i = 0; i < $lis.length; i++) {
			$lis[i].setAttribute('data-date', Number(d))
			$lis[i].querySelector('.day').innerText = d.getDate();
			if(this.selectedDate && Math.abs(Number(d) - Number(this.selectedDate)) < 86400000) {
				$lis[i].classList.add('selected');
			}
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
			touchStartTime = 0,
			self = this,
			oldOffsetX = 0, 
			currentOffsetX = 0,
			startX = 0,
			stopAnimated = false;

		var updateUI = function(nOfl) {
			var date = self.date,
				selectedDate = self.selectedDate;
			if(nOfl > 0) {
				var total = $dl.children.length,
					$lis = slice.call($dl.children, total - nOfl, total);
				date.setDate(date.getDate() - total - nOfl);
				detach($dl, $lis);
				for(var i = 0; i < $lis.length; i++) {
					date.setDate(date.getDate() + 1);
					$lis[i].classList.remove('selected');
					$lis[i].setAttribute('data-date', +date);
					$lis[i].querySelector('.day').innerText = date.getDate();
					if(selectedDate && Math.abs(Number(date) - Number(selectedDate)) < 86400000) {
						console.log(date, selectedDate);
						$lis[i].classList.add('selected');
					}
				}
				attach($dl, $lis);
				date.setDate(date.getDate() + total - nOfl);
			} else if(nOfl < 0) {
				var $lis = slice.call($dl.children, 0, -nOfl);
				detach($dl, $lis);
				for(var i = 0; i < $lis.length; i++) {
					$lis[i].classList.remove('selected');
					$lis[i].setAttribute('data-date', Number(date));
					$lis[i].querySelector('.day').innerText = date.getDate();
					if(selectedDate && Math.abs(Number(date) - Number(selectedDate)) < 86400000) {
						console.log(date, selectedDate);
						$lis[i].classList.add('selected');
					}
					date.setDate(date.getDate() + 1);
				}
				attach($dl, $lis, true);
			}
		}

		$dl.addEventListener('touchmove', function(evt) {
			evt.preventDefault();
			moving = true;
			currentOffsetX = oldOffsetX + (evt.touches[0].pageX - startX) * 100 / offsetWidth;
			setTranslate($dl, currentOffsetX, 0, 0);
		});

		$dl.addEventListener('touchstart', function(evt) {
			evt.preventDefault();
			oldOffsetX = getTranslate($dl).x;
			currentOffsetX = oldOffsetX;
			startX = evt.touches[0].pageX;
			touchStartTime = Number(new Date());
			setTransition($dl, '');
			stopAnimated = true;
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
						console.log($select);
						target.classList.add('selected');
						self.selectedDate = new Date(+target.getAttribute('data-date'));
						options.selectCallback && options.selectCallback(self.selectedDate.getFullYear(), self.selectedDate.getMonth(), self.selectedDate.getDate());
					}, options.touchHold);
					break;
				}
			} while((target = target.parentNode) && target !== $dl)
		});

		$dl.addEventListener('touchend', function(evt) {
			evt.preventDefault();
			var	date = self.date,
				selectedDate = self.selectedDate;
				offsetTime = (Number(new Date()) - touchStartTime) / 1000,
				pass = Math.round((currentOffsetX - oldOffsetX) / lw);
				speed = pass / offsetTime,
				distance = Math.min(Math.round(0.5 * Math.pow(speed, 2) / 50), 7),
				nOfl = pass < 0 ?  pass - distance : distance + pass,
				start = Number(new Date()),
				during = 300;

			stopAnimated = false;
			updateUI(nOfl);
			currentOffsetX = currentOffsetX - nOfl * lw;
			setTranslate($dl, currentOffsetX, 0, 0);

			/*
			setTimeout(function() {
				setTransition($dl, 'all .3s ease');
				setTranslate($dl, -33.3333);
			}, 0);
			*/
			
			var run = function() {
				var t = Number(new Date()) - start;
				if(t > during || stopAnimated) {
					moving = false;
					var d = new Date(Number($dl.querySelectorAll('li')[7].getAttribute('data-date')));
					self._updateTitle(d.getFullYear(), d.getMonth() + 1);
					return;
				}
				var result = easeOut(t, currentOffsetX, -33.33333 - currentOffsetX, during);
				oldOffsetX = result;
				setTranslate($dl, result, 0, 0, 0);
				requestAnimationFrame(run);
			}
			run();
			
		});
	}
	return DatePicker;
});