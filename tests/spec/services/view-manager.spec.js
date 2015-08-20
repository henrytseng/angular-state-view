'use strict';

describe('$viewManager', function() {

  beforeEach(angular.mock.module('angular-state-view'));

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
        var original = {
          type: 'bird'
        };

        // Create
        var view = $viewManager.create('myview', {
          albatros: original
        });
        expect(view).toBeDefined();

        // Stub abstract views
        expect(view.render).toBeDefined();
        expect(view.reset).toBeDefined();
        expect(view.destroy).toBeDefined();

        // Override
        expect(view.albatros).toBe(original);

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
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              stringTemplate: '/lorem.html'
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope) {
        var view = $viewManager.create('irrelevant', {
          reset: jasmine.createSpy('resetIrrelevant'),
          render: jasmine.createSpy('renderIrrelevant')
        });

        $viewManager.$update(function() { });

        // Digest
        $rootScope.$digest();

        expect(view.render).not.toHaveBeenCalled();
        done();
      });
    });

    it('Should accept String templates', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              stringTemplate: '/lorem.html'
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope) {
        $rootScope.$digest();

        var view = $viewManager.create('stringTemplate', {
          render: jasmine.createSpy('renderStringTemplate')
        });
        $viewManager.$update(function() { });

        // Digest
        $rootScope.$digest();

        expect(view.render).toHaveBeenCalledWith('<ng-include src="\'/lorem.html\'"></ng-include>');
        done();
      });
    });

    it('Should accept function templates and inject with $invoker', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              functionTemplate: function($locale) {
                return 'Sed ut - '+$locale.id;
              }
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope, $locale) {
        $rootScope.$digest();

        var view = $viewManager.create('functionTemplate', {
          render: jasmine.createSpy('renderFunctionTemplate')
        });
        $viewManager.$update(function() {
          expect(view.render).toHaveBeenCalledWith('Sed ut - '+$locale.id);
          done();
        });

        $rootScope.$digest();
      });
    });

    it('Should accept function templates and inject with $invoker and wait for promise', function(done) {
      var deferred;
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              deferredTemplate: function() {
                return deferred.promise;
              }
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope, $locale, $q) {
        $rootScope.$digest();

        deferred = $q.defer();

        var view = $viewManager.create('deferredTemplate', {
          render: jasmine.createSpy('renderDeferredTemplate')
        });
        $viewManager.$update(function() {
          expect(view.render).toHaveBeenCalledWith('Dolor ipsum');
          done();
        });

        // Resolve
        $rootScope.$apply(function() {
          deferred.resolve('Dolor ipsum');
        });
      });
    });

    it('Should ignore views without corresponding state.templates', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              presentTemplate: '/explicabo.html'
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope) {
        $rootScope.$digest();

        var presentView = $viewManager.create('presentTemplate', {
          render: jasmine.createSpy('renderPresentTemplate')
        });
        var irrelevantView = $viewManager.create('irrelevantTemplate', {
          render: jasmine.createSpy('renderIrrelevantTemplate')
        });

        $viewManager.$update(function() {
          expect(presentView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
          expect(irrelevantView.render).not.toHaveBeenCalled();
          done();
        });

        $rootScope.$digest();
      });
    });

    it('Should ignore state.templates without corresponding views', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              presentTemplate: '/explicabo.html',
              missingTemplate: '/dicta.html'
            }
          })
          .init('blog.entries');
      });

      angular.mock.inject(function($viewManager, $rootScope) {
        $rootScope.$digest();

        var presentView = $viewManager.create('presentTemplate', {
          render: jasmine.createSpy('renderPresentTemplate')
        });

        $viewManager.$update(function() {
          expect(presentView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
          done();
        });

        $rootScope.$digest();
      });
    });

    it('Should reset last active views', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              myTemplate: '/explicabo.html'
            }
          })
          .state('blog.catalog', {
            templates: {
              myTemplate: '/ut.html'
            }
          })
          .state('blog', {
            templates: {
              irrelevantTemplate: '/sed.html'
            }
          });
      });

      angular.mock.inject(function($viewManager, $state, $rootScope) {
        $rootScope.$digest();

        var myView = $viewManager.create('myTemplate', {
          reset: jasmine.createSpy('resetMyTemplate'),
          render: jasmine.createSpy('renderMyTemplate')
        });
        var irrelevantView = $viewManager.create('irrelevantTemplate', {
          reset: jasmine.createSpy('resetIrrelevantTemplate'),
          render: jasmine.createSpy('renderIrrelevantTemplate')
        });

        $state.change('blog.entries');

        $rootScope.$digest();

        // First time
        expect(myView.reset).not.toHaveBeenCalled();
        expect(myView.render).toHaveBeenCalledWith('<ng-include src="\'/explicabo.html\'"></ng-include>');
        expect(irrelevantView.reset).not.toHaveBeenCalled();
        expect(irrelevantView.render).not.toHaveBeenCalled();
        
        $state.change('blog.catalog');
        $rootScope.$digest();

        // Second time
        expect(myView.reset).toHaveBeenCalled();
        expect(myView.render).toHaveBeenCalledWith('<ng-include src="\'/ut.html\'"></ng-include>');
        expect(irrelevantView.reset).not.toHaveBeenCalled();
        expect(irrelevantView.render).not.toHaveBeenCalled();

        done();
      });
    });

    it('Should broadcast $viewRender event', function(done) {
      angular.mock.module(function($stateProvider) {
        $stateProvider
          .state('blog.entries', {
            templates: {
              otherTemplate: '/explicabo.html'
            }
          });
      });

      angular.mock.inject(function($viewManager, $rootScope, $state) {
        $rootScope.$digest();
        
        var myView = $viewManager.create('myTemplate', {
          reset: jasmine.createSpy('resetMyTemplate'),
          render: jasmine.createSpy('renderMyTemplate')
        });
        
        var onViewRender = jasmine.createSpy('onViewRender');
        
        $rootScope.$on('$viewRender', onViewRender);

        $state.change('blog.entries');

        // Resolve
        $rootScope.$digest();

        expect($state.current().name).toBe('blog.entries');
        expect(onViewRender).toHaveBeenCalled();

        done();
      });
    });

  });
});
