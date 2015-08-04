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
      var _view = $viewManager.create(attrs.id, element, {

        // Element
        $element: element,

        // Render
        render: function(data) {
          $log.log('render', data);

          var renderer = $compile(data);

          element.html(renderer(scope.$parent));
        }

      });

      // Destroy
      element.on('$destroy', function() {
        $log.log('destroy');
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
        promise = $q.when(template).then(function(res) {
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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QixJQUFJLGFBQWEsS0FBSyxVQUFVOztTQUV6RCxLQUFLLFdBQVc7VUFDZixNQUFNLEtBQUs7VUFDWCxRQUFRLFNBQVM7O1dBRWhCLFNBQVMsS0FBSztVQUNmLE1BQU0sS0FBSyxnQkFBZ0I7VUFDM0IsU0FBUzs7OztXQUlSO01BQ0wsTUFBTSxLQUFLO01BQ1gsUUFBUSxTQUFTOzs7Ozs7Ozs7O0VBVXJCLElBQUksY0FBYyxTQUFTLElBQUk7SUFDN0IsT0FBTyxVQUFVOzs7Ozs7Ozs7O0VBVW5CLElBQUksWUFBWSxTQUFTLElBQUksTUFBTTs7SUFFakMsR0FBRyxDQUFDLElBQUk7TUFDTixNQUFNLElBQUksTUFBTTs7O1dBR1gsR0FBRyxVQUFVLEtBQUs7TUFDdkIsTUFBTSxJQUFJLE1BQU07O1dBRVg7TUFDTCxVQUFVLE1BQU07Ozs7SUFJbEIsS0FBSyxVQUFVLFdBQVc7TUFDeEIsWUFBWTs7O0lBR2QsT0FBTzs7Ozs7Ozs7OztFQVVULE1BQU0sU0FBUyxTQUFTLElBQUksTUFBTTtJQUNoQyxPQUFPLFFBQVE7OztJQUdmLElBQUksT0FBTyxLQUFLLElBQUk7OztJQUdwQixPQUFPLFVBQVUsSUFBSTs7Ozs7Ozs7O0VBU3ZCLE1BQU0sTUFBTSxTQUFTLElBQUk7SUFDdkIsT0FBTyxVQUFVOzs7Ozs7RUFNbkIsTUFBTSxTQUFTOzs7RUFHZixPQUFPLEtBQUssU0FBUyxTQUFTLE1BQU07SUFDbEMsUUFBUTs7O0VBR1YsT0FBTzs7QUFFVDs7QUNwTUE7Ozs7Ozs7OztBQVNBLE9BQU8sVUFBVSxTQUFTLElBQUksT0FBTzs7RUFFbkMsSUFBSTtFQUNKLFFBQVE7Ozs7O0lBS04sUUFBUSxXQUFXOzs7OztJQUtuQixPQUFPLFdBQVc7Ozs7O0lBS2xCLFNBQVMsV0FBVzs7Ozs7RUFLdEIsUUFBUSxPQUFPLE9BQU87O0VBRXRCLE9BQU87O0FBRVQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgd2luZG93OmZhbHNlICovXG4vKiBnbG9iYWwgcHJvY2VzczpmYWxzZSAqL1xuLyogZ2xvYmFsIHNldEltbWVkaWF0ZTpmYWxzZSAqL1xuLyogZ2xvYmFsIHNldFRpbWVvdXQ6ZmFsc2UgKi9cblxudmFyIF9wcm9jZXNzID0ge1xuICBuZXh0VGljazogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICBzZXRUaW1lb3V0KGNhbGxiYWNrLCAwKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBfcHJvY2VzczsiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gWyckc3RhdGUnLCAnJHZpZXdNYW5hZ2VyJywgJyR0ZW1wbGF0ZUNhY2hlJywgJyRjb21waWxlJywgJyRsb2cnLCBmdW5jdGlvbiAoJHN0YXRlLCAkdmlld01hbmFnZXIsICR0ZW1wbGF0ZUNhY2hlLCAkY29tcGlsZSwgJGxvZykge1xuXG4gIHJldHVybiB7XG4gICAgcmVzdHJpY3Q6ICdFQScsXG4gICAgc2NvcGU6IHtcblxuICAgIH0sXG4gICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsZW1lbnQsIGF0dHJzKSB7XG5cbiAgICAgIC8vIENyZWF0ZSB2aWV3XG4gICAgICB2YXIgX3ZpZXcgPSAkdmlld01hbmFnZXIuY3JlYXRlKGF0dHJzLmlkLCBlbGVtZW50LCB7XG5cbiAgICAgICAgLy8gRWxlbWVudFxuICAgICAgICAkZWxlbWVudDogZWxlbWVudCxcblxuICAgICAgICAvLyBSZW5kZXJcbiAgICAgICAgcmVuZGVyOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgICAgJGxvZy5sb2coJ3JlbmRlcicsIGRhdGEpO1xuXG4gICAgICAgICAgdmFyIHJlbmRlcmVyID0gJGNvbXBpbGUoZGF0YSk7XG5cbiAgICAgICAgICBlbGVtZW50Lmh0bWwocmVuZGVyZXIoc2NvcGUuJHBhcmVudCkpO1xuICAgICAgICB9XG5cbiAgICAgIH0pO1xuXG4gICAgICAvLyBEZXN0cm95XG4gICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAkbG9nLmxvZygnZGVzdHJveScpO1xuICAgICAgICBfdmlldy5kZXN0cm95KCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIGFuZ3VsYXI6ZmFsc2UgKi9cblxuLy8gQ29tbW9uSlNcbmlmICh0eXBlb2YgbW9kdWxlICE9PSBcInVuZGVmaW5lZFwiICYmIHR5cGVvZiBleHBvcnRzICE9PSBcInVuZGVmaW5lZFwiICYmIG1vZHVsZS5leHBvcnRzID09PSBleHBvcnRzKXtcbiAgbW9kdWxlLmV4cG9ydHMgPSAnYW5ndWxhci1zdGF0ZS12aWV3Jztcbn1cblxuLy8gQXNzdW1lIHBvbHlmaWxsIHVzZWQgaW4gU3RhdGVSb3V0ZXIgZXhpc3RzXG5cbi8vIEluc3RhbnRpYXRlIG1vZHVsZVxuYW5ndWxhci5tb2R1bGUoJ2FuZ3VsYXItc3RhdGUtdmlldycsIFsnYW5ndWxhci1zdGF0ZS1yb3V0ZXInXSlcblxuICAuZmFjdG9yeSgnJHZpZXdNYW5hZ2VyJywgcmVxdWlyZSgnLi9zZXJ2aWNlcy92aWV3LW1hbmFnZXInKSlcblxuICAuZGlyZWN0aXZlKCdzdmlldycsIHJlcXVpcmUoJy4vZGlyZWN0aXZlcy9zdGF0ZS12aWV3JykpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiBnbG9iYWwgd2luZG93OmZhbHNlICovXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgVmlldyA9IHJlcXVpcmUoJy4uL3ZpZXcvdmlldycpO1xudmFyIHByb2Nlc3MgPSByZXF1aXJlKCcuLi8uLi9ub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBbJyRzdGF0ZScsICckaW5qZWN0b3InLCAnJHEnLCBmdW5jdGlvbigkc3RhdGUsICRpbmplY3RvciwgJHEpIHtcblxuICAvLyBJbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXJcbiAgdmFyIF9zZWxmID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciBfdmlld0hhc2ggPSB7fTtcbiAgdmFyIF9hY3RpdmVMaXN0ID0gW107XG5cbiAgLyoqXG4gICAqIEEgcHJvbWlzZSB0byBmdWxmaWxsIHZpZXcgdGVtcGxhdGUgdHJhbnNsYXRpb25cbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7TWl4ZWR9ICB0ZW1wbGF0ZSBBIHN0YXRlIGRlZmluZWQgdGVtcGxhdGUgdG8gcmVuZGVyIGludG8gdGhlIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICB2aWV3ICAgICBBIFZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgIEEgJHEuZGVmZXIoKS5wcm9taXNlXG4gICAqL1xuICB2YXIgX3Byb21pc2VUZW1wbGF0ZSA9IGZ1bmN0aW9uKGlkLCB0ZW1wbGF0ZSwgdmlldykge1xuICAgIHZhciBwcm9taXNlO1xuXG4gICAgLy8gRGVmaW5lZCB0ZW1wbGF0ZVxuICAgIGlmKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdGVtcGxhdGUgIT09IG51bGwpIHtcblxuICAgICAgLy8gRnVuY3Rpb25hbFxuICAgICAgaWYoYW5ndWxhci5pc0Z1bmN0aW9uKHRlbXBsYXRlKSkge1xuICAgICAgICBwcm9taXNlID0gJHEoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAvLyBFeGVjdXRlIGFzeW5jaHJvbm91c2x5XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhmdW5jdGlvbigpIHtcblxuICAgICAgICAgICAgLy8gRW5zdXJlIHByb21pc2VcbiAgICAgICAgICAgICRxLndoZW4oJGluamVjdG9yLmludm9rZSh0ZW1wbGF0ZSkpLnRoZW4oXG4gICAgICAgICAgICAgIGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgICAgIHZpZXcucmVuZGVyKHJlcyk7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShyZXMpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAvLyBPdGhlclxuICAgICAgfSBlbHNlIHtcblxuICAgICAgICAvLyBFbnN1cmUgcHJvbWlzZVxuICAgICAgICBwcm9taXNlID0gJHEud2hlbih0ZW1wbGF0ZSkudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICB2aWV3LnJlbmRlcihyZXMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIC8vIEVtcHR5XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkZWZlckVtcHR5ID0gJHEuZGVmZXIoKTtcblxuICAgICAgLy8gUmVzb2x2ZVxuICAgICAgZGVmZXJFbXB0eS5yZXNvbHZlKCk7XG5cbiAgICAgIHByb21pc2UgPSBkZWZlckVtcHR5LnByb21pc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSByZW5kZXJlZCB2aWV3c1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGNvbXBsZXRpb24gY2FsbGJhY2ssIGZ1bmN0aW9uKGVycilcbiAgICovXG4gIHZhciBfdXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBSZXNldFxuICAgIF9hY3RpdmVMaXN0LmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5yZXNldCgpO1xuICAgIH0pO1xuXG4gICAgLy8gQ3VycmVudFxuICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLmN1cnJlbnQoKSB8fCB7fTtcbiAgICB2YXIgdGVtcGxhdGVIYXNoID0gY3VycmVudC50ZW1wbGF0ZXMgfHwge307XG4gICAgdmFyIHRlbXBsYXRlTGlzdCA9IChPYmplY3Qua2V5cyh0ZW1wbGF0ZUhhc2gpIHx8IFtdKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gISFfdmlld0hhc2hbaWRdO1xuICAgICAgfSk7XG5cbiAgICAvLyBBY3RpdmUgdmlld3NcbiAgICBfYWN0aXZlTGlzdCA9IHRlbXBsYXRlTGlzdFxuICAgICAgLm1hcChmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gX3ZpZXdIYXNoW2lkXTtcbiAgICAgIH0pO1xuXG4gICAgLy8gUmVuZGVyIGV4ZWN1dGlvblxuICAgIGlmKCEhdGVtcGxhdGVMaXN0Lmxlbmd0aCkge1xuICAgICAgJHEuYWxsKHRlbXBsYXRlTGlzdFxuXG4gICAgICAgIC8vIE1hcCB0byBwcm92aWRlclxuICAgICAgICAubWFwKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgcmV0dXJuIF9wcm9taXNlVGVtcGxhdGUoaWQsIHRlbXBsYXRlSGFzaFtpZF0sIF92aWV3SGFzaFtpZF0pO1xuICAgICAgICB9KSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgX3NlbGYuZW1pdCgndXBkYXRlOnJlbmRlcicpO1xuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soY2FsbGJhY2spO1xuXG4gICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgIF9zZWxmLmVtaXQoJ2Vycm9yOnJlbmRlcicsIGVycik7XG4gICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfSk7XG5cbiAgICAvLyBFbXB0eVxuICAgIH0gZWxzZSB7XG4gICAgICBfc2VsZi5lbWl0KCd1cGRhdGU6cmVuZGVyJyk7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGNhbGxiYWNrKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgYSB2aWV3XG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgIGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4geyR2aWV3TWFuYWdlcn0gICAgSXRzZWxmLCBjaGFpbmFibGVcbiAgICovXG4gIHZhciBfdW5yZWdpc3RlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgZGVsZXRlIF92aWV3SGFzaFtpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgdmlldywgYWxzbyBpbXBsZW1lbnRzIGRlc3Ryb3kgbWV0aG9kIG9uIHZpZXcgdG8gdW5yZWdpc3RlciBmcm9tIG1hbmFnZXJcbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgaWQgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcGFyYW0gIHtWaWV3fSAgICAgICAgIHZpZXcgQSB2aWV3IGluc3RhbmNlXG4gICAqIEByZXR1cm4geyR2aWV3TWFuYWdlcn0gICAgICBJdHNlbGYsIGNoYWluYWJsZVxuICAgKi9cbiAgdmFyIF9yZWdpc3RlciA9IGZ1bmN0aW9uKGlkLCB2aWV3KSB7XG4gICAgLy8gTm8gaWRcbiAgICBpZighaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyByZXF1aXJlcyBhbiBpZC4nKTtcblxuICAgIC8vIFJlcXVpcmUgdW5pcXVlIGlkXG4gICAgfSBlbHNlIGlmKF92aWV3SGFzaFtpZF0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyByZXF1aXJlcyBhIHVuaXF1ZSBpZCcpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIF92aWV3SGFzaFtpZF0gPSB2aWV3O1xuICAgIH1cblxuICAgIC8vIEltcGxlbWVudCBkZXN0cm95IG1ldGhvZFxuICAgIHZpZXcuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgX3VucmVnaXN0ZXIoaWQpO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmlldztcbiAgfTtcblxuICAvKipcbiAgICogQSBmYWN0b3J5IG1ldGhvZCB0byBjcmVhdGUgYSBWaWV3IGluc3RhbmNlXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7T2JqZWN0fSBkYXRhIEEgZGF0YSBvYmplY3QgdXNlZCB0byBleHRlbmQgYWJzdHJhY3QgbWV0aG9kc1xuICAgKiBAcmV0dXJuIHtWaWV3fSAgICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5jcmVhdGUgPSBmdW5jdGlvbihpZCwgZGF0YSkge1xuICAgIGRhdGEgPSBkYXRhIHx8IHt9O1xuXG4gICAgLy8gQ3JlYXRlXG4gICAgdmFyIHZpZXcgPSBWaWV3KGlkLCBkYXRhKTtcblxuICAgIC8vIFJlZ2lzdGVyXG4gICAgcmV0dXJuIF9yZWdpc3RlcihpZCwgdmlldyk7XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCBhIHZpZXcgYnkgaWRcbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHJldHVybiB7Vmlld30gICAgICBBIFZpZXcgZW50aXRpdHlcbiAgICovXG4gIF9zZWxmLmdldCA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgcmV0dXJuIF92aWV3SGFzaFtpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFVwZGF0ZVxuICAgKi9cbiAgX3NlbGYudXBkYXRlID0gX3VwZGF0ZTtcblxuICAvLyBSZWdpc3RlciBtaWRkbGV3YXJlIGxheWVyXG4gICRzdGF0ZS4kdXNlKGZ1bmN0aW9uKHJlcXVlc3QsIG5leHQpIHtcbiAgICBfdXBkYXRlKG5leHQpO1xuICB9KTtcblxuICByZXR1cm4gX3NlbGY7XG59XTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBWaWV3XG4gKlxuICogQHBhcmFtICB7U3RyaW5nfSBpZCAgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gKiBAcGFyYW0gIHtPYmplY3R9IGNoaWxkICAgQSBkYXRhIG9iamVjdCB1c2VkIHRvIGV4dGVuZCBhYnN0cmFjdCBtZXRob2RzXG4gKiBAcmV0dXJuIHtWaWV3fSAgICAgICAgICAgQW4gYWJzdHJhY3QgdmlldyBvYmplY3RcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihpZCwgY2hpbGQpIHtcbiAgLy8gSW5zdGFuY2VcbiAgdmFyIF9zZWxmO1xuICBfc2VsZiA9IHtcblxuICAgIC8qKlxuICAgICAqIEFic3RyYWN0IHJlbmRlclxuICAgICAqL1xuICAgIHJlbmRlcjogZnVuY3Rpb24oKSB7IH0sXG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZXNldFxuICAgICAqL1xuICAgIHJlc2V0OiBmdW5jdGlvbigpIHsgfSxcblxuICAgIC8qKlxuICAgICAqIEFic3RyYWN0IGRlc3Ryb3lcbiAgICAgKi9cbiAgICBkZXN0cm95OiBmdW5jdGlvbigpIHsgfVxuXG4gIH07XG5cbiAgLy8gRXh0ZW5kIHRvIG92ZXJ3cml0ZSBhYnN0cmFjdCBtZXRob2RzXG4gIGFuZ3VsYXIuZXh0ZW5kKF9zZWxmLCBjaGlsZCk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufTtcbiJdfQ==
