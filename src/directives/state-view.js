'use strict';

module.exports = ['$state', function ($state) {
  return {
    restrict: 'EA',
    scope: {
      
    },
    link: function(scope, element, attrs) {
      console.log(attrs);
    }

  };
}];
