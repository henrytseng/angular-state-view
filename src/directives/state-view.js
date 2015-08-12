'use strict';

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', '$controller', '$q', function ($state, $viewManager, $templateCache, $compile, $controller, $q) {
  return {
    restrict: 'EA',
    priority: 400,
    scope: {

    },
    link: function(scope, $element, attrs) {
      // Create view
      var _view = $viewManager.create(attrs.id, {

        // Element
        $element: $element,

        /**
         * Render view
         * 
         * @param  {String}  template   A template to use
         * @param  {Mixed}   controller A controller to attach applied to scope.$parent
         * @param  {Object}  locals     A data Object to instantiate controller with
         * @return {Promise}            A promise resolved when rendering is complete
         */
        render: function(template, controller, locals) {
          var deferred = $q.defer();

          $element.html(template);

          // Compile
          var link = $compile($element.contents());

          // Controller
          if(controller) {
            var _locals = angular.extend({}, locals || {}, {
              $scope: scope.$parent
            });
            $controller(controller, _locals);
          }

          // Link
          link(scope.$parent);

          deferred.resolve();
          return deferred.promise;
        },

        /**
         * Reset view
         * 
         * @return {Promise} A promise resolved when rendering is complete
         */
        reset: function() {
          var deferred = $q.defer();

          // Empty
          $element.empty();

          deferred.resolve();
          return deferred.promise;
        }
      });

      // Destroy
      $element.on('$destroy', function() {
        _view.destroy();
      });
    }
  };
}];
