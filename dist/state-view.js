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

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', '$log', function ($state, $viewManager, $templateCache, $compile, $log) {

  return {
    restrict: 'EA',
    scope: {

    },
    link: function(scope, element, attrs) {

      // Create view
      var _view = $viewManager.create(attrs.id, {

        // Element
        $element: element,

        // Render
        render: function(data) {
          var renderer = $compile(data);
          element.html(renderer(scope.$parent));
        },

        reset: function() {
          element.html('');
        }
      });

      // Destroy
      element.on('$destroy', function() {
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
  var _activeList = [];

  /**
   * A promise to fulfill view template translation
   * 
   * @param  {String} id       Unique identifier for view
   * @param  {Mixed}  template A state defined template to render into the view
   * @param  {View}   view     A View associated with the id
   * @return {Promise}         A $q.defer().promise
   */
  var _promiseTemplate = function(id, template, view) {
    var promise;

    // Defined template
    if(typeof template !== 'undefined' && template !== null) {

      // Functional
      if(angular.isFunction(template)) {
        promise = $q(function(resolve, reject) {

          // Execute asynchronously
          process.nextTick(function() {

            // Ensure promise
            $q.when($injector.invoke(template)).then(
              function(res) {
                view.render(res);
                resolve(res);
              }
            );

          });
        });

      // Other
      } else {

        // Ensure promise
        promise = $q.when('<ng-include src="\''+template+'\'"></ng-include>').then(function(res) {
          view.render(res);
        });
      }

    // Empty
    } else {
      var deferEmpty = $q.defer();

      // Resolve
      deferEmpty.resolve();

      promise = deferEmpty.promise;
    }

    return promise;
  };

  /**
   * Update rendered views
   *
   * @param {Function} callback A completion callback, function(err)
   */
  var _update = function(callback) {
    // Reset
    _activeList.forEach(function(view) {
      view.reset();
    });

    // Current
    var current = $state.current() || {};
    var templateHash = current.templates || {};
    var templateList = (Object.keys(templateHash) || [])
      .filter(function(id) {
        return !!_viewHash[id];
      });

    // Active views
    _activeList = templateList
      .map(function(id) {
        return _viewHash[id];
      });

    // Render execution
    if(!!templateList.length) {
      $q.all(templateList

        // Map to provider
        .map(function(id) {
          return _promiseTemplate(id, templateHash[id], _viewHash[id]);
        }))
        .then(function() {
          _self.emit('update:render');
          process.nextTick(callback);

        }, function(err) {
          _self.emit('error:render', err);
          callback(err);
        });

    // Empty
    } else {
      _self.emit('update:render');
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

    } else {
      _viewHash[id] = view;
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
  _self.update = _update;

  // Register middleware layer
  $state.$use(function(request, next) {
    _update(next);
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
module.exports = function(id, child) {
  // Instance
  var _self;
  _self = {

    /**
     * Abstract render
     */
    render: function() { },

    /**
     * Abstract reset
     */
    reset: function() { },

    /**
     * Abstract destroy
     */
    destroy: function() { }

  };

  // Extend to overwrite abstract methods
  angular.extend(_self, child);

  return _self;
};

},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QkFBaUIsSUFBSSxhQUFhLEtBQUssVUFBVTs7U0FFekQsS0FBSyxXQUFXO1VBQ2YsTUFBTSxLQUFLO1VBQ1gsUUFBUSxTQUFTOztXQUVoQixTQUFTLEtBQUs7VUFDZixNQUFNLEtBQUssZ0JBQWdCO1VBQzNCLFNBQVM7Ozs7V0FJUjtNQUNMLE1BQU0sS0FBSztNQUNYLFFBQVEsU0FBUzs7Ozs7Ozs7OztFQVVyQixJQUFJLGNBQWMsU0FBUyxJQUFJO0lBQzdCLE9BQU8sVUFBVTs7Ozs7Ozs7OztFQVVuQixJQUFJLFlBQVksU0FBUyxJQUFJLE1BQU07O0lBRWpDLEdBQUcsQ0FBQyxJQUFJO01BQ04sTUFBTSxJQUFJLE1BQU07OztXQUdYLEdBQUcsVUFBVSxLQUFLO01BQ3ZCLE1BQU0sSUFBSSxNQUFNOztXQUVYO01BQ0wsVUFBVSxNQUFNOzs7O0lBSWxCLEtBQUssVUFBVSxXQUFXO01BQ3hCLFlBQVk7OztJQUdkLE9BQU87Ozs7Ozs7Ozs7RUFVVCxNQUFNLFNBQVMsU0FBUyxJQUFJLE1BQU07SUFDaEMsT0FBTyxRQUFROzs7SUFHZixJQUFJLE9BQU8sS0FBSyxJQUFJOzs7SUFHcEIsT0FBTyxVQUFVLElBQUk7Ozs7Ozs7OztFQVN2QixNQUFNLE1BQU0sU0FBUyxJQUFJO0lBQ3ZCLE9BQU8sVUFBVTs7Ozs7O0VBTW5CLE1BQU0sU0FBUzs7O0VBR2YsT0FBTyxLQUFLLFNBQVMsU0FBUyxNQUFNO0lBQ2xDLFFBQVE7OztFQUdWLE9BQU87O0FBRVQ7O0FDcE1BOzs7Ozs7Ozs7QUFTQSxPQUFPLFVBQVUsU0FBUyxJQUFJLE9BQU87O0VBRW5DLElBQUk7RUFDSixRQUFROzs7OztJQUtOLFFBQVEsV0FBVzs7Ozs7SUFLbkIsT0FBTyxXQUFXOzs7OztJQUtsQixTQUFTLFdBQVc7Ozs7O0VBS3RCLFFBQVEsT0FBTyxPQUFPOztFQUV0QixPQUFPOztBQUVUIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIHdpbmRvdzpmYWxzZSAqL1xuLyogZ2xvYmFsIHByb2Nlc3M6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRJbW1lZGlhdGU6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRUaW1lb3V0OmZhbHNlICovXG5cbnZhciBfcHJvY2VzcyA9IHtcbiAgbmV4dFRpY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3Byb2Nlc3M7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHN0YXRlJywgJyR2aWV3TWFuYWdlcicsICckdGVtcGxhdGVDYWNoZScsICckY29tcGlsZScsICckbG9nJywgZnVuY3Rpb24gKCRzdGF0ZSwgJHZpZXdNYW5hZ2VyLCAkdGVtcGxhdGVDYWNoZSwgJGNvbXBpbGUsICRsb2cpIHtcblxuICByZXR1cm4ge1xuICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgIHNjb3BlOiB7XG5cbiAgICB9LFxuICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuXG4gICAgICAvLyBDcmVhdGUgdmlld1xuICAgICAgdmFyIF92aWV3ID0gJHZpZXdNYW5hZ2VyLmNyZWF0ZShhdHRycy5pZCwge1xuXG4gICAgICAgIC8vIEVsZW1lbnRcbiAgICAgICAgJGVsZW1lbnQ6IGVsZW1lbnQsXG5cbiAgICAgICAgLy8gUmVuZGVyXG4gICAgICAgIHJlbmRlcjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAgIHZhciByZW5kZXJlciA9ICRjb21waWxlKGRhdGEpO1xuICAgICAgICAgIGVsZW1lbnQuaHRtbChyZW5kZXJlcihzY29wZS4kcGFyZW50KSk7XG4gICAgICAgIH0sXG5cbiAgICAgICAgcmVzZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGVsZW1lbnQuaHRtbCgnJyk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICAvLyBEZXN0cm95XG4gICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICBfdmlldy5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIGFuZ3VsYXI6ZmFsc2UgKi9cblxuLy8gQ29tbW9uSlNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzID09PSBleHBvcnRzKXtcbiAgbW9kdWxlLmV4cG9ydHMgPSAnYW5ndWxhci1zdGF0ZS12aWV3Jztcbn1cblxuLy8gQXNzdW1lIHBvbHlmaWxsIHVzZWQgaW4gU3RhdGVSb3V0ZXIgZXhpc3RzXG5cbi8vIEluc3RhbnRpYXRlIG1vZHVsZVxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXItc3RhdGUtdmlldycsIFsnYW5ndWxhci1zdGF0ZS1yb3V0ZXInXSlcblxuICAuZmFjdG9yeSgnJHZpZXdNYW5hZ2VyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy92aWV3LW1hbmFnZXInKSlcblxuICAuZGlyZWN0aXZlKCdzdmlldycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9zdGF0ZS12aWV3JykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgd2luZG93OmZhbHNlICovXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcvdmlldycpO1xudmFyIHByb2Nlc3MgPSByZXF1aXJlKCcuLi8uLi9ub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBbJyRzdGF0ZScsICckaW5qZWN0b3InLCAnJHEnLCBmdW5jdGlvbigkc3RhdGUsICRpbmplY3RvciwgJHEpIHtcblxuICAvLyBJbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXJcbiAgdmFyIF9zZWxmID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciBfdmlld0hhc2ggPSB7fTtcbiAgdmFyIF9hY3RpdmVMaXN0ID0gW107XG5cbiAgLyoqXG4gICAqIEEgcHJvbWlzZSB0byBmdWxmaWxsIHZpZXcgdGVtcGxhdGUgdHJhbnNsYXRpb25cbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7TWl4ZWR9ICB0ZW1wbGF0ZSBBIHN0YXRlIGRlZmluZWQgdGVtcGxhdGUgdG8gcmVuZGVyIGludG8gdGhlIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICB2aWV3ICAgICBBIFZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgIEEgJHEuZGVmZXIoKS5wcm9taXNlXG4gICAqL1xuICB2YXIgX3Byb21pc2VUZW1wbGF0ZSA9IGZ1bmN0aW9uKGlkLCB0ZW1wbGF0ZSwgdmlldykge1xuICAgIHZhciBwcm9taXNlO1xuXG4gICAgLy8gRGVmaW5lZCB0ZW1wbGF0ZVxuICAgIGlmKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdGVtcGxhdGUgIT09IG51bGwpIHtcblxuICAgICAgLy8gRnVuY3Rpb25hbFxuICAgICAgaWYoYW5ndWxhci5pc0Z1bmN0aW9uKHRlbXBsYXRlKSkge1xuICAgICAgICBwcm9taXNlID0gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gRW5zdXJlIHByb21pc2VcbiAgICAgICAgICAgICRxLndoZW4oJGluamVjdG9yLmludm9rZSh0ZW1wbGF0ZSkpLnRoZW4oXG4gICAgICAgICAgICAgIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKHJlcyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBPdGhlclxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICAvLyBFbnN1cmUgcHJvbWlzZVxuICAgICAgICBwcm9taXNlID0gJHEud2hlbignPG5nLWluY2x1ZGUgc3JjPVwiXFwnJyt0ZW1wbGF0ZSsnXFwnXCI+PC9uZy1pbmNsdWRlPicpLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG4gICAgICAgICAgdmlldy5yZW5kZXIocmVzKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAvLyBFbXB0eVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZGVmZXJFbXB0eSA9ICRxLmRlZmVyKCk7XG5cbiAgICAgIC8vIFJlc29sdmVcbiAgICAgIGRlZmVyRW1wdHkucmVzb2x2ZSgpO1xuXG4gICAgICBwcm9taXNlID0gZGVmZXJFbXB0eS5wcm9taXNlO1xuICAgIH1cblxuICAgIHJldHVybiBwcm9taXNlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBVcGRhdGUgcmVuZGVyZWQgdmlld3NcbiAgICpcbiAgICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgQSBjb21wbGV0aW9uIGNhbGxiYWNrLCBmdW5jdGlvbihlcnIpXG4gICAqL1xuICB2YXIgX3VwZGF0ZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgLy8gUmVzZXRcbiAgICBfYWN0aXZlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHZpZXcpIHtcbiAgICAgIHZpZXcucmVzZXQoKTtcbiAgICB9KTtcblxuICAgIC8vIEN1cnJlbnRcbiAgICB2YXIgY3VycmVudCA9ICRzdGF0ZS5jdXJyZW50KCkgfHwge307XG4gICAgdmFyIHRlbXBsYXRlSGFzaCA9IGN1cnJlbnQudGVtcGxhdGVzIHx8IHt9O1xuICAgIHZhciB0ZW1wbGF0ZUxpc3QgPSAoT2JqZWN0LmtleXModGVtcGxhdGVIYXNoKSB8fCBbXSlcbiAgICAgIC5maWx0ZXIoZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuICEhX3ZpZXdIYXNoW2lkXTtcbiAgICAgIH0pO1xuXG4gICAgLy8gQWN0aXZlIHZpZXdzXG4gICAgX2FjdGl2ZUxpc3QgPSB0ZW1wbGF0ZUxpc3RcbiAgICAgIC5tYXAoZnVuY3Rpb24oaWQpIHtcbiAgICAgICAgcmV0dXJuIF92aWV3SGFzaFtpZF07XG4gICAgICB9KTtcblxuICAgIC8vIFJlbmRlciBleGVjdXRpb25cbiAgICBpZighIXRlbXBsYXRlTGlzdC5sZW5ndGgpIHtcbiAgICAgICRxLmFsbCh0ZW1wbGF0ZUxpc3RcblxuICAgICAgICAvLyBNYXAgdG8gcHJvdmlkZXJcbiAgICAgICAgLm1hcChmdW5jdGlvbihpZCkge1xuICAgICAgICAgIHJldHVybiBfcHJvbWlzZVRlbXBsYXRlKGlkLCB0ZW1wbGF0ZUhhc2hbaWRdLCBfdmlld0hhc2hbaWRdKTtcbiAgICAgICAgfSkpXG4gICAgICAgIC50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF9zZWxmLmVtaXQoJ3VwZGF0ZTpyZW5kZXInKTtcbiAgICAgICAgICBwcm9jZXNzLm5leHRUaWNrKGNhbGxiYWNrKTtcblxuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBfc2VsZi5lbWl0KCdlcnJvcjpyZW5kZXInLCBlcnIpO1xuICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgLy8gRW1wdHlcbiAgICB9IGVsc2Uge1xuICAgICAgX3NlbGYuZW1pdCgndXBkYXRlOnJlbmRlcicpO1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBVbnJlZ2lzdGVyIGEgdmlld1xuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICBpZCBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgIEl0c2VsZiwgY2hhaW5hYmxlXG4gICAqL1xuICB2YXIgX3VucmVnaXN0ZXIgPSBmdW5jdGlvbihpZCkge1xuICAgIGRlbGV0ZSBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHZpZXcsIGFsc28gaW1wbGVtZW50cyBkZXN0cm95IG1ldGhvZCBvbiB2aWV3IHRvIHVucmVnaXN0ZXIgZnJvbSBtYW5hZ2VyXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgIGlkICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICAgICAgICB2aWV3IEEgdmlldyBpbnN0YW5jZVxuICAgKiBAcmV0dXJuIHskdmlld01hbmFnZXJ9ICAgICAgSXRzZWxmLCBjaGFpbmFibGVcbiAgICovXG4gIHZhciBfcmVnaXN0ZXIgPSBmdW5jdGlvbihpZCwgdmlldykge1xuICAgIC8vIE5vIGlkXG4gICAgaWYoIWlkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYW4gaWQuJyk7XG5cbiAgICAvLyBSZXF1aXJlIHVuaXF1ZSBpZFxuICAgIH0gZWxzZSBpZihfdmlld0hhc2hbaWRdKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZpZXcgcmVxdWlyZXMgYSB1bmlxdWUgaWQnKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBfdmlld0hhc2hbaWRdID0gdmlldztcbiAgICB9XG5cbiAgICAvLyBJbXBsZW1lbnQgZGVzdHJveSBtZXRob2RcbiAgICB2aWV3LmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgIF91bnJlZ2lzdGVyKGlkKTtcbiAgICB9O1xuXG4gICAgcmV0dXJuIHZpZXc7XG4gIH07XG5cbiAgLyoqXG4gICAqIEEgZmFjdG9yeSBtZXRob2QgdG8gY3JlYXRlIGEgVmlldyBpbnN0YW5jZVxuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZCAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge09iamVjdH0gZGF0YSBBIGRhdGEgb2JqZWN0IHVzZWQgdG8gZXh0ZW5kIGFic3RyYWN0IG1ldGhvZHNcbiAgICogQHJldHVybiB7Vmlld30gICAgICAgIEEgVmlldyBlbnRpdGl0eVxuICAgKi9cbiAgX3NlbGYuY3JlYXRlID0gZnVuY3Rpb24oaWQsIGRhdGEpIHtcbiAgICBkYXRhID0gZGF0YSB8fCB7fTtcblxuICAgIC8vIENyZWF0ZVxuICAgIHZhciB2aWV3ID0gVmlldyhpZCwgZGF0YSk7XG5cbiAgICAvLyBSZWdpc3RlclxuICAgIHJldHVybiBfcmVnaXN0ZXIoaWQsIHZpZXcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSB2aWV3IGJ5IGlkXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5nZXQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBVcGRhdGVcbiAgICovXG4gIF9zZWxmLnVwZGF0ZSA9IF91cGRhdGU7XG5cbiAgLy8gUmVnaXN0ZXIgbWlkZGxld2FyZSBsYXllclxuICAkc3RhdGUuJHVzZShmdW5jdGlvbihyZXF1ZXN0LCBuZXh0KSB7XG4gICAgX3VwZGF0ZShuZXh0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufV07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlld1xuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICogQHBhcmFtICB7T2JqZWN0fSBjaGlsZCAgIEEgZGF0YSBvYmplY3QgdXNlZCB0byBleHRlbmQgYWJzdHJhY3QgbWV0aG9kc1xuICogQHJldHVybiB7Vmlld30gICAgICAgICAgIEFuIGFic3RyYWN0IHZpZXcgb2JqZWN0XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaWQsIGNoaWxkKSB7XG4gIC8vIEluc3RhbmNlXG4gIHZhciBfc2VsZjtcbiAgX3NlbGYgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZW5kZXJcbiAgICAgKi9cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgcmVzZXRcbiAgICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24oKSB7IH0sXG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCBkZXN0cm95XG4gICAgICovXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7IH1cblxuICB9O1xuXG4gIC8vIEV4dGVuZCB0byBvdmVyd3JpdGUgYWJzdHJhY3QgbWV0aG9kc1xuICBhbmd1bGFyLmV4dGVuZChfc2VsZiwgY2hpbGQpO1xuXG4gIHJldHVybiBfc2VsZjtcbn07XG4iXX0=
