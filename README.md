StateView
=========

Provides nested view management with template support.  

StateView is a modular component designed to be used with StateRouter, an AngularJS state-based router.  



Install
-------

To install in your project, simply install from npm

	npm install angular-state-view --save



Events
------

Events are emit from $state; where $state inherits from [events.EventEmitter](https://nodejs.org/api/events.html).  

To listen to events 

	$state.on('render', function() {
		// ...
	});



Event: 'render'
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