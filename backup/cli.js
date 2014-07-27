#!/usr/bin/env node

'use strict';

//====================================================================

var filter = require('lodash.filter');
var indexBy = require('lodash.indexby');
var inquirer = require('inquirer');
var logSymbols = require('log-symbols');
var minimist = require('minimist');
var pick = require('lodash.pick');
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
    string: 'token user password max-snapshots'.split(' '),

    alias: {
      help: 'h',
      'max-snapshots': 'n',
    }
  });

  if (args.help) {
    return exports.help();
  }

  if (!args._.length) {
    fatal('missing <url>');
  }

  var xo = new Xo(args._[0]);

  var snapshots;
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
    snapshots = indexBy(filter(objects, {
      type: 'VM-snapshot',
    }), 'ref');

    return filter(objects, {
      type: 'VM',
      'power_state': 'Running',
    });
  }).map(function (vm) {
    return xo.call('vm.snapshot', {
      id: 'id' in vm ? vm.id : vm.UUID,
      name: 'auto-'+ (new Date().toISOString()),
    }).then(function () {
      log(vm.name_label, 'snapshotted');

      if (!args['max-snapshots']) {
        return;
      }

      // Select existing automatic snapshots.
      var vmSnapshots = filter(
        pick(snapshots, vm.snapshots),
        function (snapshot) {
          return /^auto-/.test(snapshot.name_label);
        }
      );

      // Take all but the (n - 1) recent ones.
      vmSnapshots = vmSnapshots.sort(function (a, b) {
        return a.snapshot_time - b.snapshot_time;
      }).slice(0, vmSnapshots.length - args['max-snapshots'] + 1);

      // Delete them.
      return Promise.map(vmSnapshots, function (snapshot) {
        return xo.call('vm.delete', {
          id: 'id' in snapshot ? snapshot.id : snapshot.UUID,
          delete_disks: true,
        }).then(function () {
          log(vm.name_label, 'old snapshot deleted', snapshot.name_label);
        }).catch(function (e) {
          error(
            vm.name_label,
            'old snapshot deletion failed',
            snapshot.name_label,
            e.stack || e
          );
        });
      });
    }).catch(function (e) {
      error(vm.name_label, 'snapshot failed', e.stack || e);
    });
  }).all().return();
};

exports.help = wrap((function (pkg) {
  var name = pkg.name;

  return 'Usage: '+ name +' [--max-snapshots <n>] --token <token> <url>\n'+
    '       '+ name +' [--max-snapshots <n>] --user <user> [--password <password>] <url>\n'+
    '\n'+
    '<url>\n'+
    '  URL of the XO instance to connect to (http://xo.company.tld/api/).\n'+
    '\n'+
    '<token>\n'+
    '  Token to use for authentication.\n'+
    '\n'+
    '<user>, <password>\n'+
    '  User/password to use for authentication.\n'+
    '  If not provided, the password will be asked.\n'+
    '\n'+
    '<n>\n'+
    '  If defined, all (automatic) snapshots but the last <n> will be deleted.\n'+
    '\n'+
    name +' v'+ pkg.version
  ;
})(require('./package')));

//====================================================================

// If this module has not be required but executed directly, run the
// main function.
if (!module.parent) {
  require('exec-promise')(exports);
}

