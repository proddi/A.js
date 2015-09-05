/**
 * Minimalistic template engine
 */
var T = (function() {
    // dom container for instantiations
    var container = document.createElement("div");

    /** some minimal jquery stuff */
    function Node(dom) {
        this.node = dom;
    };
    Node.prototype.appendTo = function appendTo(node) {
        if (node instanceof Node) node = node.node;
        node.appendChild(this.node);
        return this;
    };
    Node.prototype.remove = function remove() {
        var parent = this.node.parentNode;
        parent && parent.removeChild(this.node);
    };
    Node.prototype.find = function find(selector) {
        var dom = this.node.querySelector(selector);
        return dom && new Node(dom);
    };
    Node.prototype.html = function html(html) {
        if (undefined !== html) {
            this.node.innerHTML = html;
            return this;
        }
        return this.node.innerHTML;
    };

    /** Template */
    function Template(el) {
        if (!el) throw "invalid element";
        this.parent = el.parentNode;
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(el);
        this.markup = container.innerHTML;
    };
    Template.prototype.clone = function clone(context) {
        return new Clone(this, context);
    };

    /** Template clone */
    function Clone(template, context) {
        this.template = template;
        container.innerHTML = (template.engine || T.engine)(template.markup, context || {});
        Node.call(this, container.childNodes[0]);
    };
    Clone.prototype = Object.create(Node.prototype, {});
    Clone.prototype.constructor = Clone;


    function T(el) {
        if ('string' === typeof el) el = document.querySelector(el);
        return new Template(el);
    };
    T.engine = function(markup, context) { return markup; }
    return T;
})();
