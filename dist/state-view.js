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

module.exports = ['$state', '$injector', '$q', '$log', function($state, $injector, $q, $log) {

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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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SUFHZixJQUFJLE9BQU8sS0FBSyxJQUFJOzs7SUFHcEIsT0FBTyxVQUFVLElBQUk7Ozs7Ozs7OztFQVN2QixNQUFNLE1BQU0sU0FBUyxJQUFJO0lBQ3ZCLE9BQU8sVUFBVTs7Ozs7O0VBTW5CLE1BQU0sVUFBVTs7O0VBR2hCLE9BQU8sS0FBSyxTQUFTLFNBQVMsTUFBTTtJQUNsQyxRQUFRLFNBQVMsS0FBSztNQUNwQixHQUFHLEtBQUs7UUFDTixNQUFNLEtBQUssZ0JBQWdCO1FBQzNCLE9BQU8sS0FBSzs7O01BR2QsTUFBTSxLQUFLO01BQ1g7Ozs7RUFJSixPQUFPOztBQUVUOztBQzVNQTs7Ozs7Ozs7O0FBU0EsT0FBTyxVQUFVLFNBQVMsS0FBSyxJQUFJLE9BQU87OztFQUd4QyxJQUFJO0VBQ0osUUFBUTs7Ozs7SUFLTixRQUFRLFNBQVMsVUFBVTs7Ozs7SUFLM0IsT0FBTyxXQUFXOzs7OztJQUtsQixTQUFTLFdBQVc7Ozs7O0VBS3RCLFFBQVEsT0FBTyxPQUFPOztFQUV0QixPQUFPOztBQUVUIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIHdpbmRvdzpmYWxzZSAqL1xuLyogZ2xvYmFsIHByb2Nlc3M6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRJbW1lZGlhdGU6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRUaW1lb3V0OmZhbHNlICovXG5cbnZhciBfcHJvY2VzcyA9IHtcbiAgbmV4dFRpY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3Byb2Nlc3M7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHN0YXRlJywgJyR2aWV3TWFuYWdlcicsICckdGVtcGxhdGVDYWNoZScsICckY29tcGlsZScsICckY29udHJvbGxlcicsICckcScsIGZ1bmN0aW9uICgkc3RhdGUsICR2aWV3TWFuYWdlciwgJHRlbXBsYXRlQ2FjaGUsICRjb21waWxlLCAkY29udHJvbGxlciwgJHEpIHtcbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBwcmlvcml0eTogNDAwLFxuICAgIHNjb3BlOiB7XG5cbiAgICB9LFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCAkZWxlbWVudCwgYXR0cnMpIHtcbiAgICAgIC8vIENyZWF0ZSB2aWV3XG4gICAgICB2YXIgX3ZpZXcgPSAkdmlld01hbmFnZXIuY3JlYXRlKGF0dHJzLmlkLCB7XG5cbiAgICAgICAgLy8gRWxlbWVudFxuICAgICAgICAkZWxlbWVudDogJGVsZW1lbnQsXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbmRlciB2aWV3XG4gICAgICAgICAqIFxuICAgICAgICAgKiBAcGFyYW0gIHtTdHJpbmd9ICB0ZW1wbGF0ZSAgIEEgdGVtcGxhdGUgdG8gdXNlXG4gICAgICAgICAqIEBwYXJhbSAge01peGVkfSAgIGNvbnRyb2xsZXIgQSBjb250cm9sbGVyIHRvIGF0dGFjaCBhcHBsaWVkIHRvIHNjb3BlLiRwYXJlbnRcbiAgICAgICAgICogQHBhcmFtICB7T2JqZWN0fSAgbG9jYWxzICAgICBBIGRhdGEgT2JqZWN0IHRvIGluc3RhbnRpYXRlIGNvbnRyb2xsZXIgd2l0aFxuICAgICAgICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgICAgIEEgcHJvbWlzZSByZXNvbHZlZCB3aGVuIHJlbmRlcmluZyBpcyBjb21wbGV0ZVxuICAgICAgICAgKi9cbiAgICAgICAgcmVuZGVyOiBmdW5jdGlvbih0ZW1wbGF0ZSwgY29udHJvbGxlciwgbG9jYWxzKSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgICRlbGVtZW50Lmh0bWwodGVtcGxhdGUpO1xuXG4gICAgICAgICAgLy8gQ29tcGlsZVxuICAgICAgICAgIHZhciBsaW5rID0gJGNvbXBpbGUoJGVsZW1lbnQuY29udGVudHMoKSk7XG5cbiAgICAgICAgICAvLyBDb250cm9sbGVyXG4gICAgICAgICAgaWYoY29udHJvbGxlcikge1xuICAgICAgICAgICAgdmFyIF9sb2NhbHMgPSBhbmd1bGFyLmV4dGVuZCh7fSwgbG9jYWxzIHx8IHt9LCB7XG4gICAgICAgICAgICAgICRzY29wZTogc2NvcGUuJHBhcmVudFxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAkY29udHJvbGxlcihjb250cm9sbGVyLCBfbG9jYWxzKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBMaW5rXG4gICAgICAgICAgbGluayhzY29wZS4kcGFyZW50KTtcblxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfSxcblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVzZXQgdmlld1xuICAgICAgICAgKiBcbiAgICAgICAgICogQHJldHVybiB7UHJvbWlzZX0gQSBwcm9taXNlIHJlc29sdmVkIHdoZW4gcmVuZGVyaW5nIGlzIGNvbXBsZXRlXG4gICAgICAgICAqL1xuICAgICAgICByZXNldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcblxuICAgICAgICAgIC8vIEVtcHR5XG4gICAgICAgICAgJGVsZW1lbnQuZW1wdHkoKTtcblxuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIC8vIERlc3Ryb3lcbiAgICAgICRlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdmlldy5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIGFuZ3VsYXI6ZmFsc2UgKi9cblxuLy8gQ29tbW9uSlNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzID09PSBleHBvcnRzKXtcbiAgbW9kdWxlLmV4cG9ydHMgPSAnYW5ndWxhci1zdGF0ZS12aWV3Jztcbn1cblxuLy8gQXNzdW1lIHBvbHlmaWxsIHVzZWQgaW4gU3RhdGVSb3V0ZXIgZXhpc3RzXG5cbi8vIEluc3RhbnRpYXRlIG1vZHVsZVxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXItc3RhdGUtdmlldycsIFsnYW5ndWxhci1zdGF0ZS1yb3V0ZXInXSlcblxuICAuZmFjdG9yeSgnJHZpZXdNYW5hZ2VyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy92aWV3LW1hbmFnZXInKSlcblxuICAuZGlyZWN0aXZlKCdzdmlldycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9zdGF0ZS12aWV3JykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgd2luZG93OmZhbHNlICovXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcvdmlldycpO1xudmFyIHByb2Nlc3MgPSByZXF1aXJlKCcuLi8uLi9ub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBbJyRzdGF0ZScsICckaW5qZWN0b3InLCAnJHEnLCAnJGxvZycsIGZ1bmN0aW9uKCRzdGF0ZSwgJGluamVjdG9yLCAkcSwgJGxvZykge1xuXG4gIC8vIEluc3RhbmNlIG9mIEV2ZW50RW1pdHRlclxuICB2YXIgX3NlbGYgPSBuZXcgRXZlbnRFbWl0dGVyKCk7XG5cbiAgdmFyIF92aWV3SGFzaCA9IHt9O1xuICB2YXIgX2FjdGl2ZUhhc2ggPSB7fTtcblxuICAvKipcbiAgICogUmVzZXQgYWN0aXZlIHZpZXdzXG4gICAqIFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gY3VycmVudGx5IGFjdGl2ZSB2aWV3cyBhcmUgcmVzZXRcbiAgICovXG4gIHZhciBfcmVzZXRBY3RpdmUgPSBmdW5jdGlvbigpIHtcbiAgICAvLyBSZXNldCB2aWV3c1xuICAgIHZhciByZXNldFByb21pc2VkID0ge307XG4gICAgYW5ndWxhci5mb3JFYWNoKF9hY3RpdmVIYXNoLCBmdW5jdGlvbih2aWV3LCBpZCkge1xuICAgICAgcmVzZXRQcm9taXNlZFtpZF0gPSAkcS53aGVuKHZpZXcucmVzZXQoKSk7XG4gICAgfSk7XG4gICAgX2FjdGl2ZUhhc2ggPSB7fTtcblxuICAgIHJldHVybiAkcS5hbGwocmVzZXRQcm9taXNlZCk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCB0ZW1wbGF0ZXNcbiAgICogXG4gICAqIEBwYXJhbSAge01peGVkfSAgIGRhdGEgVGVtcGxhdGUgZGF0YSwgU3RyaW5nIHNyYyB0byBpbmNsdWRlIG9yIEZ1bmN0aW9uIGludm9jYXRpb25cbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gdGVtcGxhdGVzIHJldGlyZXZlZFxuICAgKi9cbiAgdmFyIF9nZXRUZW1wbGF0ZSA9IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICB2YXIgdGVtcGxhdGUgPSBhbmd1bGFyLmlzU3RyaW5nKGRhdGEpID8gJzxuZy1pbmNsdWRlIHNyYz1cIlxcJycrZGF0YSsnXFwnXCI+PC9uZy1pbmNsdWRlPicgOiAkaW5qZWN0b3IuaW52b2tlKGRhdGEpO1xuICAgIHJldHVybiAkcS53aGVuKHRlbXBsYXRlKTtcbiAgfTtcblxuICAvKipcbiAgICogUmVuZGVyIGEgdmlld1xuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgaWQgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge1ZpZXd9ICAgIHZpZXcgICBBIHZpZXcgaW5zdGFuY2VcbiAgICogQHBhcmFtICB7TWl4ZWR9ICAgZGF0YSAgIFRlbXBsYXRlIGRhdGEsIFN0cmluZyBzcmMgdG8gaW5jbHVkZSBvciBGdW5jdGlvbiBpbnZvY2F0aW9uXG4gICAqIEByZXR1cm4ge1Byb21pc2V9ICAgICAgICBBIHByb21pc2UgZnVsZmlsbGVkIHdoZW4gY3VycmVudGx5IGFjdGl2ZSB2aWV3IGlzIHJlbmRlcmVkXG4gICAqL1xuICB2YXIgX3JlbmRlclZpZXcgPSBmdW5jdGlvbihpZCwgdmlldywgZGF0YSwgY29udHJvbGxlcikge1xuICAgIHJldHVybiBfZ2V0VGVtcGxhdGUoZGF0YSkudGhlbihmdW5jdGlvbih0ZW1wbGF0ZSkge1xuXG4gICAgICAvLyBDb250cm9sbGVyXG4gICAgICBpZihjb250cm9sbGVyKSB7XG4gICAgICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLmN1cnJlbnQoKTtcbiAgICAgICAgcmV0dXJuIHZpZXcucmVuZGVyKHRlbXBsYXRlLCBjb250cm9sbGVyLCBjdXJyZW50LmxvY2Fscyk7XG5cbiAgICAgIC8vIFRlbXBsYXRlIG9ubHlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB2aWV3LnJlbmRlcih0ZW1wbGF0ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSByZW5kZXJlZCB2aWV3c1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGNvbXBsZXRpb24gY2FsbGJhY2ssIGZ1bmN0aW9uKGVycilcbiAgICovXG4gIHZhciBfdXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBBY3RpdmF0ZSBjdXJyZW50XG4gICAgdmFyIGN1cnJlbnQgPSAkc3RhdGUuY3VycmVudCgpO1xuXG4gICAgaWYoY3VycmVudCkge1xuXG4gICAgICAvLyBSZXNldFxuICAgICAgX3Jlc2V0QWN0aXZlKCkudGhlbihmdW5jdGlvbigpIHtcblxuICAgICAgICAvLyBSZW5kZXJcbiAgICAgICAgdmFyIHZpZXdzUHJvbWlzZWQgPSB7fTtcbiAgICAgICAgdmFyIHRlbXBsYXRlcyA9IGN1cnJlbnQudGVtcGxhdGVzIHx8IHt9O1xuICAgICAgICB2YXIgY29udHJvbGxlcnMgPSBjdXJyZW50LmNvbnRyb2xsZXJzIHx8IHt9O1xuICAgICAgICBhbmd1bGFyLmZvckVhY2godGVtcGxhdGVzLCBmdW5jdGlvbih0ZW1wbGF0ZSwgaWQpIHtcbiAgICAgICAgICBpZihfdmlld0hhc2hbaWRdKSB7XG4gICAgICAgICAgICB2YXIgdmlldyA9IF92aWV3SGFzaFtpZF07XG4gICAgICAgICAgICB2YXIgY29udHJvbGxlciA9IGNvbnRyb2xsZXJzW2lkXTtcbiAgICAgICAgICAgIHZpZXdzUHJvbWlzZWRbaWRdID0gX3JlbmRlclZpZXcoaWQsIHZpZXcsIHRlbXBsYXRlLCBjb250cm9sbGVyKTtcbiAgICAgICAgICAgIF9hY3RpdmVIYXNoW2lkXSA9IHZpZXc7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkcS5hbGwodmlld3NQcm9taXNlZCkudGhlbihmdW5jdGlvbih2aWV3cykge1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soY2FsbGJhY2spO1xuXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soYW5ndWxhci5iaW5kKG51bGwsIGNhbGxiYWNrLCBlcnIpKTtcbiAgICAgICAgfSk7XG5cbiAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGFuZ3VsYXIuYmluZChudWxsLCBjYWxsYmFjaywgZXJyKSk7XG4gICAgICB9KTtcblxuICAgIC8vIE5vbmVcbiAgICB9IGVsc2Uge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVyIGEgdmlld1xuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICBpZCBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgIEl0c2VsZiwgY2hhaW5hYmxlXG4gICAqL1xuICB2YXIgX3VucmVnaXN0ZXIgPSBmdW5jdGlvbihpZCkge1xuICAgIGRlbGV0ZSBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHZpZXcsIGFsc28gaW1wbGVtZW50cyBkZXN0cm95IG1ldGhvZCBvbiB2aWV3IHRvIHVucmVnaXN0ZXIgZnJvbSBtYW5hZ2VyXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgIGlkICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICAgICAgICB2aWV3IEEgdmlldyBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgICAgSXRzZWxmLCBjaGFpbmFibGVcbiAgICovXG4gIHZhciBfcmVnaXN0ZXIgPSBmdW5jdGlvbihpZCwgdmlldykge1xuICAgIC8vIE5vIGlkXG4gICAgaWYoIWlkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYW4gaWQuJyk7XG5cbiAgICAvLyBSZXF1aXJlIHVuaXF1ZSBpZFxuICAgIH0gZWxzZSBpZihfdmlld0hhc2hbaWRdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYSB1bmlxdWUgaWQnKTtcblxuICAgIC8vIEFkZFxuICAgIH0gZWxzZSB7XG4gICAgICBfdmlld0hhc2hbaWRdID0gdmlldztcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiB2aWV3IGlzIGN1cnJlbnRseSBhY3RpdmVcbiAgICB2YXIgY3VycmVudCA9ICRzdGF0ZS5jdXJyZW50KCkgfHwge307XG4gICAgdmFyIHRlbXBsYXRlcyA9IGN1cnJlbnQudGVtcGxhdGVzIHx8IHt9O1xuICAgIHZhciBjb250cm9sbGVycyA9IGN1cnJlbnQuY29udHJvbGxlcnMgfHwge307XG4gICAgaWYoISF0ZW1wbGF0ZXNbaWRdKSB7XG4gICAgICBfcmVuZGVyVmlldyhpZCwgdmlldywgdGVtcGxhdGVzW2lkXSwgY29udHJvbGxlcnNbaWRdKTtcbiAgICB9XG5cbiAgICAvLyBJbXBsZW1lbnQgZGVzdHJveSBtZXRob2RcbiAgICB2aWV3LmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgIF91bnJlZ2lzdGVyKGlkKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgZmFjdG9yeSBtZXRob2QgdG8gY3JlYXRlIGEgVmlldyBpbnN0YW5jZVxuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge09iamVjdH0gZGF0YSBBIGRhdGEgb2JqZWN0IHVzZWQgdG8gZXh0ZW5kIGFic3RyYWN0IG1ldGhvZHNcbiAgICogQHJldHVybiB7Vmlld30gICAgICAgIEEgVmlldyBlbnRpdGl0eVxuICAgKi9cbiAgX3NlbGYuY3JlYXRlID0gZnVuY3Rpb24oaWQsIGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgIC8vIENyZWF0ZVxuICAgIHZhciB2aWV3ID0gVmlldyhpZCwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlclxuICAgIHJldHVybiBfcmVnaXN0ZXIoaWQsIHZpZXcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSB2aWV3IGJ5IGlkXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5nZXQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBVcGRhdGVcbiAgICovXG4gIF9zZWxmLiR1cGRhdGUgPSBfdXBkYXRlO1xuXG4gIC8vIFJlZ2lzdGVyIG1pZGRsZXdhcmUgbGF5ZXJcbiAgJHN0YXRlLiR1c2UoZnVuY3Rpb24ocmVxdWVzdCwgbmV4dCkge1xuICAgIF91cGRhdGUoZnVuY3Rpb24oZXJyKSB7XG4gICAgICBpZihlcnIpIHtcbiAgICAgICAgX3NlbGYuZW1pdCgnZXJyb3I6cmVuZGVyJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIG5leHQoZXJyKTtcbiAgICAgIH1cblxuICAgICAgX3NlbGYuZW1pdCgndXBkYXRlOnJlbmRlcicpO1xuICAgICAgbmV4dCgpO1xuICAgIH0pO1xuICB9KTtcblxuICByZXR1cm4gX3NlbGY7XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBWaWV3XG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBpZCAgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gKiBAcGFyYW0gIHtPYmplY3R9IGNoaWxkICAgQSBkYXRhIG9iamVjdCB1c2VkIHRvIGV4dGVuZCBhYnN0cmFjdCBtZXRob2RzXG4gKiBAcmV0dXJuIHtWaWV3fSAgICAgICAgICAgQW4gYWJzdHJhY3QgdmlldyBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBWaWV3KGlkLCBjaGlsZCkge1xuXG4gIC8vIEluc3RhbmNlXG4gIHZhciBfc2VsZjtcbiAgX3NlbGYgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZW5kZXIgbWV0aG9kXG4gICAgICovXG4gICAgcmVuZGVyOiBmdW5jdGlvbih0ZW1wbGF0ZSkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgcmVzZXQgbWV0aG9kXG4gICAgICovXG4gICAgcmVzZXQ6IGZ1bmN0aW9uKCkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgZGVzdHJveSBtZXRob2RcbiAgICAgKi9cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHsgfVxuXG4gIH07XG5cbiAgLy8gRXh0ZW5kIHRvIG92ZXJ3cml0ZSBhYnN0cmFjdCBtZXRob2RzXG4gIGFuZ3VsYXIuZXh0ZW5kKF9zZWxmLCBjaGlsZCk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufTtcbiJdfQ==
