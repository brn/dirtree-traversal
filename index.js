/**
 * @fileoverview
 * @author Taketshi Aono
 */

'use strict';
var fs = require('fs');
var Promise = require('node-promise');


/**
 * Walk directory tree.
 * @param {string} path
 * @param {Function} fn
 */
module.exports = function(path, fn, excludes, matcher) {
  excludes = excludes || /[^\s\S]/;
  matcher = matcher || ANY;
  path = exports.resolve(path);
  var defer = Promise.defer();
  var promises = [];

  fs.readdir(path, function(node) {
    var stack = [[node, path]];
    var currentpath = path;
    var next;
    var dirEnt;
    var entry;
    var match;
    var code = [];

    function innerLoop() {
      dirEnt = node[0];
      if (!dirEnt.length) return setImmediate(outerLoop);
      next = node[0].shift();
      if (next !== '.' && next !== '..') {
        entry = node[1] + '/' + next;
        fs.stat(entry, function(err, stat) {
          if (err) throw err;
          if (stat.isDirectory()) {
            stack.push([node[0], node[1]]);
            fs.readdir(entry, function(err, dir) {
              if (err) throw err;
              node = [dir, entry];
              dirEnt = node[0];
              setImmediate(innerLoop);
            });
          } else {
            if (!matcher.test(entry)) {
              return setImmediate(innerLoop);
            }
            if (excludes.test(entry)) {
              return setImmediate(innerLoop);
            }
            promises.push(exports.promise(fn.bind(entry, entry)));
            return setImmediate(innerLoop);
          }
        });
      }
    }

    function outerLoop() {
      if (!stack.length) return defer.resolve();
      node = stack.pop();
      innerLoop();
    }
    outerLoop();
  });

  return defer.then(function() {
    return Promise.all(promises);
  });
};


/**
 * Walk directory tree asyc.
 * @param {string} path
 * @param {Function} fn
 */
module.exports.sync = function(path, fn, excludes, matcher) {
  excludes = excludes || /[^\s\S]/;
  matcher = matcher || ANY;
  path = exports.resolve(path);

  var node = fs.readdirSync(path);
  var isCall = typeof fn === 'function';
  var stack = [[node, path]];
  var currentpath = path;
  var next;
  var dirEnt;
  var entry;
  var match;
  var code = [];

  while (stack.length) {

    node = stack.pop();
    dirEnt = node[0];

    while (dirEnt.length) {
      next = node[0].shift();
      if (next !== '.' && next !== '..') {
        entry = node[1] + '/' + next;
        if (fs.statSync(entry).isDirectory()) {
          stack.push([node[0], node[1]]);
          node = [fs.readdirSync(entry), entry];
          dirEnt = node[0];
        } else {
          if (!matcher.test(entry)) {
            continue;
          }
          if (excludes.test(entry)) {
            continue;
          }
          isCall? code.push('fn("' + entry + '");') : code.push(entry);
        }
      }
    }
  }

  if (!isCall) return code;
  Function('fn', code.join(''))(fn);
};
