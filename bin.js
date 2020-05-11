#!/usr/bin/env node

const btmut = require('./')

module.exports = require('yargs')
  .scriptName('bit-mut')
  .command('$0 [torrent]', 'Sync your folder with a torrent', (yargs) => {
    yargs.positional('torrent', {
      type: 'string',
      describe: 'A magnet link for a torrent'
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

async function sync ({ torrent, path, ...opts }) {
  if (torrent) {
    console.log('Syncing', torrent, 'to', path)
  } else {
    console.log('Turning', path, 'into torrent')
  }

  const torrentInstance = await btmut(opts).sync(path, torrent)

  if (torrent) {
    console.log('Resolved magnet, performing sync')
  } else {
    const { magnetURI } = torrentInstance
    console.log('Generated magnet:')
    console.log(magnetURI)
  }

  torrentInstance.on('done', () => {
    console.log('Finished sync, seeding')
  })
}
