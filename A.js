var A = (function() {

    /*
     * Easing functions inspired by: http://code.jquery.com/ui/1.11.4/jquery-ui.js
     */
    var coreEasings = {
        sine:    function(t) { return 1-Math.cos(t*Math.PI/2) },
        quad:    function(t) { return t*t },
        cubic:   function(t) { return t*t*t },
        quart:   function(t) { return t*t*t*t },
        quint:   function(t) { return t*t*t*t*t },
        expo:    function(t) { return Math.pow(2, 10 * (t - 1)) },
        circ:    function(t) { return 1-Math.sqrt(1-t*t) },
        elastic: function(t) { return t === 0 || t === 1 ? t : -Math.pow( 2, 8 * (t - 1) ) * Math.sin( ( (t - 1) * 80 - 7.5 ) * Math.PI / 15 ) },
        back:    function(t) { return t * t * ( 3 * t - 2 ) },
        bounce:  function(t) {
            var pow2,
                bounce = 4;
            while ( t < ( ( pow2 = Math.pow( 2, --bounce ) ) - 1 ) / 11 ) {}
            return 1 / Math.pow( 4, 3 - bounce ) - 7.5625 * Math.pow( ( pow2 * 3 - 2 ) / 22 - t, 2 );
        },
    };

    EasingFunctions = {};
    for (var name in coreEasings) {
        var easeIn = coreEasings[name];
        EasingFunctions["in-"+name] = easeIn;
        EasingFunctions["out-"+name] = function(easeIn, t) { return 1-easeIn(1-t); }.bind({}, easeIn);
        EasingFunctions["in-out-"+name] = function(easeIn, t) { return t<0.5 ? easeIn(t*2)/2 : 1-easeIn(t*-2+2)/2; }.bind({}, easeIn);
    };

    /**
     * Defaults for the animation engine
     */
    var defaults = {
        duration: 500,
        easing: "in-out-quad",
    };

    /**
     * Exported functions for reuse
     */
    var exports = {
        easings: EasingFunctions,
    };

    /**
     * registered engines
     */
    var engines = [];


    /**
     * Abstract Animator class
     */
    function Animator(obj) {
        this._obj = obj;
        this._queue = [];
        this._current = undefined;
        this._tickFuncHandler = this._tickFunc.bind(this);
        this._tickId = undefined;
        this._accessors = {};
        this._defaults = {};
    };

    Animator.prototype._add = function add(animation) {
        this._queue.push(animation);
        if (!this._tickId) {  // start animation
            this._current = this._queue.shift();
            this._tickId = window.requestAnimationFrame(this._tickFuncHandler);
        }
    };

    Animator.prototype._tickFunc = function _tickFunc(timestamp) {
        if (!this._current._starttime) {
            this._current.start && this._current.start(timestamp);
        }
        if (!this._current.progress(timestamp)) {
            this._current.end && this._current.end(timestamp);
            // animation ended, next one?
            this._current = this._queue.shift();
            if (this._current) {
                this._current.start && this._current.start(timestamp);
            }
        }
        this._tickId = this._current && window.requestAnimationFrame(this._tickFuncHandler) || undefined;
    };

    Animator.prototype._accessor_for = function _accessor_for(name) {
        if (name in this._accessors) {
            return this._accessors[name];
        }
        var accessor = this._accessors[name] = this._lookup_accessor(name);
        if (accessor) {
            this._defaults[name] = accessor.current();
            return accessor;
        } else {
            console.warn("Unable to create accessor for", name);
        }
    };

    // TODO: maybe merge with _accessor_for ?
    Animator.prototype._accessors_for = function _accessors_for(obj) {
        var accessors = [];
        for (var name in obj) {
            var accessor = this._accessor_for(name);
            if (accessor) {
                accessors.push(accessor);
            } else {
                console.warn("A.js:", "unable to handle property '"+name+"'");
            }
        }
        return accessors;
    };

    Animator.prototype._values_to = function _values_to(accessors, what) {
        accessors.forEach(function(accessor) {
            accessor.target(what[accessor.name]);
        });
    };

    Animator.prototype._values_progress = function _values_to(progress, accessors) {
        accessors.forEach(function(accessor) {
            accessor.progress(progress);
        });
    };

    /**
     * Sets values without animation
     */
    Animator.prototype.set = function set(what) {
        this._add({
            progress: function() {
                this._accessors_for(what).forEach(function(accessor) {
                    accessor.set(what[accessor.name]);
                });
            }.bind(this),
        });
        return this;
    };

    /**
     * Animates properties from curent to target
     */
    Animator.prototype.animate = function animate(target, options) {
        this._add(new Animation(this, target, options));
        return this;
    };

    /**
     * Insert a delay to pause the animation-sequence for the given ms
     */
    Animator.prototype.sleep = function sleep(ms) {
        this._add(new Animation(this, {}, { duration: ms }));
        return this;
    }
    Animator.prototype.delay = function delay(ms) {
        console.warn("A().delay() is deprecated - use .sleep() instead");
        return this.sleep.apply(this, arguments);
    };

    /**
     * Resets the properties to their initial values
     */
    Animator.prototype.reset = function reset() {
        this._add({
            progress: function() {
                this.set(this._defaults);
            }.bind(this),
        });
        return this;
    };

    /**
     * Stops and clears any animation on that element. It's not resetting the properties.
     */
    Animator.prototype.clear = function clear() {
        if (this._tickId) {
            window.cancelAnimationFrame(this._tickId);
            this._tickId = undefined;
            this._current = undefined;
            this._queue = [];
        }
        return this;
    };

    /**
     * A callback is called when previous animations are done.
     */
    Animator.prototype.then = function then(callback) {
        this._add({
            progress: callback.bind(this, this),
        });
        return this;
    };


    /**
     * Animation class to represent a single animation and it's effected properties
     */
    function Animation(animator, what, options) {
        options = options || {}
        this._animator = animator;
        this._easing = EasingFunctions[options.easing] || (typeof(options.easing)==="function" && options.easing) || EasingFunctions[defaults.easing] || defaults.easing;
        this._duration = options.duration!==undefined ? options.duration : defaults.duration;
        this._accessors = animator._accessors_for(what);
        this._what = what;
    }

    Animation.prototype.start = function start(timestamp) {
        this._starttime = timestamp
        this._animator._values_to(this._accessors, this._what);
    };

    Animation.prototype.progress = function progress(timestamp) {
        var d = timestamp - this._starttime;
        var p = this._duration === 0 ? 1 : Math.min(1, 1/this._duration*d)
        this._animator._values_progress(this._easing(p), this._accessors);
        return p<1;
    };


    /**
     * DOM engine
     */

    var dom_accessors = {};


    function Property(scope, name) {
        this.name = name;
        this.scope = scope;
    };


    function DOMTransformProperty(scope, name) {
        Property.apply(this, arguments);
        this.el = scope._obj;
        this.css = window.getComputedStyle(this.el);
        this.from = {};
        this.to = {};
    };
    DOMTransformProperty.prototype = Object.create(Property.prototype, {});
    DOMTransformProperty.prototype.constructor = DOMTransformProperty;

    DOMTransformProperty.prototype.set = function set(value) {
        this.to = value;
        this._set(value);
    };
    DOMTransformProperty.prototype._set = function _set(values) {
        var elements = [];
        for (var key in values) {
            elements.push(this.functions[key](values[key]));
        }
        this.scope._obj.style.transform = elements.join(" ");
    };

    DOMTransformProperty.prototype.current = function current() {
        return this.from;
    };
    DOMTransformProperty.prototype.target = function target(values) {
        for (var key in this.to) { this.from[key] = this.to[key]; }
        for (var key in values) {
            if (key in this.functions) {
                this.from[key] = this.to[key] || this.current()[key] || this.defaults[key] || 0;
            } else {
                console.warn("transform is not supporting", key);
            }
        }
        this.to = values;
    };
    DOMTransformProperty.prototype.progress = function progress(progress) {
        var values = {};
        for (var key in this.from) { values[key] = key in this.to ? (this.from[key]+(this.to[key]-this.from[key])*progress) : this.from[key]; }
        this._set(values);
    };

    DOMTransformProperty.prototype.functions = {
        x:      function(val) { return "translateX(" +val + "px)" },
        y:      function(val) { return "translateY(" +val + "px)" },
        scale:  function(val) { return "scale(" +val + ")" },
        rotate: function(val) { return "rotate(" +val + "deg)" },
    };

    DOMTransformProperty.prototype.defaults = {
        scale: 1,
    };

    dom_accessors.transform = function(a,b,c) { return new DOMTransformProperty(a, b, c); };


    /**
     * CSS value accessor
     */
    function CSSValue(scope, name) {
        this.name = name;
        this.propName = name.replace(/([a-z\d])([A-Z])/g, '$1-$2');
        this.unit = undefined;
        this.el = scope._obj;
        this.css = window.getComputedStyle(this.el);
    };
    CSSValue.prototype.set = function set(value) {
        this.to = value;
        this._set(value);
    };
    CSSValue.prototype._set = function _set(value) {
        this.el.style[this.name] = this.unit ? value + this.unit : value;
    };
    CSSValue.prototype.current = function current() {
        var str = this.css.getPropertyValue(this.propName);
        value = parseInt(str);
        this.unit = this.unit || str.substr((""+value).length)
        return value;
    };
    CSSValue.prototype.target = function target(value) {
        if (typeof value === 'string') {
            var str = value;
            value = parseInt(str);
            this.unit = str.substr((""+value).length)
        } else {
            this.unit = undefined;
        }
        this.from = this.to || this.current();
        this.to = value;
    };
    CSSValue.prototype.progress = function progress(progress) {
        this._set(this.from + (this.to-this.from)*progress);
    };


    /**
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

    function CSSColorValue(scope, name) {
        this.el = scope._obj;
        this.propName = name.replace(/([a-z\d])([A-Z])/g, '$1-$2');
        this.css = window.getComputedStyle(this.el);
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
        return parseColor(this.css.getPropertyValue(this.propName) || this.css.getPropertyValue(this.name));
    };
    CSSColorValue.prototype.target = function target(value) {
        this.from = this.to || this.current();
        this.to = parseColor(value);
    };
    CSSColorValue.prototype.progress = function progress(progress) {
        var c = blendColor(this.from, this.to, progress)
        this._set(c);
    };


    /**
     * DOMAnimator to manipulate dom nodes
     */
    function DOMNode(obj) {
        Animator.apply(this, arguments);
    };
    DOMNode.prototype = Object.create(Animator.prototype, {});
    DOMNode.prototype.constructor = DOMNode;

    DOMNode.prototype._lookup_accessor = function _lookup_accessor(name) {
        if (name in dom_accessors) {
            return dom_accessors[name](this, name);
        };
        if (name.toLowerCase().indexOf("color")!==-1) {
            return new CSSColorValue(this, name);
        };
        return new CSSValue(this, name);
    };

    DOMNode.factory = function factory(obj) {
        if (obj instanceof HTMLElement) return new DOMNode(obj);
        if ('string' === typeof obj) {
            var obj = document.querySelector(obj);
            if (obj) return new DOMNode(obj);
        }
    }
    engines.push(DOMNode);


    /**
     * API
     */
    exports.Animator = Animator;
    exports.Animation = Animation;
    exports.DOMNode = DOMNode;


    function A(obj, a1, a2, a3) {
        for (var i=0, Klass, instance; (Klass=engines[i]); i++) {
            instance = Klass.factory(obj, a1, a2, a3);
            if (instance) return instance;
        };
        throw "Unable to find factory for " + obj;
    };

    A.defaults = defaults;
    A.exports = exports;
    A.engines = engines;
    return A;
})();
