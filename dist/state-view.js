(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
'use strict';

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', function ($state, $viewManager, $templateCache, $compile) {

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
            var renderer = $compile(data);
            element.html(renderer(scope.$parent));
          }

        });

        // Destroy
        element.on('$destroy', function() {
          _view.destroy();
        });
      }
    };
  }];

},{}],3:[function(require,module,exports){
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

},{"./directives/state-view":2,"./services/view-manager":4}],4:[function(require,module,exports){
'use strict';

/* global window:false */

var EventEmitter = require('events').EventEmitter;
var View = require('../view/view');

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
  var _createProvider = function(id, template, view) {
    var deferred;

    // Acceptable
    if(typeof template !== 'undefined' && template !== null) {
      var result = (angular.isFunction(template)) ? $injector.invoke(template) : template;
      
      // Ensure promise
      result = $q.when(result);

      // Render
      return result.then(function(res) {
        view.render(res);
      });

    // Not accepted, empty resolution
    } else {
      deferred = $q.defer();
      deferred.resolve();
      return deferred.promise;
    }
  };

  /**
   * Update rendered views
   *
   * @param {Function} callback A callback, function(err)
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
          return _createProvider(id, templateHash[id], _viewHash[id]);
        }))
        .then(function() {
          _self.emit('update:render');
          callback();

        }, function(err) {
          _self.emit('error:render', err);
          callback(err);
        });

    // Empty
    } else {
      _self.emit('update:render');
      callback();
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
   * @param  {String} id    Unique identifier for view
   * @param  {Object} child A data object used to extend abstract methods
   * @return {View}         A View entitity
   */
  _self.create = function(id, child) {
    child = child || {};

    // Create
    var view = View(id, child);

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

},{"../view/view":5,"events":1}],5:[function(require,module,exports){
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

},{}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFD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QUFVLE1BQU07Ozs7SUFJbEIsS0FBSyxVQUFVLFdBQVc7TUFDeEIsWUFBWTs7O0lBR2QsT0FBTzs7Ozs7Ozs7OztFQVVULE1BQU0sU0FBUyxTQUFTLElBQUksT0FBTztJQUNqQyxRQUFRLFNBQVM7OztJQUdqQixJQUFJLE9BQU8sS0FBSyxJQUFJOzs7SUFHcEIsT0FBTyxVQUFVLElBQUk7Ozs7Ozs7OztFQVN2QixNQUFNLE1BQU0sU0FBUyxJQUFJO0lBQ3ZCLE9BQU8sVUFBVTs7Ozs7O0VBTW5CLE1BQU0sU0FBUzs7O0VBR2YsT0FBTyxLQUFLLFNBQVMsU0FBUyxNQUFNO0lBQ2xDLFFBQVE7OztFQUdWLE9BQU87O0FBRVQ7O0FDNUtBOzs7Ozs7Ozs7QUFTQSxPQUFPLFVBQVUsU0FBUyxJQUFJLE9BQU87O0VBRW5DLElBQUk7RUFDSixRQUFROzs7OztJQUtOLFFBQVEsV0FBVzs7Ozs7SUFLbkIsT0FBTyxXQUFXOzs7OztJQUtsQixTQUFTLFdBQVc7Ozs7O0VBS3RCLFFBQVEsT0FBTyxPQUFPOztFQUV0QixPQUFPOztBQUVUIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBbJyRzdGF0ZScsICckdmlld01hbmFnZXInLCAnJHRlbXBsYXRlQ2FjaGUnLCAnJGNvbXBpbGUnLCBmdW5jdGlvbiAoJHN0YXRlLCAkdmlld01hbmFnZXIsICR0ZW1wbGF0ZUNhY2hlLCAkY29tcGlsZSkge1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlc3RyaWN0OiAnRUEnLFxuICAgICAgc2NvcGU6IHtcblxuICAgICAgfSxcbiAgICAgIGxpbms6IGZ1bmN0aW9uKHNjb3BlLCBlbGVtZW50LCBhdHRycykge1xuICAgICAgICAvLyBDcmVhdGUgdmlld1xuICAgICAgICB2YXIgX3ZpZXcgPSAkdmlld01hbmFnZXIuY3JlYXRlKGF0dHJzLmlkLCBlbGVtZW50LCB7XG5cbiAgICAgICAgICAvLyBFbGVtZW50XG4gICAgICAgICAgJGVsZW1lbnQ6IGVsZW1lbnQsXG5cbiAgICAgICAgICAvLyBSZW5kZXJcbiAgICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICAgIHZhciByZW5kZXJlciA9ICRjb21waWxlKGRhdGEpO1xuICAgICAgICAgICAgZWxlbWVudC5odG1sKHJlbmRlcmVyKHNjb3BlLiRwYXJlbnQpKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRGVzdHJveVxuICAgICAgICBlbGVtZW50Lm9uKCckZGVzdHJveScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIF92aWV3LmRlc3Ryb3koKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfTtcbiAgfV07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGdsb2JhbCBhbmd1bGFyOmZhbHNlICovXG5cbi8vIENvbW1vbkpTXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZXhwb3J0cyl7XG4gIG1vZHVsZS5leHBvcnRzID0gJ2FuZ3VsYXItc3RhdGUtdmlldyc7XG59XG5cbi8vIEFzc3VtZSBwb2x5ZmlsbCB1c2VkIGluIFN0YXRlUm91dGVyIGV4aXN0c1xuXG4vLyBJbnN0YW50aWF0ZSBtb2R1bGVcbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyLXN0YXRlLXZpZXcnLCBbJ2FuZ3VsYXItc3RhdGUtcm91dGVyJ10pXG5cbiAgLmZhY3RvcnkoJyR2aWV3TWFuYWdlcicsIHJlcXVpcmUoJy4vc2VydmljZXMvdmlldy1tYW5hZ2VyJykpXG5cbiAgLmRpcmVjdGl2ZSgnc3ZpZXcnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvc3RhdGUtdmlldycpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIHdpbmRvdzpmYWxzZSAqL1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3L3ZpZXcnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBbJyRzdGF0ZScsICckaW5qZWN0b3InLCAnJHEnLCBmdW5jdGlvbigkc3RhdGUsICRpbmplY3RvciwgJHEpIHtcblxuICAvLyBJbnN0YW5jZSBvZiBFdmVudEVtaXR0ZXJcbiAgdmFyIF9zZWxmID0gbmV3IEV2ZW50RW1pdHRlcigpO1xuXG4gIHZhciBfdmlld0hhc2ggPSB7fTtcbiAgdmFyIF9hY3RpdmVMaXN0ID0gW107XG5cbiAgLyoqXG4gICAqIEEgcHJvbWlzZSB0byBmdWxmaWxsIHZpZXcgdGVtcGxhdGUgdHJhbnNsYXRpb25cbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICAgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHBhcmFtICB7TWl4ZWR9ICB0ZW1wbGF0ZSBBIHN0YXRlIGRlZmluZWQgdGVtcGxhdGUgdG8gcmVuZGVyIGludG8gdGhlIHZpZXdcbiAgICogQHBhcmFtICB7Vmlld30gICB2aWV3ICAgICBBIFZpZXcgYXNzb2NpYXRlZCB3aXRoIHRoZSBpZFxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSAgICAgICAgIEEgJHEuZGVmZXIoKS5wcm9taXNlXG4gICAqL1xuICB2YXIgX2NyZWF0ZVByb3ZpZGVyID0gZnVuY3Rpb24oaWQsIHRlbXBsYXRlLCB2aWV3KSB7XG4gICAgdmFyIGRlZmVycmVkO1xuXG4gICAgLy8gQWNjZXB0YWJsZVxuICAgIGlmKHR5cGVvZiB0ZW1wbGF0ZSAhPT0gJ3VuZGVmaW5lZCcgJiYgdGVtcGxhdGUgIT09IG51bGwpIHtcbiAgICAgIHZhciByZXN1bHQgPSAoYW5ndWxhci5pc0Z1bmN0aW9uKHRlbXBsYXRlKSkgPyAkaW5qZWN0b3IuaW52b2tlKHRlbXBsYXRlKSA6IHRlbXBsYXRlO1xuICAgICAgXG4gICAgICAvLyBFbnN1cmUgcHJvbWlzZVxuICAgICAgcmVzdWx0ID0gJHEud2hlbihyZXN1bHQpO1xuXG4gICAgICAvLyBSZW5kZXJcbiAgICAgIHJldHVybiByZXN1bHQudGhlbihmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgdmlldy5yZW5kZXIocmVzKTtcbiAgICAgIH0pO1xuXG4gICAgLy8gTm90IGFjY2VwdGVkLCBlbXB0eSByZXNvbHV0aW9uXG4gICAgfSBlbHNlIHtcbiAgICAgIGRlZmVycmVkID0gJHEuZGVmZXIoKTtcbiAgICAgIGRlZmVycmVkLnJlc29sdmUoKTtcbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVXBkYXRlIHJlbmRlcmVkIHZpZXdzXG4gICAqXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIEEgY2FsbGJhY2ssIGZ1bmN0aW9uKGVycilcbiAgICovXG4gIHZhciBfdXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBSZXNldFxuICAgIF9hY3RpdmVMaXN0LmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5yZXNldCgpO1xuICAgIH0pO1xuXG4gICAgLy8gQ3VycmVudFxuICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLmN1cnJlbnQoKSB8fCB7fTtcbiAgICB2YXIgdGVtcGxhdGVIYXNoID0gY3VycmVudC50ZW1wbGF0ZXMgfHwge307XG4gICAgdmFyIHRlbXBsYXRlTGlzdCA9IChPYmplY3Qua2V5cyh0ZW1wbGF0ZUhhc2gpIHx8IFtdKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gISFfdmlld0hhc2hbaWRdO1xuICAgICAgfSk7XG5cbiAgICAvLyBBY3RpdmUgdmlld3NcbiAgICBfYWN0aXZlTGlzdCA9IHRlbXBsYXRlTGlzdFxuICAgICAgLm1hcChmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gX3ZpZXdIYXNoW2lkXTtcbiAgICAgIH0pO1xuXG4gICAgLy8gUmVuZGVyIGV4ZWN1dGlvblxuICAgIGlmKCEhdGVtcGxhdGVMaXN0Lmxlbmd0aCkge1xuICAgICAgJHEuYWxsKHRlbXBsYXRlTGlzdFxuXG4gICAgICAgIC8vIE1hcCB0byBwcm92aWRlclxuICAgICAgICAubWFwKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgcmV0dXJuIF9jcmVhdGVQcm92aWRlcihpZCwgdGVtcGxhdGVIYXNoW2lkXSwgX3ZpZXdIYXNoW2lkXSk7XG4gICAgICAgIH0pKVxuICAgICAgICAudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgICBfc2VsZi5lbWl0KCd1cGRhdGU6cmVuZGVyJyk7XG4gICAgICAgICAgY2FsbGJhY2soKTtcblxuICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICBfc2VsZi5lbWl0KCdlcnJvcjpyZW5kZXInLCBlcnIpO1xuICAgICAgICAgIGNhbGxiYWNrKGVycik7XG4gICAgICAgIH0pO1xuXG4gICAgLy8gRW1wdHlcbiAgICB9IGVsc2Uge1xuICAgICAgX3NlbGYuZW1pdCgndXBkYXRlOnJlbmRlcicpO1xuICAgICAgY2FsbGJhY2soKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgYSB2aWV3XG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9ICAgICAgIGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4geyR2aWV3TWFuYWdlcn0gICAgSXRzZWxmLCBjaGFpbmFibGVcbiAgICovXG4gIHZhciBfdW5yZWdpc3RlciA9IGZ1bmN0aW9uKGlkKSB7XG4gICAgZGVsZXRlIF92aWV3SGFzaFtpZF07XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgdmlldywgYWxzbyBpbXBsZW1lbnRzIGRlc3Ryb3kgbWV0aG9kIG9uIHZpZXcgdG8gdW5yZWdpc3RlciBmcm9tIG1hbmFnZXJcbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgaWQgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcGFyYW0gIHtWaWV3fSAgICAgICAgIHZpZXcgQSB2aWV3IGluc3RhbmNlXG4gICAqIEByZXR1cm4geyR2aWV3TWFuYWdlcn0gICAgICBJdHNlbGYsIGNoYWluYWJsZVxuICAgKi9cbiAgdmFyIF9yZWdpc3RlciA9IGZ1bmN0aW9uKGlkLCB2aWV3KSB7XG4gICAgLy8gTm8gaWRcbiAgICBpZighaWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyByZXF1aXJlcyBhbiBpZC4nKTtcblxuICAgIC8vIFJlcXVpcmUgdW5pcXVlIGlkXG4gICAgfSBlbHNlIGlmKF92aWV3SGFzaFtpZF0pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignVmlldyByZXF1aXJlcyBhIHVuaXF1ZSBpZCcpO1xuXG4gICAgfSBlbHNlIHtcbiAgICAgIF92aWV3SGFzaFtpZF0gPSB2aWV3O1xuICAgIH1cblxuICAgIC8vIEltcGxlbWVudCBkZXN0cm95IG1ldGhvZFxuICAgIHZpZXcuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgX3VucmVnaXN0ZXIoaWQpO1xuICAgIH07XG5cbiAgICByZXR1cm4gdmlldztcbiAgfTtcblxuICAvKipcbiAgICogQSBmYWN0b3J5IG1ldGhvZCB0byBjcmVhdGUgYSBWaWV3IGluc3RhbmNlXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge09iamVjdH0gY2hpbGQgQSBkYXRhIG9iamVjdCB1c2VkIHRvIGV4dGVuZCBhYnN0cmFjdCBtZXRob2RzXG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5jcmVhdGUgPSBmdW5jdGlvbihpZCwgY2hpbGQpIHtcbiAgICBjaGlsZCA9IGNoaWxkIHx8IHt9O1xuXG4gICAgLy8gQ3JlYXRlXG4gICAgdmFyIHZpZXcgPSBWaWV3KGlkLCBjaGlsZCk7XG5cbiAgICAvLyBSZWdpc3RlclxuICAgIHJldHVybiBfcmVnaXN0ZXIoaWQsIHZpZXcpO1xuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYSB2aWV3IGJ5IGlkXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgQSBWaWV3IGVudGl0aXR5XG4gICAqL1xuICBfc2VsZi5nZXQgPSBmdW5jdGlvbihpZCkge1xuICAgIHJldHVybiBfdmlld0hhc2hbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBVcGRhdGVcbiAgICovXG4gIF9zZWxmLnVwZGF0ZSA9IF91cGRhdGU7XG5cbiAgLy8gUmVnaXN0ZXIgbWlkZGxld2FyZSBsYXllclxuICAkc3RhdGUuJHVzZShmdW5jdGlvbihyZXF1ZXN0LCBuZXh0KSB7XG4gICAgX3VwZGF0ZShuZXh0KTtcbiAgfSk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufV07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlld1xuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICogQHBhcmFtICB7T2JqZWN0fSBjaGlsZCAgIEEgZGF0YSBvYmplY3QgdXNlZCB0byBleHRlbmQgYWJzdHJhY3QgbWV0aG9kc1xuICogQHJldHVybiB7Vmlld30gICAgICAgICAgIEFuIGFic3RyYWN0IHZpZXcgb2JqZWN0XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaWQsIGNoaWxkKSB7XG4gIC8vIEluc3RhbmNlXG4gIHZhciBfc2VsZjtcbiAgX3NlbGYgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZW5kZXJcbiAgICAgKi9cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgcmVzZXRcbiAgICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24oKSB7IH0sXG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCBkZXN0cm95XG4gICAgICovXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7IH1cblxuICB9O1xuXG4gIC8vIEV4dGVuZCB0byBvdmVyd3JpdGUgYWJzdHJhY3QgbWV0aG9kc1xuICBhbmd1bGFyLmV4dGVuZChfc2VsZiwgY2hpbGQpO1xuXG4gIHJldHVybiBfc2VsZjtcbn07XG4iXX0=
