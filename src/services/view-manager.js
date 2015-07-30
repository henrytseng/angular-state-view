'use strict';

/* global window:false */

var EventEmitter = require('events').EventEmitter;

module.exports = ['$state', function($state) {

  // Instance of EventEmitter
  var _self = new EventEmitter();

  /**
   * Update rendered views
   */
  var _update = function() {
    
  };

  /**
   * Register a view
   * 
   * @param  {String} id Unique identifier for view
   * @param  {String} id Unique identifier for view
   * @param  {String} id Unique identifier for view
   * @return {$viewManager}    Itself, chainable
   */
  _self.register = function(id, delegate) {

    return _self;
  };

  /**
   * Unregister a view
   * 
   * @param  {String}       id Unique identifier for view
   * @return {$viewManager}    Itself, chainable
   */
  _self.unregister = function(id) {
    return _self;
  };

  // Register middleware layer
  $state.$use(function(request, next) {
    _update();
    next();
  });

  return _self;
}];
