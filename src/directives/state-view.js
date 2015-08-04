'use strict';

module.exports = ['$state', '$viewManager', '$templateCache', '$compile', '$log', function ($state, $viewManager, $templateCache, $compile, $log) {

  return {
    restrict: 'EA',
    scope: {

    },
    link: function(scope, element, attrs) {

      // Create view
      var _view = $viewManager.create(attrs.id, element, {

        // Element
        $element: element,

        // Render
        render: function(data) {
          $log.log('render', data);

          var renderer = $compile(data);

          element.html(renderer(scope.$parent));
        }

      });

      // Destroy
      element.on('$destroy', function() {
        $log.log('destroy');
        _view.destroy();
      });
    }
  };
}];
