var A = (function() {

    /*
     * Easing Functions - inspired from http://gizma.com/easing/
     * only considering the t value for the range [0, 1] => [0, 1]
     */
    EasingFunctions = {
      // no easing, no acceleration
      "linear": function (t) { return t },
      // accelerating from zero velocity
      "in": function (t) { return t*t },
      // decelerating to zero velocity
      "out": function (t) { return t*(2-t) },
      // acceleration until halfway, then deceleration
      "in-out": function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
      // accelerating from zero velocity
      "in-cubic": function (t) { return t*t*t },
      // decelerating to zero velocity
      "out-cubic": function (t) { return (--t)*t*t+1 },
      // acceleration until halfway, then deceleration
      "in-out-cubic": function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
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

    var defaults = {
        duration: 500,
        easing: EasingFunctions.linear,
    };

    var exports = {
    };

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
        this._defaults = {};
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
        if (Klass) {
            var accessor = this._values[name] = new Klass(this._el, name)
            this._defaults[name] = accessor.current();
            return accessor;
        }
    }

    A.prototype.animate = function animate(what, options) {
        this.add(new Animation(this, what, options));
        return this;
    };

    A.prototype.delay = function delay(ms) {
        this.add(new Animation(this, {}, { duration: ms }));
        return this;
    };

    A.prototype.set = function set(values) {
        this.add({
            start: function() {},
            progress: function() {
                for (var name in values) {
                    var accessor = this.getAccessor(name);
                    if (accessor) {
                        accessor.set(values[name]);
                    } else {
                        console.warn("A.js:", "unable to handle property '"+name+"'");
                    }
                }
            }.bind(this),
        });
        return this;
    };

    A.prototype.reset = function reset() {
        this.add({
            start: function() {},
            progress: function() {
                this.set(this._defaults);
            }.bind(this),
        });
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
        this._easing = EasingFunctions[options.easing] || (typeof(options.easing)==="function" && options.easing) || defaults.easing;
        this._duration = options.duration || defaults.duration;
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
            var accessor = scope.getAccessor(name);
            if (accessor) {
                this.values.push(accessor);
            } else {
                console.warn("A.js:", "unable to handle property '"+name+"'");
            }
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

    var foo = {  // replace my with a regexp
        backgroundColor: "background-color",
        marginLeft: "margin-left",
        borderColor: "border-color",
    };

    function CSSValue(el, name) {
        this.el = el;
        this.css = window.getComputedStyle(el);
        this.name = name;
    };
    CSSValue.prototype.set = function set(value) {
        this.to = value;
        this._set(value);
    };
    CSSValue.prototype._set = function _set(value) {
        this.el.style[this.name] = value + "px";
    };
    CSSValue.prototype.current = function current() {
        return parseInt(this.css.getPropertyValue(foo[this.name]) || this.css.getPropertyValue(this.name));
    };
    CSSValue.prototype.target = function target(value) {
        this.from = this.to || this.current();
        this.to = value;
    };
    CSSValue.prototype.progress = function progress(progress) {
        this._set(this.from + (this.to-this.from)*progress);
    };
    dom_types.accessors.width = CSSValue;
    dom_types.accessors.height = CSSValue;
    dom_types.accessors.marginLeft = CSSValue;

/*
 * CSS color accessor
 */

    var namedColors = {
        black: { r:0  , g:0  , b:0  , },
        white: { r:255, g:255, b:255, },
        red:   { r:255, g:0  , b:0  , },
        green: { r:0  , g:255, b:0  , },
        blue:  { r:0  , g:0  , b:255, },
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

    CSSColorValue.prototype.set = function set(value) {
        value = typeof(value) === "object" ? value : parseColor(value);
        this.to = value;
        this._set(value);
    };
    CSSColorValue.prototype._set = function _set(c) {
        this.el.style[this.name] = (c.a === undefined) ? "rgb("+c.r+","+c.g+","+c.b+")" : "rgba("+c.r+","+c.g+","+c.b+","+c.a+")";
    };
    CSSColorValue.prototype.current = function current() {
        return parseColor(this.css.getPropertyValue(foo[this.name]) || this.css.getPropertyValue(this.name));
    };
    CSSColorValue.prototype.target = function target(value) {
        this.from = this.to || this.current();
        this.to = parseColor(value);
    };
    CSSColorValue.prototype.progress = function progress(progress) {
        var c = blendColor(this.from, this.to, progress)
        this._set(c);
    };

    dom_types.accessors.color = CSSColorValue;
    dom_types.accessors.backgroundColor = CSSColorValue;
    dom_types.accessors.borderColor = CSSColorValue;



    // API
    function Constructor(ctx, a1, a2, a3) { return new A(ctx, a1, a2, a3); };
    Constructor.types = dom_types;
    Constructor.exports = exports;
    Constructor.defaults = defaults;
    return Constructor;
})();
