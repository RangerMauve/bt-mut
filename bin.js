#!/usr/bin/env node

module.exports = require('yargs')
  .scriptName('bit-sync')
  .command('$0 [torrent]', 'Sync your folder with a torrent', (yargs) => {
    yargs.positional('torrent', {
      type: 'string',
      describe: 'A magnet link, path to torrent file, or bt:// URL'
    }).option('path', {
      alias: 'p',
      type: 'string',
      describe: 'Where to sync the torrent. Defaults to current path',
      default: process.cwd()
    }).option('secret-storage', {
      describe: 'The location that secrets should be stored in. Defaults to user folder'
    })
  }, sync)
  .help()
  .argv

function sync (argv) {
  console.log('Syncing', argv.torrent, 'to', argv.folder)
}
