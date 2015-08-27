StateView
=========

[![Build Status](https://travis-ci.org/henrytseng/angular-state-view.svg?branch=master)](https://travis-ci.org/henrytseng/angular-state-view) [![Join the chat at https://gitter.im/henrytseng/angular-state-router](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/henrytseng/angular-state-router?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) 

Provides nested view management with template support.  

StateView is a modular component designed to be used with [StateRouter](https://www.npmjs.com/package/angular-state-router), an AngularJS state-based router.  



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
	    <script src="/node_modules/angular-state-view/dist/state-view.min.js"></script>
	    <script src="/js/app.js"></script>
	  </head>
	  <body>
	    ...
	  </body>
	</html>

In `app.js` add `angular-state-router` and `angular-state-view` as a dependency when your application module is instantiated.  

	angular.module('myApp', ['angular-state-router', 'angular-state-view']);

During the configuration of StateRouter utilize `templates` to associate a view with a rendering an HTML partial

	angular.module('myApp', ['angular-state-router', 'angular-state-view'])
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

Now in the view you can utilize the view `id` defined in the templates by using the `sview` element.  

	<body>
		<div class="wrapper">
			<sview id="sideBar"></sview>
			<sview id="greetingPopOver"></sview>
		</div>
		<div class="popover">
			<sview id="calloutBlock"></sview>
		</div>
	</body>

Including nesting views to form template structures where the view `sideBar` might utilize the following code HTML partial `sidebar.html` as a template:

	<div class="nav_sidebar">
		<ul class="nav_main">
			<li><a href="#">Products</a></li>
			<li><a href="#">Catalogs</a></li>
			<li><a href="#">Contact</a></li>
		</ul>
		<sview id="messagingCallout"></sview>
	</div>



Controllers
-----------

Controllers can be instantiated on a view `$scope` during rendering by specifying a `controllers` Object

	angular.module('myApp')
	  .controller('ProductController', function($scope, $state) {
	    $stateProvider

	      // Define states
	      .state('products', {
	        url: '/products',
	        templates: {
	          productItem: '/item.html'
	        },
	        controllers: {
	        	productItem: 'ProductItemController'
	        }
	      });

	  });

Controllers must use the same view `id`.  



Resolve
-------

States that include a resolve property will resolve all promises and expose data to controllers.  

	angular.module('myApp')
	  .config(function() {
	      $stateProvider
  	
	        // Define states
	        .state('products.items', {
	          url: '/products/:item',
	          resolve: {
	          	currentProduct: function(ProductService) {
		           return ProductService.get();
	          	}
	          },
	          templates: {
	            productItem: '/item.html'
	          },
	          controllers: {
	          	productItem: 'ProductItemController'
	          }
	        });
	
	    });
	  })
	  
`ProductService.get()` should return a promise so that you may access the resolved value of `currentProduct` via your controller as follows: 

	angular.module('myApp')
	  .controller(function(currentProduct, $scope) {
	    $scope.product = currentProduct;
	  });



Events
------

Events are broadcast on the `$rootScope`.  

### $viewRender

This event is broadcasted when the view is rendered.  


### $viewError

This event is broadcasted when an error occurs during view rendering.  



API Directives
--------------

### sview

* id {String} A unque identifier associated with a `template`

A view tag where the contents are dynamically replaced as states defined `templates`.

##### Example

States having `templates.layout` defined will insert and compile relevant HTML partials.  

	<sview id="layout"></sview>

Where the state definition is either a HTML partial:

	$stateProvider.state('my.state', {
		templates: {
         layout: '/single-col.html',
		}
	});

Or function injection template

	$stateProvider.state('my.state', {
		templates: {
         layout: function($templateCache, $greetingService) {
	            return $templateCache.get('greeting_' + $greetingService.message() + '.html');
		}
	});

Or promised template

	$stateProvider.state('my.state', {
	  templates: {
       layout: function($q, $timeout) {
         var deferred = $q.defer();

         $timeout(function() {
           deferred.resolve('Dolor ipsum');
         }, 3000);
         
         return deferred.promise;
       }
	});



License
-------

Copyright (c) 2015 Henry Tseng

Released under the MIT license. See LICENSE for details.