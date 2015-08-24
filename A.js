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

    ObjectValue.prototype.set = function set(targets) {
        this.values.forEach(function(value) {
            value.set(targets[value.name]);
        });
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




    var defaults = {
        duration: 500,
        easing: EasingFunctions.linear,
    };

    var exports = {
        ValueGroup: ObjectValue,
    };

    var engines = [];


    // API
    var A = function A(el) {
        for (var i=0, engine, o; (engine = engines[i]); i++) {
            o = engine.test(el);
            if (o) break;
        }
        if (!o) throw "No valid object engine found for " + el;
        this._engine = engine;
        this._el = o;
        this._queue = [];
        this._current = undefined;
        this._tickFuncHandler = this._tickFunc.bind(this);
        this._tickId = undefined;
        this._values = {};
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

    A.prototype.getValueGroup = function getValueGroup(targets) {
        return this._engine.getValueGroup ? this._engine.getValueGroup(this, targets) : new ObjectValue(this, targets);
    };

    A.prototype.getAccessor = function getAccessor(name) {
        // cache lookup
        if (name in this._values) {
            return this._values[name];
        }
        var accessor = this._values[name] = this._engine.getAccessor(this._el, name);
        if (accessor) {
            this._defaults[name] = accessor.current();
            return accessor;
        } else {
            console.warn("Unable to create accessor for", name);
        }
    };

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
                this.getValueGroup(values).set(values);
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

    A.prototype.clear = function clear() {
        if (this._tickId) {
            window.cancelAnimationFrame(this._tickId);
            this._tickId = undefined;
            this._current = undefined;
            this._queue = [];
        }
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
        this._value = scope.getValueGroup(target);//scope._engine.getValueGroup ? scope._engine.getValueGroup(scope, target) : new ObjectValue(scope, target);
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


    /**
     * DOM engine
     */

    var dom_accessors = {};

    engines.push({
        name: "DOM",
        test: function(obj) {
            if (obj instanceof HTMLElement) return obj;
            if ('string' == typeof obj) return document.querySelector(obj);
        },

        getAccessor: function(obj, name) {
            var Klass = dom_accessors[name];
            if (Klass) return new Klass(obj, name);
        },

        getValueGroup: function(scope, targets) {
            return new ObjectValue(scope, targets);
        },

    });


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
    dom_accessors.width = CSSValue;
    dom_accessors.height = CSSValue;
    dom_accessors.marginLeft = CSSValue;

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

    dom_accessors.color = CSSColorValue;
    dom_accessors.backgroundColor = CSSColorValue;
    dom_accessors.borderColor = CSSColorValue;



    // API
    function Constructor(ctx, a1, a2, a3) { return new A(ctx, a1, a2, a3); };
    Constructor.exports = exports;
    Constructor.defaults = defaults;
    Constructor.engines = engines;
    return Constructor;
})();
