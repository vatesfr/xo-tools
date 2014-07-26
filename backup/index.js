#!/usr/bin/env node

'use strict';

//====================================================================

var filter = require('lodash.filter');
var inquirer = require('inquirer');
var minimist = require('minimist');
var Promise = require('bluebird');
var Xo = require('xo-lib');

//====================================================================

var wrap = function (val) {
  return function () {
    return val;
  };
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
    throw 'missing <url>';
  }

  var xo = new Xo(args._[0]);

  return Promise.try(function () {
    if (args.token) {
      return xo.call('session.signInWithToken', {
        token: args.token,
      });
    }

    if (!args.user) {
      throw 'missing <token> or <user>';
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
      name: vm.name_label +'_'+ (new Date().toISOString()),
    });
  }).all();
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
