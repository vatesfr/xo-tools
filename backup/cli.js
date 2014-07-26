#!/usr/bin/env node

'use strict';

//====================================================================

var filter = require('lodash.filter');
var inquirer = require('inquirer');
var logSymbols = require('log-symbols');
var minimist = require('minimist');
var Promise = require('bluebird');
var Xo = require('xo-lib');

//====================================================================

var wrap = function (val) {
  return function () {
    return val;
  };
};

var join = Array.prototype.join;
join = join.call.bind(join);

var log = function (message) {
  message = join(arguments, ' ');
  console.log(logSymbols.success, message);
};

var error = function (message) {
  message = join(arguments, ' ');
  console.error(logSymbols.error, message);
};

var fatal = function (message) {
  message = join(arguments, ' ');
  throw logSymbols.error +' '+ message;
};

//====================================================================

exports = module.exports = function (args) {
  // Parse arguments.
  args = minimist(args, {
    boolean: 'help',
    string: 'token user password'.split(' '),

    alias: {
      help: 'h',
    }
  });

  if (args.help) {
    return exports.help();
  }

  if (!args._.length) {
    fatal('missing <url>');
  }

  var xo = new Xo(args._[0]);

  return Promise.try(function () {
    if (args.token) {
      return xo.call('session.signInWithToken', {
        token: args.token,
      });
    }

    if (!args.user) {
      fatal('missing <token> or <user>');
    }

    return new Promise(function (resolve) {
      var password = args.password;

      if (password) {
        return resolve(password);
      }

      inquirer.prompt([{
        type: 'password',
        name: 'password',
        message: 'Password',
      }], function (answers) {
        resolve(answers.password);
      });
    }).then(function (password) {
      return xo.call('session.signInWithPassword', {
        user: args.user,
        password: password,

        // Compatibility.
        email: args.user,
      });
    });
  }).then(function () {
    return xo.call('xo.getAllObjects');
  }).then(function (objects) {
    return filter(objects, {
      type: 'VM',
      'power_state': 'Running',
    });
  }).map(function (vm) {
    return xo.call('vm.snapshot', {
      id: 'id' in vm ? vm.id : vm.UUID,
      name: new Date().toISOString(),
    }).then(function () {
      log(vm.name_label, 'snapshotted');
    }).catch(function (e) {
      error(vm.name_label, e.stack || e);
    });
  }).all().return();
};

exports.help = wrap(
  'Usage: backup --token <token> <url>\n'+
  '       backup --user <user> [--password <password>] <url>\n'+
  '\n'+
  '<url>\n'+
  '  URL of the XO instance to connect to (http://xo.company.tld/api/).\n'+
  '\n'+
  '<token>\n'+
  '  Token to use for authentication.\n'+
  '\n'+
  '<user>, <password>\n'+
  '  User/password to use for authentication.\n'+
  '  If not provided, the password will be asked.'
);

//====================================================================

// If this module has not be required but executed directly, run the
// main function.
if (!module.parent) {
  require('exec-promise')(exports);
}

