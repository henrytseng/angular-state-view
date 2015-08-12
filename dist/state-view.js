(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* global window:false */
/* global process:false */
/* global setImmediate:false */
/* global setTimeout:false */

var _process = {
  nextTick: function(callback) {
    setTimeout(callback, 0);
  }
};

module.exports = _process;
},{}],2:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],3:[function(require,module,exports){
'use strict';

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', '$controller', '$q', function ($state, $viewManager, $templateCache, $compile, $controller, $q) {
  return {
    restrict: 'EA',
    priority: 400,
    scope: {

    },
    link: function(scope, $element, attrs) {
      // Create view
      var _view = $viewManager.create(attrs.id, {

        // Element
        $element: $element,

        /**
         * Render view
         * 
         * @param  {String}  template   A template to use
         * @param  {Mixed}   controller A controller to attach applied to scope.$parent
         * @param  {Object}  locals     A data Object to instantiate controller with
         * @return {Promise}            A promise resolved when rendering is complete
         */
        render: function(template, controller, locals) {
          var deferred = $q.defer();

          $element.html(template);

          // Compile
          var link = $compile($element.contents());

          // Controller
          if(controller) {
            var _locals = angular.extend({}, locals || {}, {
              $scope: scope.$parent
            });
            $controller(controller, _locals);
          }

          // Link
          link(scope.$parent);

          deferred.resolve();
          return deferred.promise;
        },

        /**
         * Reset view
         * 
         * @return {Promise} A promise resolved when rendering is complete
         */
        reset: function() {
          var deferred = $q.defer();

          // Empty
          $element.empty();

          deferred.resolve();
          return deferred.promise;
        }
      });

      // Destroy
      $element.on('$destroy', function() {
        _view.destroy();
      });
    }
  };
}];

},{}],4:[function(require,module,exports){
'use strict';

/* global angular:false */

// CommonJS
if (typeof module !== "undefined" && typeof exports !== "undefined" && module.exports === exports){
  module.exports = 'angular-state-view';
}

// Assume polyfill used in StateRouter exists

// Instantiate module
angular.module('angular-state-view', ['angular-state-router'])

  .factory('$viewManager', require('./services/view-manager'))

  .directive('sview', require('./directives/state-view'));

},{"./directives/state-view":3,"./services/view-manager":5}],5:[function(require,module,exports){
'use strict';

/* global window:false */

var EventEmitter = require('events').EventEmitter;
var View = require('../view/view');
var process = require('../../node_modules/angular-state-router/src/utils/process');

module.exports = ['$state', '$injector', '$q', function($state, $injector, $q) {

  // Instance of EventEmitter
  var _self = new EventEmitter();

  var _viewHash = {};
  var _activeHash = {};

  /**
   * Reset active views
   * 
   * @return {Promise} A promise fulfilled when currently active views are reset
   */
  var _resetActive = function() {
    // Reset views
    var resetPromised = {};
    angular.forEach(_activeHash, function(view, id) {
      resetPromised[id] = $q.when(view.reset());
    });
    _activeHash = {};

    return $q.all(resetPromised);
  };

  /**
   * Get templates
   * 
   * @param  {Mixed}   data Template data, String src to include or Function invocation
   * @return {Promise}      A promise fulfilled when templates retireved
   */
  var _getTemplate = function(data) {
    var template = angular.isString(data) ? '<ng-include src="\''+data+'\'"></ng-include>' : $injector.invoke(data);
    return $q.when(template);
  };

  /**
   * Render a view
   * 
   * @param  {String}  id     Unique identifier for view
   * @param  {View}    view   A view instance
   * @param  {Mixed}   data   Template data, String src to include or Function invocation
   * @return {Promise}        A promise fulfilled when currently active view is rendered
   */
  var _renderView = function(id, view, data, controller) {
    return _getTemplate(data).then(function(template) {

      // Controller
      if(controller) {
        var current = $state.current();
        return view.render(template, controller, current.locals);

      // Template only
      } else {
        return view.render(template);
      }
    });
  };

  /**
   * Update rendered views
   *
   * @param {Function} callback A completion callback, function(err)
   */
  var _update = function(callback) {
    // Activate current
    var current = $state.current();

    if(current) {

      // Reset
      _resetActive().then(function() {

        // Render
        var viewsPromised = {};
        var templates = current.templates || {};
        var controllers = current.controllers || {};
        angular.forEach(templates, function(template, id) {
          if(_viewHash[id]) {
            var view = _viewHash[id];
            var controller = controllers[id];
            viewsPromised[id] = _renderView(id, view, template, controller);
            _activeHash[id] = view;
          }
        });

        $q.all(viewsPromised).then(function(views) {
          process.nextTick(callback);

        }, function(err) {
          process.nextTick(angular.bind(null, callback, err));
        });

      }, function(err) {
        process.nextTick(angular.bind(null, callback, err));
      });

    // None
    } else {
      process.nextTick(callback);
    }
  };

  /**
   * Unregister a view
   * 
   * @param  {String}       id Unique identifier for view
   * @return {$viewManager}    Itself, chainable
   */
  var _unregister = function(id) {
    delete _viewHash[id];
  };

  /**
   * Register a view, also implements destroy method on view to unregister from manager
   * 
   * @param  {String}       id   Unique identifier for view
   * @param  {View}         view A view instance
   * @return {$viewManager}      Itself, chainable
   */
  var _register = function(id, view) {
    // No id
    if(!id) {
      throw new Error('View requires an id.');

    // Require unique id
    } else if(_viewHash[id]) {
      throw new Error('View requires a unique id');

    // Add
    } else {
      _viewHash[id] = view;
    }

    // Check if view is currently active
    var current = $state.current() || {};
    var templates = current.templates || {};
    var controllers = current.controllers || {};
    if(!!templates[id]) {
      _renderView(id, view, templates[id], controllers[id]);
    }

    // Implement destroy method
    view.destroy = function() {
      _unregister(id);
    };

    return view;
  };

  /**
   * A factory method to create a View instance
   * 
   * @param  {String} id   Unique identifier for view
   * @param  {Object} data A data object used to extend abstract methods
   * @return {View}        A View entitity
   */
  _self.create = function(id, data) {
    data = data || {};

    // Create
    var view = View(id, data);

    // Register
    return _register(id, view);
  };

  /**
   * Get a view by id
   * 
   * @param  {String} id Unique identifier for view
   * @return {View}      A View entitity
   */
  _self.get = function(id) {
    return _viewHash[id];
  };

  /**
   * Update
   */
  _self.$update = _update;

  // Register middleware layer
  $state.$use(function(request, next) {
    _update(function(err) {
      if(err) {
        _self.emit('error:render', err);
        return next(err);
      }

      _self.emit('update:render');
      next();
    });
  });

  return _self;
}];

},{"../../node_modules/angular-state-router/src/utils/process":1,"../view/view":6,"events":2}],6:[function(require,module,exports){
'use strict';

/**
 * View
 *
 * @param  {String} id      Unique identifier for view
 * @param  {Object} child   A data object used to extend abstract methods
 * @return {View}           An abstract view object
 */
module.exports = function View(id, child) {

  // Instance
  var _self;
  _self = {

    /**
     * Abstract render method
     */
    render: function(template) { },

    /**
     * Abstract reset method
     */
    reset: function() { },

    /**
     * Abstract destroy method
     */
    destroy: function() { }

  };

  // Extend to overwrite abstract methods
  angular.extend(_self, child);

  return _self;
};

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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T0FBTyxLQUFLLElBQUk7OztJQUdwQixPQUFPLFVBQVUsSUFBSTs7Ozs7Ozs7O0VBU3ZCLE1BQU0sTUFBTSxTQUFTLElBQUk7SUFDdkIsT0FBTyxVQUFVOzs7Ozs7RUFNbkIsTUFBTSxVQUFVOzs7RUFHaEIsT0FBTyxLQUFLLFNBQVMsU0FBUyxNQUFNO0lBQ2xDLFFBQVEsU0FBUyxLQUFLO01BQ3BCLEdBQUcsS0FBSztRQUNOLE1BQU0sS0FBSyxnQkFBZ0I7UUFDM0IsT0FBTyxLQUFLOzs7TUFHZCxNQUFNLEtBQUs7TUFDWDs7OztFQUlKLE9BQU87O0FBRVQ7O0FDNU1BOzs7Ozs7Ozs7QUFTQSxPQUFPLFVBQVUsU0FBUyxLQUFLLElBQUksT0FBTzs7O0VBR3hDLElBQUk7RUFDSixRQUFROzs7OztJQUtOLFFBQVEsU0FBUyxVQUFVOzs7OztJQUszQixPQUFPLFdBQVc7Ozs7O0lBS2xCLFNBQVMsV0FBVzs7Ozs7RUFLdEIsUUFBUSxPQUFPLE9BQU87O0VBRXRCLE9BQU87O0FBRVQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgd2luZG93OmZhbHNlICovXG4vKiBnbG9iYWwgcHJvY2VzczpmYWxzZSAqL1xuLyogZ2xvYmFsIHNldEltbWVkaWF0ZTpmYWxzZSAqL1xuLyogZ2xvYmFsIHNldFRpbWVvdXQ6ZmFsc2UgKi9cblxudmFyIF9wcm9jZXNzID0ge1xuICBuZXh0VGljazogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHJvY2VzczsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gWyckc3RhdGUnLCAnJHZpZXdNYW5hZ2VyJywgJyR0ZW1wbGF0ZUNhY2hlJywgJyRjb21waWxlJywgJyRjb250cm9sbGVyJywgJyRxJywgZnVuY3Rpb24gKCRzdGF0ZSwgJHZpZXdNYW5hZ2VyLCAkdGVtcGxhdGVDYWNoZSwgJGNvbXBpbGUsICRjb250cm9sbGVyLCAkcSkge1xuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgIHByaW9yaXR5OiA0MDAsXG4gICAgc2NvcGU6IHtcblxuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsICRlbGVtZW50LCBhdHRycykge1xuICAgICAgLy8gQ3JlYXRlIHZpZXdcbiAgICAgIHZhciBfdmlldyA9ICR2aWV3TWFuYWdlci5jcmVhdGUoYXR0cnMuaWQsIHtcblxuICAgICAgICAvLyBFbGVtZW50XG4gICAgICAgICRlbGVtZW50OiAkZWxlbWVudCxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVuZGVyIHZpZXdcbiAgICAgICAgICogXG4gICAgICAgICAqIEBwYXJhbSAge1N0cmluZ30gIHRlbXBsYXRlICAgQSB0ZW1wbGF0ZSB0byB1c2VcbiAgICAgICAgICogQHBhcmFtICB7TWl4ZWR9ICAgY29udHJvbGxlciBBIGNvbnRyb2xsZXIgdG8gYXR0YWNoIGFwcGxpZWQgdG8gc2NvcGUuJHBhcmVudFxuICAgICAgICAgKiBAcGFyYW0gIHtPYmplY3R9ICBsb2NhbHMgICAgIEEgZGF0YSBPYmplY3QgdG8gaW5zdGFudGlhdGUgY29udHJvbGxlciB3aXRoXG4gICAgICAgICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICAgICAgQSBwcm9taXNlIHJlc29sdmVkIHdoZW4gcmVuZGVyaW5nIGlzIGNvbXBsZXRlXG4gICAgICAgICAqL1xuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKHRlbXBsYXRlLCBjb250cm9sbGVyLCBsb2NhbHMpIHtcbiAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgJGVsZW1lbnQuaHRtbCh0ZW1wbGF0ZSk7XG5cbiAgICAgICAgICAvLyBDb21waWxlXG4gICAgICAgICAgdmFyIGxpbmsgPSAkY29tcGlsZSgkZWxlbWVudC5jb250ZW50cygpKTtcblxuICAgICAgICAgIC8vIENvbnRyb2xsZXJcbiAgICAgICAgICBpZihjb250cm9sbGVyKSB7XG4gICAgICAgICAgICB2YXIgX2xvY2FscyA9IGFuZ3VsYXIuZXh0ZW5kKHt9LCBsb2NhbHMgfHwge30sIHtcbiAgICAgICAgICAgICAgJHNjb3BlOiBzY29wZS4kcGFyZW50XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICRjb250cm9sbGVyKGNvbnRyb2xsZXIsIF9sb2NhbHMpO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIExpbmtcbiAgICAgICAgICBsaW5rKHNjb3BlLiRwYXJlbnQpO1xuXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9LFxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZXNldCB2aWV3XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UgcmVzb2x2ZWQgd2hlbiByZW5kZXJpbmcgaXMgY29tcGxldGVcbiAgICAgICAgICovXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgZGVmZXJyZWQgPSAkcS5kZWZlcigpO1xuXG4gICAgICAgICAgLy8gRW1wdHlcbiAgICAgICAgICAkZWxlbWVudC5lbXB0eSgpO1xuXG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSgpO1xuICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gRGVzdHJveVxuICAgICAgJGVsZW1lbnQub24oJyRkZXN0cm95JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIF92aWV3LmRlc3Ryb3koKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn1dO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgYW5ndWxhcjpmYWxzZSAqL1xuXG4vLyBDb21tb25KU1xuaWYgKHR5cGVvZiBtb2R1bGUgIT09IFwidW5kZWZpbmVkXCIgJiYgdHlwZW9mIGV4cG9ydHMgIT09IFwidW5kZWZpbmVkXCIgJiYgbW9kdWxlLmV4cG9ydHMgPT09IGV4cG9ydHMpe1xuICBtb2R1bGUuZXhwb3J0cyA9ICdhbmd1bGFyLXN0YXRlLXZpZXcnO1xufVxuXG4vLyBBc3N1bWUgcG9seWZpbGwgdXNlZCBpbiBTdGF0ZVJvdXRlciBleGlzdHNcblxuLy8gSW5zdGFudGlhdGUgbW9kdWxlXG5hbmd1bGFyLm1vZHVsZSgnYW5ndWxhci1zdGF0ZS12aWV3JywgWydhbmd1bGFyLXN0YXRlLXJvdXRlciddKVxuXG4gIC5mYWN0b3J5KCckdmlld01hbmFnZXInLCByZXF1aXJlKCcuL3NlcnZpY2VzL3ZpZXctbWFuYWdlcicpKVxuXG4gIC5kaXJlY3RpdmUoJ3N2aWV3JywgcmVxdWlyZSgnLi9kaXJlY3RpdmVzL3N0YXRlLXZpZXcnKSk7XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGdsb2JhbCB3aW5kb3c6ZmFsc2UgKi9cblxudmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBWaWV3ID0gcmVxdWlyZSgnLi4vdmlldy92aWV3Jyk7XG52YXIgcHJvY2VzcyA9IHJlcXVpcmUoJy4uLy4uL25vZGVfbW9kdWxlcy9hbmd1bGFyLXN0YXRlLXJvdXRlci9zcmMvdXRpbHMvcHJvY2VzcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHN0YXRlJywgJyRpbmplY3RvcicsICckcScsIGZ1bmN0aW9uKCRzdGF0ZSwgJGluamVjdG9yLCAkcSkge1xuXG4gIC8vIEluc3RhbmNlIG9mIEV2ZW50RW1pdHRlclxuICB2YXIgX3NlbGYgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgdmFyIF92aWV3SGFzaCA9IHt9O1xuICB2YXIgX2FjdGl2ZUhhc2ggPSB7fTtcblxuICAvKipcbiAgICogUmVzZXQgYWN0aXZlIHZpZXdzXG4gICAqIFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gY3VycmVudGx5IGFjdGl2ZSB2aWV3cyBhcmUgcmVzZXRcbiAgICovXG4gIHZhciBfcmVzZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXNldCB2aWV3c1xuICAgIHZhciByZXNldFByb21pc2VkID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKF9hY3RpdmVIYXNoLCBmdW5jdGlvbih2aWV3LCBpZCkge1xuICAgICAgcmVzZXRQcm9taXNlZFtpZF0gPSAkcS53aGVuKHZpZXcucmVzZXQoKSk7XG4gICAgfSk7XG4gICAgX2FjdGl2ZUhhc2ggPSB7fTtcblxuICAgIHJldHVybiAkcS5hbGwocmVzZXRQcm9taXNlZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCB0ZW1wbGF0ZXNcbiAgICogXG4gICAqIEBwYXJhbSAge01peGVkfSAgIGRhdGEgVGVtcGxhdGUgZGF0YSwgU3RyaW5nIHNyYyB0byBpbmNsdWRlIG9yIEZ1bmN0aW9uIGludm9jYXRpb25cbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gdGVtcGxhdGVzIHJldGlyZXZlZFxuICAgKi9cbiAgdmFyIF9nZXRUZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSBhbmd1bGFyLmlzU3RyaW5nKGRhdGEpID8gJzxuZy1pbmNsdWRlIHNyYz1cIlxcJycrZGF0YSsnXFwnXCI+PC9uZy1pbmNsdWRlPicgOiAkaW5qZWN0b3IuaW52b2tlKGRhdGEpO1xuICAgIHJldHVybiAkcS53aGVuKHRlbXBsYXRlKTtcbiAgfTtcblxuICAvKipcbiAgICogUmVuZGVyIGEgdmlld1xuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgaWQgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge1ZpZXd9ICAgIHZpZXcgICBBIHZpZXcgaW5zdGFuY2VcbiAgICogQHBhcmFtICB7TWl4ZWR9ICAgZGF0YSAgIFRlbXBsYXRlIGRhdGEsIFN0cmluZyBzcmMgdG8gaW5jbHVkZSBvciBGdW5jdGlvbiBpbnZvY2F0aW9uXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gY3VycmVudGx5IGFjdGl2ZSB2aWV3IGlzIHJlbmRlcmVkXG4gICAqL1xuICB2YXIgX3JlbmRlclZpZXcgPSBmdW5jdGlvbihpZCwgdmlldywgZGF0YSwgY29udHJvbGxlcikge1xuICAgIHJldHVybiBfZ2V0VGVtcGxhdGUoZGF0YSkudGhlbihmdW5jdGlvbih0ZW1wbGF0ZSkge1xuXG4gICAgICAvLyBDb250cm9sbGVyXG4gICAgICBpZihjb250cm9sbGVyKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLmN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHZpZXcucmVuZGVyKHRlbXBsYXRlLCBjb250cm9sbGVyLCBjdXJyZW50LmxvY2Fscyk7XG5cbiAgICAgIC8vIFRlbXBsYXRlIG9ubHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2aWV3LnJlbmRlcih0ZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSByZW5kZXJlZCB2aWV3c1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGNvbXBsZXRpb24gY2FsbGJhY2ssIGZ1bmN0aW9uKGVycilcbiAgICovXG4gIHZhciBfdXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBBY3RpdmF0ZSBjdXJyZW50XG4gICAgdmFyIGN1cnJlbnQgPSAkc3RhdGUuY3VycmVudCgpO1xuXG4gICAgaWYoY3VycmVudCkge1xuXG4gICAgICAvLyBSZXNldFxuICAgICAgX3Jlc2V0QWN0aXZlKCkudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBSZW5kZXJcbiAgICAgICAgdmFyIHZpZXdzUHJvbWlzZWQgPSB7fTtcbiAgICAgICAgdmFyIHRlbXBsYXRlcyA9IGN1cnJlbnQudGVtcGxhdGVzIHx8IHt9O1xuICAgICAgICB2YXIgY29udHJvbGxlcnMgPSBjdXJyZW50LmNvbnRyb2xsZXJzIHx8IHt9O1xuICAgICAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCBmdW5jdGlvbih0ZW1wbGF0ZSwgaWQpIHtcbiAgICAgICAgICBpZihfdmlld0hhc2hbaWRdKSB7XG4gICAgICAgICAgICB2YXIgdmlldyA9IF92aWV3SGFzaFtpZF07XG4gICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IGNvbnRyb2xsZXJzW2lkXTtcbiAgICAgICAgICAgIHZpZXdzUHJvbWlzZWRbaWRdID0gX3JlbmRlclZpZXcoaWQsIHZpZXcsIHRlbXBsYXRlLCBjb250cm9sbGVyKTtcbiAgICAgICAgICAgIF9hY3RpdmVIYXNoW2lkXSA9IHZpZXc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkcS5hbGwodmlld3NQcm9taXNlZCkudGhlbihmdW5jdGlvbih2aWV3cykge1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soY2FsbGJhY2spO1xuXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soYW5ndWxhci5iaW5kKG51bGwsIGNhbGxiYWNrLCBlcnIpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGFuZ3VsYXIuYmluZChudWxsLCBjYWxsYmFjaywgZXJyKSk7XG4gICAgICB9KTtcblxuICAgIC8vIE5vbmVcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVyIGEgdmlld1xuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICBpZCBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgIEl0c2VsZiwgY2hhaW5hYmxlXG4gICAqL1xuICB2YXIgX3VucmVnaXN0ZXIgPSBmdW5jdGlvbihpZCkge1xuICAgIGRlbGV0ZSBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHZpZXcsIGFsc28gaW1wbGVtZW50cyBkZXN0cm95IG1ldGhvZCBvbiB2aWV3IHRvIHVucmVnaXN0ZXIgZnJvbSBtYW5hZ2VyXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgIGlkICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICAgICAgICB2aWV3IEEgdmlldyBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgICAgSXRzZWxmLCBjaGFpbmFibGVcbiAgICovXG4gIHZhciBfcmVnaXN0ZXIgPSBmdW5jdGlvbihpZCwgdmlldykge1xuICAgIC8vIE5vIGlkXG4gICAgaWYoIWlkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYW4gaWQuJyk7XG5cbiAgICAvLyBSZXF1aXJlIHVuaXF1ZSBpZFxuICAgIH0gZWxzZSBpZihfdmlld0hhc2hbaWRdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYSB1bmlxdWUgaWQnKTtcblxuICAgIC8vIEFkZFxuICAgIH0gZWxzZSB7XG4gICAgICBfdmlld0hhc2hbaWRdID0gdmlldztcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB2aWV3IGlzIGN1cnJlbnRseSBhY3RpdmVcbiAgICB2YXIgY3VycmVudCA9ICRzdGF0ZS5jdXJyZW50KCkgfHwge307XG4gICAgdmFyIHRlbXBsYXRlcyA9IGN1cnJlbnQudGVtcGxhdGVzIHx8IHt9O1xuICAgIHZhciBjb250cm9sbGVycyA9IGN1cnJlbnQuY29udHJvbGxlcnMgfHwge307XG4gICAgaWYoISF0ZW1wbGF0ZXNbaWRdKSB7XG4gICAgICBfcmVuZGVyVmlldyhpZCwgdmlldywgdGVtcGxhdGVzW2lkXSwgY29udHJvbGxlcnNbaWRdKTtcbiAgICB9XG5cbiAgICAvLyBJbXBsZW1lbnQgZGVzdHJveSBtZXRob2RcbiAgICB2aWV3LmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgIF91bnJlZ2lzdGVyKGlkKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgZmFjdG9yeSBtZXRob2QgdG8gY3JlYXRlIGEgVmlldyBpbnN0YW5jZVxuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge09iamVjdH0gZGF0YSBBIGRhdGEgb2JqZWN0IHVzZWQgdG8gZXh0ZW5kIGFic3RyYWN0IG1ldGhvZHNcbiAgICogQHJldHVybiB7Vmlld30gICAgICAgIEEgVmlldyBlbnRpdGl0eVxuICAgKi9cbiAgX3NlbGYuY3JlYXRlID0gZnVuY3Rpb24oaWQsIGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgIC8vIENyZWF0ZVxuICAgIHZhciB2aWV3ID0gVmlldyhpZCwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlclxuICAgIHJldHVybiBfcmVnaXN0ZXIoaWQsIHZpZXcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSB2aWV3IGJ5IGlkXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5nZXQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBVcGRhdGVcbiAgICovXG4gIF9zZWxmLiR1cGRhdGUgPSBfdXBkYXRlO1xuXG4gIC8vIFJlZ2lzdGVyIG1pZGRsZXdhcmUgbGF5ZXJcbiAgJHN0YXRlLiR1c2UoZnVuY3Rpb24ocmVxdWVzdCwgbmV4dCkge1xuICAgIF91cGRhdGUoZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZihlcnIpIHtcbiAgICAgICAgX3NlbGYuZW1pdCgnZXJyb3I6cmVuZGVyJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIG5leHQoZXJyKTtcbiAgICAgIH1cblxuICAgICAgX3NlbGYuZW1pdCgndXBkYXRlOnJlbmRlcicpO1xuICAgICAgbmV4dCgpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gX3NlbGY7XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBWaWV3XG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBpZCAgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gKiBAcGFyYW0gIHtPYmplY3R9IGNoaWxkICAgQSBkYXRhIG9iamVjdCB1c2VkIHRvIGV4dGVuZCBhYnN0cmFjdCBtZXRob2RzXG4gKiBAcmV0dXJuIHtWaWV3fSAgICAgICAgICAgQW4gYWJzdHJhY3QgdmlldyBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBWaWV3KGlkLCBjaGlsZCkge1xuXG4gIC8vIEluc3RhbmNlXG4gIHZhciBfc2VsZjtcbiAgX3NlbGYgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZW5kZXIgbWV0aG9kXG4gICAgICovXG4gICAgcmVuZGVyOiBmdW5jdGlvbih0ZW1wbGF0ZSkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgcmVzZXQgbWV0aG9kXG4gICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgZGVzdHJveSBtZXRob2RcbiAgICAgKi9cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHsgfVxuXG4gIH07XG5cbiAgLy8gRXh0ZW5kIHRvIG92ZXJ3cml0ZSBhYnN0cmFjdCBtZXRob2RzXG4gIGFuZ3VsYXIuZXh0ZW5kKF9zZWxmLCBjaGlsZCk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufTtcbiJdfQ==
