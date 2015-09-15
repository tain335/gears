(function(root, factory) {
	if(typeof define === 'function' && define.amd) {
		define('ThemeColor', factory);
	} else {
		root.ThemeColor = factory()
	}
})(this, function() {

	function OctNode() {
		this.isLeaf = false;
		this.colorIndex = 0;
		this.pixSum = 0;
		this.redSum = 0;
		this.greenSum = 0;
		this.blueSum = 0;
		this.childs = [];
		this.next = null;
	}

	function OctTree() {
		this.masks = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];
		this.leafCount = 0;
		this.reducibleNodes = [];
		this.root = this._createNode(0);
	}

	OctTree.prototype._createNode = function(level) {
		var node = new OctNode();
		if(level == 8) {
			node.isLeaf = true;
			this.leafCount++;
		} else {
			node.next = this.reducibleNodes[level];
			this.reducibleNodes[level] = node;
		}
		return node;
	};

	OctTree.prototype._reduceTree = function() {
		var lv = 7;
		while(!this.reducibleNodes[lv]) lv--;
		var node = this.reducibleNodes[lv];
		this.reducibleNodes[lv] = node.next;

		var r = 0,
			g = 0,
			b = 0,
			pixSum = 0;
		for(var i = 0; i < 8; i++) {
			if(!node.childs[i]) continue;
			var child = node.childs[i];
			r += child.redSum;
			g += child.greenSum;
			b += child.blueSum;
			pixSum += child.pixSum;
			delete node.childs[i];
			this.leafCount--;
		}

		node.isLeaf = true;
		node.pixSum = pixSum;
		node.redSum = r;
		node.greenSum = g;
		node.blueSum = b;
		this.leafCount++;
	};

	OctTree.prototype._indexColor = function(color, level) {
		var mask = this.masks[level],
			side = 7 - level;
		return ((color.r&mask)>>side<<2)|((color.b&mask)>>side<<1)|((color.g&mask)>>side);
	};
	OctTree.prototype._addColor = function(treeNode, color, level) {
		if(treeNode.isLeaf) {
			treeNode.redSum += color.r;
			treeNode.greenSum += color.g;
			treeNode.blueSum += color.b;
			treeNode.pixSum++;
		} else {
			var index = this._indexColor(color, level);
			if(!treeNode.childs[index]) {
				treeNode.childs[index] = this._createNode(level + 1);
			}
			this._addColor(treeNode.childs[index], color, level + 1);
		}
	};

	OctTree.prototype._getColor = function(leaf) {
		var s = '000000' + ((leaf.redSum / leaf.pixSum) << 16 | ((leaf.greenSum / leaf.pixSum) << 8) | leaf.blueSum / leaf.pixSum).toString(16);
		return {
			pixSum: leaf.pixSum,
			color: s.substring(s.length - 6)
		};
	};

	OctTree.prototype.fetchColors = function() {
		var node, self = this, colors = [];
		for(var i = 7; i >= 0; i--) {
			var node = this.reducibleNodes[i];
			while(!!node) {
				for(var j = 0; j < 8; j++) {
					if(node.childs[j] && node.childs[j].isLeaf) {
						colors.push(self._getColor(node.childs[j]));
					}
				}
				node = node.next;
			}
		}
		colors.sort(function(a, b) {
			return b.pixSum - a.pixSum;
		});
		return colors;
	};

	OctTree.prototype.build = function(imageDatas, maxColors) {
		if(maxColors > 256 || maxColors <= 0) {
			return false;
		}
		var len = imageDatas.length;
		for(var i = 0; i < len; i += 4) {
			this._addColor(this.root, {r: imageDatas[i], g: imageDatas[i + 1], b: imageDatas[i + 2]}, 0);
			if(this.leafCount > maxColors) {
				this._reduceTree();
			}
		}
	};

	function ThemeColor() {
		this.init();
	}

	ThemeColor.prototype._loadImage = function(url, fn) {
		var self = this,
			img = document.createElement('img');
		img.onload = function() {
			fn&&fn.call(this, img);
		};
		img.src = url;
	};

	ThemeColor.prototype._loadedFn = function(img, colors, fn) {
		this.canvas.width = img.width;
		this.canvas.height = img.height;
		this.canvasCtx.drawImage(img, 0, 0, img.width, img.height);
		var tree = new OctTree();
		tree.build(this.canvasCtx.getImageData(0, 0, img.width, img.height).data, colors);
		var colors = tree.fetchColors();
		fn&&fn(colors);
		return colors;
	}

	ThemeColor.prototype.init = function() {
		this.canvas = document.createElement('canvas');
		this.canvasCtx = this.canvas.getContext('2d');
	};

	ThemeColor.prototype.getThemeColors = function(img, colors) {
		return this._loadedFn(img, colors);
	};

	ThemeColor.prototype.getThemeColorsFromUrl = function(imgUrl, colors, fn) {
		var self = this;
		this._loadImage(imgUrl, function(img) {
			self._loadedFn(img, colors, fn);
		});
	};

	return ThemeColor;

});