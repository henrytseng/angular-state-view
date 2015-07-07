'use strict';

/**
 * Dependencies
 */
var fs = require('fs');
var gulp = require('gulp');
var notify = require('gulp-notify');
var runSequence = require('run-sequence');
var path = require('path');

var tasks = fs.readdirSync('tasks/')
  .filter(function(file) { return file.match(/\.js$/); })
  .forEach(function(task) {
    require('./tasks/'+task);
  });

// Default task
gulp.task('default', function(callback) {
  runSequence('lint', 'build', 'test', callback);
});
