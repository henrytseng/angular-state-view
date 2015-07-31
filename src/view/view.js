'use strict';

/**
 * View
 *
 * @param  {String} id      Unique identifier for view
 * @param  {Object} child   A data object used to extend abstract methods
 * @return {View}           An abstract view object
 */
module.exports = function(id, child) {
  // Instance
  var _self;
  _self = {

    /**
     * Abstract render
     */
    render: function() { },

    /**
     * Abstract reset
     */
    reset: function() { },

    /**
     * Abstract destroy
     */
    destroy: function() { }

  };

  // Extend to overwrite abstract methods
  angular.extend(_self, child);

  return _self;
};
