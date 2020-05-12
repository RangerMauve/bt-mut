#!/usr/bin/env node

const btmut = require('./')

module.exports = require('yargs')
  .scriptName('bit-mut')
  .option('secret-storage', {
    type: 'string',
    describe: 'The location that secrets should be stored in. Defaults to user folder'
  })
  .option('path', {
    alias: 'p',
    type: 'string',
    describe: 'Where to sync the torrent. Defaults to current path',
    default: process.cwd()
  })
  .command('push', 'Update your mutable torrent with your folder contents', (yargs) => {
    yargs.option('seed', {
      alias: 's',
      type: 'string',
      describe: 'Pass phrase for generating the secret key'
    }).option('public-key', {
      type: 'string',
      describe: 'Public key (in hex) to use'
    }).option('secret-key', {
      type: 'string',
      describe: 'Secret key (in hex) to use'
    })
  }, push)
  .command('pull [torrent]', 'Sync changes from a torrent to your folder', (yargs) => {
    yargs.positional('torrent', {
      type: 'string',
      describe: 'A magnet link for a torrent'
    })
  }, pull)
  .help()
  .argv

async function pull ({ torrent, path, ...opts }) {
  const mut = btmut(opts)

  console.log('Syncing', torrent, 'to', path)

  const torrentInstance = await mut.pull(path, torrent)

  printTorrentInfo(torrentInstance)

  console.log('\nPerforming sync')
  torrentInstance.on('done', () => console.log('Done!'))
  torrent.on('download', () => {
    const progress = Math.round(torrentInstance.progress * 100)
    console.log('Progress', progress + '%')
  })
}

async function push ({ path, ...opts }) {
  const mut = btmut(opts)

  console.log('Updating mutable torrent at', path)

  const torrentInstance = await mut.push(path, opts)

  printTorrentInfo(torrentInstance)

  torrentInstance.on('wire', (wire, addr) => {
    wire.once('handshake', (infoHash, peerId) => {
      console.log('Connected', peerId, addr)
      wire.once('close', () => console.log('Disconnected', peerId, addr))
    })
  })
}

function printTorrentInfo (torrentInstance) {
  const { magnetURI, sequence } = torrentInstance
  console.log('Set up torrent')
  console.log('   Magnet:', magnetURI)
  console.log('  Version:', sequence)
  console.log('    Files:')
  torrentInstance.files.map(({ path }) => console.log('          -', path))
}
