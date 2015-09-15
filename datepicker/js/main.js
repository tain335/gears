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
		weekdays = ['日', '一', '二', '三', '四', '五', '六'],
		lastTime = 0;

	window.requestAnimationFrame = window.requestAnimationFrame ||
								window.mozRequestAnimationFrame ||
								window.webkitRequestAnimationFrame ||
								window.msRequestAnimationFrame;

	window.cancelAnimationFrame = window.cancelAnimationFrame ||
								window.mozCancelAnimationFrame ||
								window.webkitCancelAnimationFrame ||
								window.msCancelAnimationFrame;


    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }
 
    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
    }

	var cssPrefix = ['webkit', 'moz',  'ms', ''];

	var defaults = {
		container: 'body',
		title: '{year}-{month}',
		timeConstant: 125,
		selectedDate: new Date(),
		selectCallback: function(date) {},
		cancelSelectCallback: function(date) {}
	}

	function isObject(obj) {
		return ots.call(obj) === '[object Object]';
	}

	function isArray(arr) {
		return ots.call(arr) === '[object Array]';
	}

	// function easeOut(t, b, c, d){
 //        return c*((t=t/d-1)*t*t + 1) + b;
 //    }

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
					ele.style[name] = 'translate3d(' + (x ? x + ',' : '0,') + ( y ? y + ',' : '0,') + (z ? z + ',' : 0) + ')';
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
		this.timeConstant = this.options.timeConstant;
		this.selectedDates = this.options.selectedDates || [];
		this.date = this.options.date || new Date();
		this.date = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.getDate());
		this.selectCallback = this.options.selectCallback;
		this.cancelSelectCallback = this.options.cancelSelectCallback;
		this._selectedDateMap = {};
		this.init();
	};

	DatePicker.prototype.init = function() {
		this.initSelectedDateMap();
		this.initUI();
		this.bindEvents();
	};

	DatePicker.prototype.initSelectedDateMap = function() {
		for(var i = 0; i < this.selectedDates.length; i++) {
			var d = this.selectedDates[i],
				fd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
			this._selectedDateMap[fd.getTime()] = fd;
		}
	};

	DatePicker.prototype.initUI = function() {
		var d = this.date.getDate() - 7 - this.date.getDay();
		this.$container.innerHTML = this._makeUIContainer();
		this._updateTitle(this.date.getFullYear(), this.date.getMonth() + 1);
		var html = '';
		for(var i = 0; i < 21; i++) {
			var date = new Date(this.date.getTime());
			date.setDate(d + i);
			if(i == 7) {
				this.currentDate = date;
			}
			html += this._makeUIItem(weekdays[i % 7], date.getDate(), !!this._selectedDateMap[date.getTime()]);
		}
		this.$container.querySelector('.date-list').innerHTML = html;
	};

	DatePicker.prototype.getSelectedDates = function() {
		var results = [];
		for(var prop in this._selectedDateMap) {
			if(this._selectedDateMap.hasOwnProperty(prop)) {
				results.push(this._selectedDateMap[prop])
			}
		}
		return results;
	};

	DatePicker.prototype._makeUIContainer = function() {
		return [
			'<div class="datepicker">',
				'<h1 class="title"></h1>',
				'<div class="date-container">',
					'<ul class="date-list clearfix">',
					'</ul>',
				'</div>',
			'</div>'
		].join('');
	};

	DatePicker.prototype._makeUIItem = function(weekday, dateStr, selected) {
		return [
			'<li class="' + (selected ? 'selected' : '') + '">',
				'<span>' + weekday + '</span>',
				'<span class="day">' + dateStr + '</span>',
			'</li>'
		].join('');
	};

	DatePicker.prototype._updateTitle = function(year, month) {
		this.$container.querySelector('.datepicker .title').innerText = this.title.replace(/{year}/g, year).replace(/{month}/g, this._pad(month, 2));
	};

	DatePicker.prototype._getDaysInMonth = function(d) {
		return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
	};

	DatePicker.prototype._pad = function(num, size) {
		var s = "0000000000" + num;
		return s.substring(s.length - size);
	};

	DatePicker.prototype.bindEvents = function() {
		var self = this,
			autoScrolling = false,
			moved = false,
			options = this.options,
			$dl = this.$container.querySelector('.date-list'),
			containerW =  this.$container.offsetWidth,
			timestamp = 0, //开始时间戳
			amplitude = 0, //动画位移范围
			startX = 0,
			targetX = 0,
			offsetX = 0,
			index = 1;
		
		var display = function(i) {
			index = 1;
			offsetX = 0;
			if(i == 1) {
				setTranslate($dl, 0, 0, 0);
				return;
			}
			if(i != 1) {
				var $elArr = Array.prototype.slice.call($dl.children, (2 - i) * 7, (3 - i) * 7);
				detach($dl, $elArr);
				if(i > 1) {
					for(var j = 0; j < $elArr.length; j++) {
						$elArr[j].classList.remove('selected');
						var cd = new Date(self.currentDate.getTime());
						cd.setDate(self.currentDate.getDate() + 14 + j);
						$elArr[j].children[1].innerText = cd.getDate();
						if(!!self._selectedDateMap[cd.getTime()]) {
							$elArr[j].classList.add('selected');
						}
					}
					self.currentDate = new Date(self.currentDate.getTime());
					self.currentDate.setDate(self.currentDate.getDate() + 7);
					attach($dl, $elArr, true);
				} else {
					for(var j = 0; j < $elArr.length; j++) {
						$elArr[j].classList.remove('selected');
						var cd = new Date(self.currentDate.getTime());
						cd.setDate(self.currentDate.getDate() - 14 + j);
						$elArr[j].children[1].innerText = cd.getDate();
						if(!!self._selectedDateMap[cd.getTime()]) {
							$elArr[j].classList.add('selected');
						}
					}
					self.currentDate = new Date(self.currentDate.getTime());
					self.currentDate.setDate(self.currentDate.getDate() - 7);
					attach($dl, $elArr, false);
				}
			}
			setTranslate($dl, 0, 0, 0);	
			self._updateTitle(self.currentDate.getFullYear(), self.currentDate.getMonth() + 1);
		};
		
		var autoScroll = function() {
			var elapsed, delta;
	        if (amplitude) {
	            elapsed = Date.now() - timestamp;
	            delta = amplitude * Math.exp(-elapsed / self.timeConstant);
	            if (Math.abs(delta) > 2) {
	                setTranslate($dl, (targetX - delta) + 'px', 0, 0);
	                requestAnimationFrame(autoScroll);
	            } else {
	                display(index - targetX / containerW);
	                autoScrolling = false;
	                moved = false;
	            }
	        } else {
	        	autoScrolling = false;
	        	moved = false;
	        }
		};
		
		var tap = function(evt) {
			if(autoScrolling) return;
			startX = evt.touches[0].pageX;
			evt.stopPropagation();
			return false;
		};

		var drag = function(evt) {
			if(autoScrolling) return;
			evt.preventDefault();
			offsetX = evt.touches[0].pageX - startX;
			if(Math.abs(offsetX) > 2) {
				moved = true;
				setTranslate($dl, offsetX + 'px', 0, 0);
			}
			evt.stopPropagation();
			return false;
		};

		var release = function(evt) {
			if(autoScrolling) return;
			if(!moved) {
				var target = evt.target,
					$lis = $dl.children;
				while(target.nodeName != 'LI') {
					target = target.parentElement;
				}
				for(var i = 0; i < $lis.length; i++) {
					if($lis[i] == target) break;
				}
				var sd = new Date(self.currentDate.getTime());
				sd.setDate(sd.getDate() + i - 7);
				if(target.classList.contains('selected')) {
					target.classList.remove('selected');
					self.cancelSelectCallback(sd);
					delete self._selectedDateMap[sd.getTime()];
				} else {
					target.classList.add('selected');
					self.selectCallback(sd);
					self._selectedDateMap[sd.getTime()] = sd;
				}
				return;	
			}
			targetX = offsetX;
			targetX = Math.round(targetX / containerW + 0.2 * targetX / Math.abs(targetX)) * containerW;
			targetX = targetX < -containerW ? -containerW : targetX > containerW ? containerW : targetX;
			amplitude = targetX - offsetX;
			timestamp = Date.now();
			autoScrolling = true;
			requestAnimationFrame(autoScroll);
			evt.stopPropagation();
			return false;
		};

		$dl.addEventListener('touchstart', tap);
		$dl.addEventListener('touchmove', drag);
		$dl.addEventListener('touchend', release);
	}
	return DatePicker;
});