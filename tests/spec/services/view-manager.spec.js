'use strict';

describe('$viewManager', function() {
  var _fakeApp;
  var _stateRouterHelper = require('../../../node_modules/angular-state-router/tests/helpers/state-router.helper');
  var process = require('../../../node_modules/angular-state-router/src/utils/process');

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
            stringTemplate: '/lorem.html'
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var view = $viewManager.create('stringTemplate', {
          render: jasmine.createSpy('renderStringTemplate')
        });
        $viewManager.update(function() {
          expect(view.render).toHaveBeenCalledWith('<ng-include src="\'/lorem.html\'"></ng-include>');
          done();
        });
        
        $rootScope.$apply();
      });
    });

    it('Should accept function templates and inject with $invoker', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            functionTemplate: function($locale) {
              return 'Sed ut - '+$locale.id;
            }
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope, $locale) {
        var view = $viewManager.create('functionTemplate', {
          render: jasmine.createSpy('renderFunctionTemplate')
        });
        $viewManager.update(function() {
          expect(view.render).toHaveBeenCalledWith('Sed ut - '+$locale.id);
          done();
        });

        // Resolve
        process.nextTick(function() {        
          $rootScope.$apply();
        });
      });
    });

    it('Should accept function templates and inject with $invoker and wait for promise', function(done) {
      var deferred;
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            deferredTemplate: function($q) {
              deferred = $q.defer();
              return deferred.promise;
            }
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope, $locale) {
        var view = $viewManager.create('deferredTemplate', {
          render: jasmine.createSpy('renderDeferredTemplate')
        });
        $viewManager.update(function() {
          expect(view.render).toHaveBeenCalledWith('Dolor ipsum');
          done();
        });

        // Resolve
        process.nextTick(function() {
          deferred.resolve('Dolor ipsum');

          $rootScope.$apply();
        });

      });
    });

    it('Should ignore invalid templates', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            nullTemplate: null
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var nullView = $viewManager.create('nullTemplate', {
          render: jasmine.createSpy('renderNullTemplate')
        });

        $viewManager.update(function() {
          expect(nullView.render).not.toHaveBeenCalled();
          done();
        });

        // Resolve
        process.nextTick(function() {        
          $rootScope.$apply();
        });
      });
    });

    it('Should ignore views without corresponding state.templates', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            presentTemplate: '/explicabo.html'
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var presentView = $viewManager.create('presentTemplate', {
          render: jasmine.createSpy('renderPresentTemplate')
        });
        var irrelevantView = $viewManager.create('irrelevantTemplate', {
          render: jasmine.createSpy('renderIrrelevantTemplate')
        });

        $viewManager.update(function() {
          expect(presentView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
          expect(irrelevantView.render).not.toHaveBeenCalled();
          done();
        });

        // Resolve
        process.nextTick(function() {        
          $rootScope.$apply();
        });
      });
    });

    it('Should ignore state.templates without corresponding views', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            presentTemplate: '/explicabo.html',
            missingTemplate: '/dicta.html'
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var presentView = $viewManager.create('presentTemplate', {
          render: jasmine.createSpy('renderPresentTemplate')
        });

        $viewManager.update(function() {
          expect(presentView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
          done();
        });

        // Resolve
        process.nextTick(function() {        
          $rootScope.$apply();
        });
      });
    });

    it('Should reset last active views', function(done) {
      _stateRouterHelper.$service.current = function() {
        return {
          name: 'blog.entries',
          templates: {
            myTemplate: '/explicabo.html'
          }
        };
      };

      angular.mock.inject(function($viewManager, $rootScope) {
        var myView = $viewManager.create('myTemplate', {
          reset: jasmine.createSpy('resetMyTemplate'),
          render: jasmine.createSpy('renderMyTemplate')
        });
        var irrelevantView = $viewManager.create('irrelevantTemplate', {
          reset: jasmine.createSpy('resetIrrelevantTemplate'),
          render: jasmine.createSpy('renderIrrelevantTemplate')
        });

        $viewManager.update(function() {
          expect(myView.reset).not.toHaveBeenCalled();
          expect(myView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
          expect(irrelevantView.reset).not.toHaveBeenCalled();
          expect(irrelevantView.render).not.toHaveBeenCalled();

          $viewManager.update(function() {
            expect(myView.reset).toHaveBeenCalled();
            expect(myView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
            expect(irrelevantView.reset).not.toHaveBeenCalled();
            expect(irrelevantView.render).not.toHaveBeenCalled();
            done();
          });

          // Resolve
          process.nextTick(function() {
            $rootScope.$apply();
          });
        });

        // Resolve
        process.nextTick(function() {        
          $rootScope.$apply();
        });
      });
    });

  });
});
