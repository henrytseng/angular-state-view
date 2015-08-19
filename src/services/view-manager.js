'use strict';

/* global window:false */

var View = require('../view/view');

module.exports = ['$rootScope', '$state', '$injector', '$q', function($rootScope, $state, $injector, $q) {

  // Instance
  var _self = {};

  var _viewHash = {};
  var _activeSet = {};

  /**
   * Reset active views
   * 
   * @return {Promise} A promise fulfilled when currently active views are reset
   */
  var _resetActive = function() {
    // Reset views
    var resetPromised = {};
    angular.forEach(_activeSet, function(view, id) {
      resetPromised[id] = $q.when(view.reset());
    });

    // Empty active set
    _activeSet = {};

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
            _activeSet[id] = view;
          }
        });

        $q.all(viewsPromised).then(function() {
          callback();
        }, callback);

      }, callback);

    // None
    } else {
      callback();
    }
  };
  _self.$update = _update;

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

  // Register middleware layer
  $state.$use(function(request, next) {
    _update(function(err) {
      if(err) {
        $rootScope.$broadcast('$viewError', err);
      } else {
        $rootScope.$broadcast('$viewRender');
      }

      next(err);
    });
  });

  return _self;
}];
