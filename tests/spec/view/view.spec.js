'use strict';

describe('View', function() {
  var View = require('../../../src/view/view');

  describe('#render', function() {

    it('Should stub an abstract render method', function() {
      var view = View();

      expect(view.render).toBeDefined();
    });

  });

});
