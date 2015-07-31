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

  describe('#create', function() {

    it('Should require an id in order to create a view', function() {
      angular.mock.inject(function($viewManager) {
        expect(function() {

          $viewManager.create(null, {});

        }).toThrow(new Error('View requires an id.'));
      });
    });

    it('Should register view when created', function() {
      angular.mock.inject(function($viewManager) {
        // Create
        var view = $viewManager.create('myview', {});
        expect(view).toBeDefined();

        expect(view.render).toBeDefined();
        expect(view.reset).toBeDefined();
        expect(view.destroy).toBeDefined();

        // Retrieve
        expect($viewManager.get('myview')).toBeDefined();
        expect($viewManager.get('myview')).toBe(view);
      }); 
    });

    it('Should unregister view when destroyed', function() {
      angular.mock.inject(function($viewManager) {
        // Create
        var view = $viewManager.create('myview', {});
        expect(view).toBeDefined();

        // Retrieve
        expect($viewManager.get('myview')).toBeDefined();
        expect($viewManager.get('myview')).toBe(view);

        view.destroy();

        expect($viewManager.get('myview')).toBeUndefined();
        expect($viewManager.get('myview')).not.toBe(view);
      }); 
    });

  });

  describe('#update', function() {

    it('Should continue without error when no templates exist', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: { }
        };
      };

      angular.mock.inject(function($viewManager) {
        var view = $viewManager.create('irrelevant', {
          render: jasmine.createSpy('renderIrrelevant')
        });
        $viewManager.update(function() {
          expect(view.render).not.toHaveBeenCalled();
          done();
        });
      });
    });

    it('Should accept String templates', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            stringTemplate: 'Lorem ipsum'
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var view = $viewManager.create('stringTemplate', {
          render: jasmine.createSpy('renderStringTemplate')
        });
        $viewManager.update(function() {
          expect(view.render).toHaveBeenCalledWith('Lorem ipsum');
          done();
        });
        
        $rootScope.$apply();
      });
    });

    it('Should accept function templates and inject with $invoker', function(done) {
      angular.mock.inject(function($viewManager) {
        done();
      });
    });

    it('Should accept function templates and inject with $invoker and wait for promise', function(done) {
      angular.mock.inject(function($viewManager) {
        done();
      });
    });

    it('Should ignore views without corresponding state.templates', function() {
      angular.mock.inject(function($viewManager) {

      });
    });

    it('Should ignore state.templates without corresponding views', function() {
      angular.mock.inject(function($viewManager) {
        
      });
    });

    it('Should reset last active views', function() {
      angular.mock.inject(function($viewManager) {
        
      });
    });

    it('Should reset views when not relevant to current state', function() {
      angular.mock.inject(function($viewManager) {
        
      });
    });

  });
});
