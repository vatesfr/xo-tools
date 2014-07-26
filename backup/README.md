# Backup tool

This tool aims to provide automated backup solution for your VMs (with the help of XO), until we implement this feature directly in the web interface.

Thanks to the XO architecture, you can backup all your VMs, regardless of which host they are.

## How it works (so far)

We choose to create a snapshot of all your **running** VMs, on all XO connected servers. You can execute this script manually, or call it in a Cron job.

## Installation

You need `nodejs` to install this tool. Then, just type:
`sudo npm install -g xo-backup`

## Usage

For the complete usage, use the help:
`xo-backup -help`

## Example

```
$ xo-backup --user xoadmin http://xoa.mycompany.com/api
[?] Password: *****
```
