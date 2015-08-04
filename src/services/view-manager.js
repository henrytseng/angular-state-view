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
