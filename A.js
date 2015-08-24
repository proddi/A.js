var A = (function() {

    /*
     * Easing Functions - inspired from http://gizma.com/easing/
     * only considering the t value for the range [0, 1] => [0, 1]
     */
    EasingFunctions = {
      // no easing, no acceleration
      linear: function (t) { return t },
      // accelerating from zero velocity
      easeInQuad: function (t) { return t*t },
      // decelerating to zero velocity
      easeOutQuad: function (t) { return t*(2-t) },
      // acceleration until halfway, then deceleration
      easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
      // accelerating from zero velocity
      easeInCubic: function (t) { return t*t*t },
      // decelerating to zero velocity
      easeOutCubic: function (t) { return (--t)*t*t+1 },
      // acceleration until halfway, then deceleration
      easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
      // accelerating from zero velocity
      easeInQuart: function (t) { return t*t*t*t },
      // decelerating to zero velocity
      easeOutQuart: function (t) { return 1-(--t)*t*t*t },
      // acceleration until halfway, then deceleration
      easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
      // accelerating from zero velocity
      easeInQuint: function (t) { return t*t*t*t*t },
      // decelerating to zero velocity
      easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
      // acceleration until halfway, then deceleration
      easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t }
    }

    var dom_types = {
        accessors: {},
    };

    var exports = {
    }

    // API
    var A = function A(el, types) {
//        console.log("A", el, typeof(el));
        if ('string' == typeof el) el = document.querySelector(el);
        if (!el) throw "No valid node found"
        this._el = el;
        this._queue = [];
        this._current = undefined;
        this._tickFuncHandler = this._tickFunc.bind(this);
        this._tickId = undefined;
        this._values = {};
        this._types = types || dom_types;
    };

    A.prototype.add = function add(animation) {
        this._queue.push(animation);
        if (!this._tickId) {  // start animation
            this._current = this._queue.shift();
            this._tickId = window.requestAnimationFrame(this._tickFuncHandler);
        }
    };

    A.prototype._tickFunc = function _tickFunc(timestamp) {
        if (!this._current._starttime) {
            this._current.start(timestamp);
        }
        if (!this._current.progress(timestamp)) {
            // animation ended, next one?
            this._current = this._queue.shift();
            if (this._current) {
                this._current.start(timestamp);
            }
        }
        this._tickId = this._current && window.requestAnimationFrame(this._tickFuncHandler) || undefined;
    };

    A.prototype.getAccessor = function getAccessor(name) {
        if (name in this._values) {
            return this._values[name];
        }
        var Klass = this._types.accessors[name];
        if (!Klass) throw "No Support for property named " + name;
        return this._values[name] = new Klass(this._el, name)
    }

    A.prototype.animate = function animate(what, options) {
        this.add(new Animation(this, what, options));
        return this;
    };

    A.prototype.set = function set(what) {
        new ObjectValue(this, what).target(what);
        return this;
    };

    A.prototype.reset = function reset() {
        if (this._tickId) {
            window.cancelAnimationFrame(this._tickId);
            this._tickId = undefined;
            this._current = undefined;
            this._queue = [];
        }
        this._values = {};
        return this;
    };

    A.prototype.destroy = function destroy(callback) {
        this.add({
            start: function() {},
            progress: function() {
                this.reset();
//                console.warn("TODO: remove all references...");
            }.bind(this),
        });
        return this;
    };

    A.prototype.then = function then(callback) {
        this.add({
            start: function() {},
            progress: callback.bind(undefined, this),
        });
        return this;
    };



    // single animation
    function Animation(scope, target, options) {
        options = options || {}
        this._scope = scope;
        this._easing = options.easing || EasingFunctions.easeInOutCubic;
        this._duration = options.duration || 2000;
        this._target = target;
        this._value = new ObjectValue(scope, target);
    }

    Animation.prototype.start = function start(timestamp) {
        this._starttime = timestamp
        this._value.target(this._target);
    };

    Animation.prototype.stop = function stop() {
        this._tickId && window.cancelAnimationFrame(this._tickId);
        this._tickId = undefined;
    };

    Animation.prototype.progress = function progress(timestamp) {
        var d = timestamp - this._starttime;
        var p = Math.min(1, 1/this._duration*d)
        this._value.progress(this._easing(p));
        return p<1;
    };


    function ObjectValue(scope, targets) {
        this.values = []
        for (var name in targets) {
            this.values.push(scope.getAccessor(name));
        }
    };
    ObjectValue.prototype.target = function target(targets) {
        this.values.forEach(function(value) {
            value.target(targets[value.name]);
        });
    };

    ObjectValue.prototype.progress = function progress(progress) {
        this.values.forEach(function(value) {
            value.progress(progress);
        });
    };



/*
 * CSS value accessor
 */

    function CSSValue(el, name) {
        this.el = el;
        this.css = window.getComputedStyle(el);
        this.name = name;
    };
    CSSValue.prototype.current = function current() {
        return parseInt(this.css.getPropertyValue(this.name));
    };
    CSSValue.prototype.target = function target(value) {
        this.from = this.to || this.current();
        this.to = value;
//        console.log("Value.target.get()", this.name, this.from);
    };
    CSSValue.prototype.progress = function progress(progress) {
        this.el.style[this.name] = this.from + (this.to-this.from)*progress + "px";
    };
    dom_types.accessors.width = CSSValue;
    dom_types.accessors.height = CSSValue;


/*
 * CSS color accessor
 */

    var namedColors = {
        black: { r:0, g:0, b:0, },
    };

    var parseColor = exports.parseColor = function parseColor(s) {
        if ("(" === s[3]) {         // rgb()
            var f = s.split(",");
            return {
                r: parseInt(f[0].slice(4)),
                g: parseInt(f[1]),
                b: parseInt(f[2]),
                a: undefined,
            };
        } else if ("(" === s[4]) {  // rgba()
            var f = s.split(",");
            return {
                    r: parseInt(f[0].slice(5)),
                    g: parseInt(f[1]),
                    b: parseInt(f[2]),
                    a: parseFloat(f[3]),
                };
        } else if ("#" === s[0]) {  // #...
            var f = parseInt(s.slice(1),16);
            return {
                r: f>>16,
                g: f>>8&0x00FF,
                b: f&0x0000FF,
                a: undefined,
            };
        } else {
            return namedColors[s];     // names
        }
    };

    var blendColor = exports.blendColor = function blend(f, t, p) {
        var r = Math.round((t.r-f.r)*p)+f.r
          , g = Math.round((t.g-f.g)*p)+f.g
          , b = Math.round((t.b-f.b)*p)+f.b
          ;
        if (f.a === undefined || t.a === undefined) {
            return { r:r, g:g, b:b, };
        } else {
            var fa = f.a === undefined ? 1 : f.a
              , ta = t.a === undefined ? 1 : t.a
              , a = (ta-fa)*p+fa
             return { r:r, g:g, b:b, a:a, };
        }

    };

    function CSSColorValue(el, name) {
        this.el = el;
        this.css = window.getComputedStyle(el);
        this.name = name;
    };

    var foo = {
        backgroundColor: "background-color",
    };

    CSSColorValue.prototype.current = function current() {
        var cssKey = foo[this.name];
        cssKey && this.css.getPropertyValue(cssKey) || this.el.style[this.name];
        return parseColor(this.css.getPropertyValue("background-color"));
    };
    CSSColorValue.prototype.target = function target(value) {
        this.from = this.to || this.current();
        this.to = parseColor(value);
//        console.log("CSSColorValue.target.get()", this.name, this.from, this.to);
    };
    CSSColorValue.prototype.progress = function progress(progress) {
        var c = blendColor(this.from, this.to, progress)
          , s = (c.a === undefined) ? "rgb("+c.r+","+c.g+","+c.b+")" : "rgba("+c.r+","+c.g+","+c.b+","+c.a+")"
        this.el.style[this.name] = s;
//        console.log("CSSColorValue", this.name, s, this.from, this.to);
    };

    dom_types.accessors.color = CSSColorValue;
    dom_types.accessors.backgroundColor = CSSColorValue;



    // API
    function Constructor(ctx, a1, a2, a3) { return new A(ctx, a1, a2, a3); };
    Constructor.types = dom_types;
    Constructor.exports = exports;
    return Constructor;
})();
