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
