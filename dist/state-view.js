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

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', function ($state, $viewManager, $templateCache, $compile) {

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
        promise = $q.when('<ng-include src="\''+template+'\'"></ng-include>')
          .then(function(res) {
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
          process.nextTick(callback);

        }, function(err) {
          process.nextTick(angular.bind(null, callback, err));
        });

    // Empty
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

    } else {
      _viewHash[id] = view;
    }

    // Check active views
    var current = $state.current() || {};
    var templateHash = current.templates || {};
    if(!!templateHash[id] && !!_viewHash[id]) {
      _activeList.push(_viewHash[id]);
      _promiseTemplate(id, templateHash[id], _viewHash[id]);
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYW5ndWxhci1zdGF0ZS1yb3V0ZXIvc3JjL3V0aWxzL3Byb2Nlc3MuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi9Vc2Vycy9oZW5yeS9Ib21lU3luYy9DYW52YXMvcHJvamVjdHMvYW5ndWxhci1zdGF0ZS12aWV3L3NyYy9kaXJlY3RpdmVzL3N0YXRlLXZpZXcuanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvaW5kZXguanMiLCIvVXNlcnMvaGVucnkvSG9tZVN5bmMvQ2FudmFzL3Byb2plY3RzL2FuZ3VsYXItc3RhdGUtdmlldy9zcmMvc2VydmljZXMvdmlldy1tYW5hZ2VyLmpzIiwiL1VzZXJzL2hlbnJ5L0hvbWVTeW5jL0NhbnZhcy9wcm9qZWN0cy9hbmd1bGFyLXN0YXRlLXZpZXcvc3JjL3ZpZXcvdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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RW5DLElBQUk7RUFDSixRQUFROzs7OztJQUtOLFFBQVEsV0FBVzs7Ozs7SUFLbkIsT0FBTyxXQUFXOzs7OztJQUtsQixTQUFTLFdBQVc7Ozs7O0VBS3RCLFFBQVEsT0FBTyxPQUFPOztFQUV0QixPQUFPOztBQUVUIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIHdpbmRvdzpmYWxzZSAqL1xuLyogZ2xvYmFsIHByb2Nlc3M6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRJbW1lZGlhdGU6ZmFsc2UgKi9cbi8qIGdsb2JhbCBzZXRUaW1lb3V0OmZhbHNlICovXG5cbnZhciBfcHJvY2VzcyA9IHtcbiAgbmV4dFRpY2s6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgc2V0VGltZW91dChjYWxsYmFjaywgMCk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gX3Byb2Nlc3M7IiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFsnJHN0YXRlJywgJyR2aWV3TWFuYWdlcicsICckdGVtcGxhdGVDYWNoZScsICckY29tcGlsZScsIGZ1bmN0aW9uICgkc3RhdGUsICR2aWV3TWFuYWdlciwgJHRlbXBsYXRlQ2FjaGUsICRjb21waWxlKSB7XG5cbiAgcmV0dXJuIHtcbiAgICByZXN0cmljdDogJ0VBJyxcbiAgICBzY29wZToge1xuXG4gICAgfSxcbiAgICBsaW5rOiBmdW5jdGlvbihzY29wZSwgZWxlbWVudCwgYXR0cnMpIHtcblxuICAgICAgLy8gQ3JlYXRlIHZpZXdcbiAgICAgIHZhciBfdmlldyA9ICR2aWV3TWFuYWdlci5jcmVhdGUoYXR0cnMuaWQsIHtcblxuICAgICAgICAvLyBFbGVtZW50XG4gICAgICAgICRlbGVtZW50OiBlbGVtZW50LFxuXG4gICAgICAgIC8vIFJlbmRlclxuICAgICAgICByZW5kZXI6IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgICB2YXIgcmVuZGVyZXIgPSAkY29tcGlsZShkYXRhKTtcbiAgICAgICAgICBlbGVtZW50Lmh0bWwocmVuZGVyZXIoc2NvcGUuJHBhcmVudCkpO1xuICAgICAgICB9LFxuXG4gICAgICAgIHJlc2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBlbGVtZW50Lmh0bWwoJycpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgLy8gRGVzdHJveVxuICAgICAgZWxlbWVudC5vbignJGRlc3Ryb3knLCBmdW5jdGlvbigpIHtcbiAgICAgICAgX3ZpZXcuZGVzdHJveSgpO1xuICAgICAgfSk7XG4gICAgfVxuICB9O1xufV07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qIGdsb2JhbCBhbmd1bGFyOmZhbHNlICovXG5cbi8vIENvbW1vbkpTXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gXCJ1bmRlZmluZWRcIiAmJiB0eXBlb2YgZXhwb3J0cyAhPT0gXCJ1bmRlZmluZWRcIiAmJiBtb2R1bGUuZXhwb3J0cyA9PT0gZXhwb3J0cyl7XG4gIG1vZHVsZS5leHBvcnRzID0gJ2FuZ3VsYXItc3RhdGUtdmlldyc7XG59XG5cbi8vIEFzc3VtZSBwb2x5ZmlsbCB1c2VkIGluIFN0YXRlUm91dGVyIGV4aXN0c1xuXG4vLyBJbnN0YW50aWF0ZSBtb2R1bGVcbmFuZ3VsYXIubW9kdWxlKCdhbmd1bGFyLXN0YXRlLXZpZXcnLCBbJ2FuZ3VsYXItc3RhdGUtcm91dGVyJ10pXG5cbiAgLmZhY3RvcnkoJyR2aWV3TWFuYWdlcicsIHJlcXVpcmUoJy4vc2VydmljZXMvdmlldy1tYW5hZ2VyJykpXG5cbiAgLmRpcmVjdGl2ZSgnc3ZpZXcnLCByZXF1aXJlKCcuL2RpcmVjdGl2ZXMvc3RhdGUtdmlldycpKTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyogZ2xvYmFsIHdpbmRvdzpmYWxzZSAqL1xuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyO1xudmFyIFZpZXcgPSByZXF1aXJlKCcuLi92aWV3L3ZpZXcnKTtcbnZhciBwcm9jZXNzID0gcmVxdWlyZSgnLi4vLi4vbm9kZV9tb2R1bGVzL2FuZ3VsYXItc3RhdGUtcm91dGVyL3NyYy91dGlscy9wcm9jZXNzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gWyckc3RhdGUnLCAnJGluamVjdG9yJywgJyRxJywgZnVuY3Rpb24oJHN0YXRlLCAkaW5qZWN0b3IsICRxKSB7XG5cbiAgLy8gSW5zdGFuY2Ugb2YgRXZlbnRFbWl0dGVyXG4gIHZhciBfc2VsZiA9IG5ldyBFdmVudEVtaXR0ZXIoKTtcblxuICB2YXIgX3ZpZXdIYXNoID0ge307XG4gIHZhciBfYWN0aXZlTGlzdCA9IFtdO1xuXG4gIC8qKlxuICAgKiBBIHByb21pc2UgdG8gZnVsZmlsbCB2aWV3IHRlbXBsYXRlIHRyYW5zbGF0aW9uXG4gICAqIFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGlkICAgICAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge01peGVkfSAgdGVtcGxhdGUgQSBzdGF0ZSBkZWZpbmVkIHRlbXBsYXRlIHRvIHJlbmRlciBpbnRvIHRoZSB2aWV3XG4gICAqIEBwYXJhbSAge1ZpZXd9ICAgdmlldyAgICAgQSBWaWV3IGFzc29jaWF0ZWQgd2l0aCB0aGUgaWRcbiAgICogQHJldHVybiB7UHJvbWlzZX0gICAgICAgICBBICRxLmRlZmVyKCkucHJvbWlzZVxuICAgKi9cbiAgdmFyIF9wcm9taXNlVGVtcGxhdGUgPSBmdW5jdGlvbihpZCwgdGVtcGxhdGUsIHZpZXcpIHtcbiAgICB2YXIgcHJvbWlzZTtcblxuICAgIC8vIERlZmluZWQgdGVtcGxhdGVcbiAgICBpZih0eXBlb2YgdGVtcGxhdGUgIT09ICd1bmRlZmluZWQnICYmIHRlbXBsYXRlICE9PSBudWxsKSB7XG5cbiAgICAgIC8vIEZ1bmN0aW9uYWxcbiAgICAgIGlmKGFuZ3VsYXIuaXNGdW5jdGlvbih0ZW1wbGF0ZSkpIHtcbiAgICAgICAgcHJvbWlzZSA9ICRxKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgLy8gRXhlY3V0ZSBhc3luY2hyb25vdXNseVxuICAgICAgICAgIHByb2Nlc3MubmV4dFRpY2soZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgICAgIC8vIEVuc3VyZSBwcm9taXNlXG4gICAgICAgICAgICAkcS53aGVuKCRpbmplY3Rvci5pbnZva2UodGVtcGxhdGUpKS50aGVuKFxuICAgICAgICAgICAgICBmdW5jdGlvbihyZXMpIHtcbiAgICAgICAgICAgICAgICB2aWV3LnJlbmRlcihyZXMpO1xuICAgICAgICAgICAgICAgIHJlc29sdmUocmVzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgLy8gT3RoZXJcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgLy8gRW5zdXJlIHByb21pc2VcbiAgICAgICAgcHJvbWlzZSA9ICRxLndoZW4oJzxuZy1pbmNsdWRlIHNyYz1cIlxcJycrdGVtcGxhdGUrJ1xcJ1wiPjwvbmctaW5jbHVkZT4nKVxuICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHJlcykge1xuICAgICAgICAgICAgdmlldy5yZW5kZXIocmVzKTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgIC8vIEVtcHR5XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBkZWZlckVtcHR5ID0gJHEuZGVmZXIoKTtcblxuICAgICAgLy8gUmVzb2x2ZVxuICAgICAgZGVmZXJFbXB0eS5yZXNvbHZlKCk7XG5cbiAgICAgIHByb21pc2UgPSBkZWZlckVtcHR5LnByb21pc2U7XG4gICAgfVxuXG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH07XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSByZW5kZXJlZCB2aWV3c1xuICAgKlxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBjYWxsYmFjayBBIGNvbXBsZXRpb24gY2FsbGJhY2ssIGZ1bmN0aW9uKGVycilcbiAgICovXG4gIHZhciBfdXBkYXRlID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAvLyBSZXNldFxuICAgIF9hY3RpdmVMaXN0LmZvckVhY2goZnVuY3Rpb24odmlldykge1xuICAgICAgdmlldy5yZXNldCgpO1xuICAgIH0pO1xuXG4gICAgLy8gQ3VycmVudFxuICAgIHZhciBjdXJyZW50ID0gJHN0YXRlLmN1cnJlbnQoKSB8fCB7fTtcbiAgICB2YXIgdGVtcGxhdGVIYXNoID0gY3VycmVudC50ZW1wbGF0ZXMgfHwge307XG4gICAgdmFyIHRlbXBsYXRlTGlzdCA9IChPYmplY3Qua2V5cyh0ZW1wbGF0ZUhhc2gpIHx8IFtdKVxuICAgICAgLmZpbHRlcihmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gISFfdmlld0hhc2hbaWRdO1xuICAgICAgfSk7XG5cbiAgICAvLyBBY3RpdmUgdmlld3NcbiAgICBfYWN0aXZlTGlzdCA9IHRlbXBsYXRlTGlzdFxuICAgICAgLm1hcChmdW5jdGlvbihpZCkge1xuICAgICAgICByZXR1cm4gX3ZpZXdIYXNoW2lkXTtcbiAgICAgIH0pO1xuXG4gICAgLy8gUmVuZGVyIGV4ZWN1dGlvblxuICAgIGlmKCEhdGVtcGxhdGVMaXN0Lmxlbmd0aCkge1xuICAgICAgJHEuYWxsKHRlbXBsYXRlTGlzdFxuXG4gICAgICAgIC8vIE1hcCB0byBwcm92aWRlclxuICAgICAgICAubWFwKGZ1bmN0aW9uKGlkKSB7XG4gICAgICAgICAgcmV0dXJuIF9wcm9taXNlVGVtcGxhdGUoaWQsIHRlbXBsYXRlSGFzaFtpZF0sIF92aWV3SGFzaFtpZF0pO1xuICAgICAgICB9KSlcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhjYWxsYmFjayk7XG5cbiAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhhbmd1bGFyLmJpbmQobnVsbCwgY2FsbGJhY2ssIGVycikpO1xuICAgICAgICB9KTtcblxuICAgIC8vIEVtcHR5XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soY2FsbGJhY2spO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogVW5yZWdpc3RlciBhIHZpZXdcbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gICAgICAgaWQgVW5pcXVlIGlkZW50aWZpZXIgZm9yIHZpZXdcbiAgICogQHJldHVybiB7JHZpZXdNYW5hZ2VyfSAgICBJdHNlbGYsIGNoYWluYWJsZVxuICAgKi9cbiAgdmFyIF91bnJlZ2lzdGVyID0gZnVuY3Rpb24oaWQpIHtcbiAgICBkZWxldGUgX3ZpZXdIYXNoW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogUmVnaXN0ZXIgYSB2aWV3LCBhbHNvIGltcGxlbWVudHMgZGVzdHJveSBtZXRob2Qgb24gdmlldyB0byB1bnJlZ2lzdGVyIGZyb20gbWFuYWdlclxuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSAgICAgICBpZCAgIFVuaXF1ZSBpZGVudGlmaWVyIGZvciB2aWV3XG4gICAqIEBwYXJhbSAge1ZpZXd9ICAgICAgICAgdmlldyBBIHZpZXcgaW5zdGFuY2VcbiAgICogQHJldHVybiB7JHZpZXdNYW5hZ2VyfSAgICAgIEl0c2VsZiwgY2hhaW5hYmxlXG4gICAqL1xuICB2YXIgX3JlZ2lzdGVyID0gZnVuY3Rpb24oaWQsIHZpZXcpIHtcbiAgICAvLyBObyBpZFxuICAgIGlmKCFpZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWV3IHJlcXVpcmVzIGFuIGlkLicpO1xuXG4gICAgLy8gUmVxdWlyZSB1bmlxdWUgaWRcbiAgICB9IGVsc2UgaWYoX3ZpZXdIYXNoW2lkXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdWaWV3IHJlcXVpcmVzIGEgdW5pcXVlIGlkJyk7XG5cbiAgICB9IGVsc2Uge1xuICAgICAgX3ZpZXdIYXNoW2lkXSA9IHZpZXc7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgYWN0aXZlIHZpZXdzXG4gICAgdmFyIGN1cnJlbnQgPSAkc3RhdGUuY3VycmVudCgpIHx8IHt9O1xuICAgIHZhciB0ZW1wbGF0ZUhhc2ggPSBjdXJyZW50LnRlbXBsYXRlcyB8fCB7fTtcbiAgICBpZighIXRlbXBsYXRlSGFzaFtpZF0gJiYgISFfdmlld0hhc2hbaWRdKSB7XG4gICAgICBfYWN0aXZlTGlzdC5wdXNoKF92aWV3SGFzaFtpZF0pO1xuICAgICAgX3Byb21pc2VUZW1wbGF0ZShpZCwgdGVtcGxhdGVIYXNoW2lkXSwgX3ZpZXdIYXNoW2lkXSk7XG4gICAgfVxuXG4gICAgLy8gSW1wbGVtZW50IGRlc3Ryb3kgbWV0aG9kXG4gICAgdmlldy5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICBfdW5yZWdpc3RlcihpZCk7XG4gICAgfTtcblxuICAgIHJldHVybiB2aWV3O1xuICB9O1xuXG4gIC8qKlxuICAgKiBBIGZhY3RvcnkgbWV0aG9kIHRvIGNyZWF0ZSBhIFZpZXcgaW5zdGFuY2VcbiAgICogXG4gICAqIEBwYXJhbSAge1N0cmluZ30gaWQgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGRhdGEgQSBkYXRhIG9iamVjdCB1c2VkIHRvIGV4dGVuZCBhYnN0cmFjdCBtZXRob2RzXG4gICAqIEByZXR1cm4ge1ZpZXd9ICAgICAgICBBIFZpZXcgZW50aXRpdHlcbiAgICovXG4gIF9zZWxmLmNyZWF0ZSA9IGZ1bmN0aW9uKGlkLCBkYXRhKSB7XG4gICAgZGF0YSA9IGRhdGEgfHwge307XG5cbiAgICAvLyBDcmVhdGVcbiAgICB2YXIgdmlldyA9IFZpZXcoaWQsIGRhdGEpO1xuXG4gICAgLy8gUmVnaXN0ZXJcbiAgICByZXR1cm4gX3JlZ2lzdGVyKGlkLCB2aWV3KTtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IGEgdmlldyBieSBpZFxuICAgKiBcbiAgICogQHBhcmFtICB7U3RyaW5nfSBpZCBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICAgKiBAcmV0dXJuIHtWaWV3fSAgICAgIEEgVmlldyBlbnRpdGl0eVxuICAgKi9cbiAgX3NlbGYuZ2V0ID0gZnVuY3Rpb24oaWQpIHtcbiAgICByZXR1cm4gX3ZpZXdIYXNoW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogVXBkYXRlXG4gICAqL1xuICBfc2VsZi4kdXBkYXRlID0gX3VwZGF0ZTtcblxuICAvLyBSZWdpc3RlciBtaWRkbGV3YXJlIGxheWVyXG4gICRzdGF0ZS4kdXNlKGZ1bmN0aW9uKHJlcXVlc3QsIG5leHQpIHtcbiAgICBfdXBkYXRlKGZ1bmN0aW9uKGVycikge1xuICAgICAgaWYoZXJyKSB7XG4gICAgICAgIF9zZWxmLmVtaXQoJ2Vycm9yOnJlbmRlcicsIGVycik7XG4gICAgICAgIHJldHVybiBuZXh0KGVycik7XG4gICAgICB9XG5cbiAgICAgIF9zZWxmLmVtaXQoJ3VwZGF0ZTpyZW5kZXInKTtcbiAgICAgIG5leHQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIF9zZWxmO1xufV07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogVmlld1xuICpcbiAqIEBwYXJhbSAge1N0cmluZ30gaWQgICAgICBVbmlxdWUgaWRlbnRpZmllciBmb3Igdmlld1xuICogQHBhcmFtICB7T2JqZWN0fSBjaGlsZCAgIEEgZGF0YSBvYmplY3QgdXNlZCB0byBleHRlbmQgYWJzdHJhY3QgbWV0aG9kc1xuICogQHJldHVybiB7Vmlld30gICAgICAgICAgIEFuIGFic3RyYWN0IHZpZXcgb2JqZWN0XG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oaWQsIGNoaWxkKSB7XG4gIC8vIEluc3RhbmNlXG4gIHZhciBfc2VsZjtcbiAgX3NlbGYgPSB7XG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCByZW5kZXJcbiAgICAgKi9cbiAgICByZW5kZXI6IGZ1bmN0aW9uKCkgeyB9LFxuXG4gICAgLyoqXG4gICAgICogQWJzdHJhY3QgcmVzZXRcbiAgICAgKi9cbiAgICByZXNldDogZnVuY3Rpb24oKSB7IH0sXG5cbiAgICAvKipcbiAgICAgKiBBYnN0cmFjdCBkZXN0cm95XG4gICAgICovXG4gICAgZGVzdHJveTogZnVuY3Rpb24oKSB7IH1cblxuICB9O1xuXG4gIC8vIEV4dGVuZCB0byBvdmVyd3JpdGUgYWJzdHJhY3QgbWV0aG9kc1xuICBhbmd1bGFyLmV4dGVuZChfc2VsZiwgY2hpbGQpO1xuXG4gIHJldHVybiBfc2VsZjtcbn07XG4iXX0=
