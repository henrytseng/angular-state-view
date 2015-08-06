StateView
=========

[![Build Status](https://travis-ci.org/henrytseng/angular-state-view.svg?branch=master)](https://travis-ci.org/henrytseng/angular-state-view) [![Join the chat at https://gitter.im/henrytseng/angular-state-router](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/henrytseng/angular-state-router?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) 

Provides nested view management with template support.  

StateView is a modular component designed to be used with StateRouter, an AngularJS state-based router.  



Install
-------

To install in your project, install from npm (remember you'll also need to install angular-state-router since it is a dependency)

	npm install angular-state-view --save



Quick Start
-----------

Include the `state-view.min.js` script tag in your `.html`:

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

During the configuration of StateRouter utilize `templates` to associate a view with a rendering an HTML partial

	angular.module('myApp', ['angular-state-router'])
	  .config(function($stateProvider) {

	    $stateProvider

	      // Define states
	      .state('landing', {
	        url: '/',
	        templates: {

	          // HTML fragment partial template
	          sideBar: '/sidebar.html',

	          // Function injection template
	          greetingPopOver: function($templateCache, $greetingService) {
	            return $templateCache.get('greeting_' + $greetingService.message() + '.html');
	          },

	          // Promised template
	          calloutBlock: function($q, $timeout) {
	            var deferred = $q.defer();

	            $timeout(function() {
	              deferred.resolve('Dolor ipsum');
	            }, 3000);

	            return deferred.promise;
	          }

	        }
	      })

	      // Set initialization location; optionally
	      .init('landing');

	  });

Now in the view you can utilize the view `id` defined in the templates.  

	<body>
		<div class="wrapper">
			<sview id="sideBar"></sview>
			<sview id="greetingPopOver"></sview>
		</div>
		<div class="popover">
			<sview id="calloutBlock"></sview>
		</div>
	</body>



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