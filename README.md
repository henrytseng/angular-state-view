StateView
=========

Provides nested view management with template support.  

StateView is a modular component designed to be used with StateRouter, an AngularJS state-based router.  



Install
-------

To install in your project, install from npm (remember you'll also need to install angular-state-router since it is a dependency)

	npm install angular-state-view --save



Quick Start
-----------

Include the `state-router.min.js` script tag in your `.html`:

	<html ng-app="myApp">
	  <head>
	    <script src="/node_modules/angular/angular.min.js"></script>
	    <script src="/node_modules/angular-state-router/dist/state-router.min.js"></script>
	    <script src="/node_modules/angular-state-router/dist/state-view.min.js"></script>
	    <script src="/js/app.js"></script>
	  </head>
	  <body>
	    ...
	  </body>
	</html>

Add StateRouter as a dependency when your application module is instantiated

	angular.module('myApp', ['angular-state-router', 'angular-state-view']);

During the configuration of StateRouter utilize `templates` while defining your states










Events
------

Events are emit from $state; where $state inherits from [events.EventEmitter](https://nodejs.org/api/events.html).  

To listen to events 

	$state.on('update:render', function() {
		// ...
	});



Event: 'update:render'
---------------

This event is emitted when the view is rendered.  



Event: 'error'
--------------

* `request` *Object* Requested data `{ name: 'nextState', params: {} }`

This event is emitted whenever an error occurs.  



License
-------

Copyright (c) 2015 Henry Tseng

Released under the MIT license. See LICENSE for details.