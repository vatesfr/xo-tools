# Backup

> Order Xen-Orchestra to snapshot all running VMs.

This tool aims to provide automated backup solution for your VMs (with the help of XO), until we implement this feature directly in the web interface.

Thanks to the XO architecture, you can backup all your VMs, regardless of which host they are.

## How it works (so far)

We choose to create a snapshot of all your **running** VMs, on all XO connected servers. You can execute this script manually, or call it in a Cron job.

## Installation

You need `nodejs` to install this tool. Then, just type:

`sudo npm install -g xo-backup`

## Usage

For the complete usage, use the help argument:

```
> xo-backup --help
Usage: xo-backup [--max-snapshots <n>] --token <token> <url>
       xo-backup [--max-snapshots <n>] --user <user> [--password <password>] <url>

<url>
  URL of the XO instance to connect to (http://xo.company.tld/api/).

<token>
  Token to use for authentication.

<user>, <password>
  User/password to use for authentication.
  If not provided, the password will be asked.

<n>
  If defined, all (automatic) snapshots but the last <n> will be deleted.
```

## ChangeLog

#### v0.2.0 (2014-07-26)
- Can delete all but the last n snapshots.
- Package prefer to be installed globally.

#### v0.1.1 (2014-07-26)
- Help message now includes the version.

#### v0.1.0 (2014-07-26)
- Initial release.
