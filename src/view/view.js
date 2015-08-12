'use strict';

/**
 * View
 *
 * @param  {String} id      Unique identifier for view
 * @param  {Object} child   A data object used to extend abstract methods
 * @return {View}           An abstract view object
 */
module.exports = function View(id, child) {

  // Instance
  var _self;
  _self = {

    /**
     * Abstract render method
     */
    render: function(template) { },

    /**
     * Abstract reset method
     */
    reset: function() { },

    /**
     * Abstract destroy method
     */
    destroy: function() { }

  };

  // Extend to overwrite abstract methods
  angular.extend(_self, child);

  return _self;
};
