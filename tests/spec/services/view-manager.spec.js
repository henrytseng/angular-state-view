'use strict';

describe('$viewManager', function() {
  var _fakeApp;
  var _stateRouterHelper = require('../../../node_modules/angular-state-router/tests/helpers/state-router.helper');

  beforeEach(function() {
    _fakeApp = angular.module('fakeApp', function() {});

    // Load helpers
    _stateRouterHelper.factory(_fakeApp).reset();
  });

  beforeEach(angular.mock.module('angular-state-view', 'fakeApp'));

  describe('#register', function() {

    it('Should register a view', function() {
      angular.mock.inject(function($viewManager) {
        
      });
    });

  });

  describe('#unregister a view', function() {

    it('Should unregister a view a view', function() {
      angular.mock.inject(function($viewManager) {
        
      });
    });

  });

});
