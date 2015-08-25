/**
 * Minimalistic template engine
 */
var T = (function() {
    var container = document.createElement("div");

    function Template(el) {
        if (!el) throw "invalid element";
        this.parent = el.parentNode;
        container.appendChild(el);
        this.markup = container.innerHTML;
    };
    Template.prototype.clone = function clone() {
        return new Clone(this);
    };

    function Clone(template) {
        this.template = template;
        container.innerHTML = template.markup;
        this.node = container.childNodes[0];
    };
    Clone.prototype.appendTo = function appendTo(node) {
        node.appendChild(this.node);
        return this;
    };
    Clone.prototype.remove = function remove() {
        var parent = this.node.parentNode;
        parent && parent.removeChild(this.node);
    };

    function T(el) {
        if ('string' === typeof el) el = document.querySelector(el);
        return new Template(el);
    };
    return T;
})();
