const path = require('path')
const MutableWebTorrent = require('mutable-webtorrent')
const fs = require('fs-extra')
const debug = require('debug')('bt-mut')
const { sep } = path

const DEFAULT_SECRET_STORAGE = require('env-paths')('bt-mut', { suffix: '' }).config
const SECRET_FILE_EXTENSION = '.key'
const BT_FILE = '.bt'
const BTPK_PREFIX = 'urn:btpk:'

module.exports = (opts) => new BtMut(opts)

class BtMut {
  constructor (opts) {
    this.opts = opts
    this.webtorrent = opts.webtorrent || new MutableWebTorrent(opts)
    this.secretStorage = opts.secretStorage || DEFAULT_SECRET_STORAGE
  }

  async pull (path, torrent) {
    debug('Pull', path, torrent)
    if (!torrent) {
      debug('Pull has no torrent, loading .bt file')
      if (await hasBTFile(path)) {
        torrent = await loadBTFile(path)
      } else throw new Error('Folder not initialized, pass in a torrent')
    }

    // TODO: Deal with `torrent` values that aren't magnets
    await saveBTFile(path, torrent)

    const torrentInstance = await new Promise((resolve) => {
      debug('Adding torrent to folder')
      this.webtorrent.add(torrent, { path }, resolve)
    })

    debug('Added')

    let magnetURI = torrentInstance.magnetURI
    if (torrentInstance.publicKey) {
      const publicKeyString = torrentInstance.publicKey.toString('hex')
      magnetURI = `${magnetURI}&xs=${BTPK_PREFIX}${publicKeyString}`
      torrentInstance.magnetURI = magnetURI
    }

    return torrentInstance
  }

  async push (path, opts = {}) {
    debug('Push', path)
    if (!(await hasBTFile(path))) {
      debug('Initializing keys and bt file')
      await this.initKeys(path, opts)
    }

    debug('Loading bt file')
    const magnet = await loadBTFile(path)

    const parsed = new URL(magnet)

    const xs = parsed.searchParams.get('xs')

    const isMutableLink = xs && xs.startsWith(BTPK_PREFIX)

    if (!isMutableLink) throw new Error('Cannot update an immutable torrent')

    const publicKeyString = xs.slice(BTPK_PREFIX.length)

    if (!(await hasSecret(publicKeyString, this.secretStorage, opts))) {
      throw new Error('Cannot update torrent, no known secret key')
    }

    const publicKey = Buffer.from(publicKeyString, 'hex')
    const secretKey = await loadSecret(publicKeyString, this.secretStorage, opts)
    // Make sure we're turning the contents into a torrent, not the folder itself
    if (!path.endsWith(sep)) path += sep

    // TODO: Generate list of files and filter out the `.bt` file
    const torrent = await new Promise((resolve) => {
      debug('Generating torrent')
      this.webtorrent.seed(path, resolve)
    })

    debug('Generated torrent')

    const { infoHash } = torrent

    const { magnetURI, sequence } = await new Promise((resolve, reject) => {
      debug('Publishing update to DHT', publicKey, secretKey)
      this.webtorrent.publish(publicKey.toString('hex'), secretKey.toString('hex'), infoHash, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    debug('Published to DHT')

    torrent.magnetURI = magnetURI
    torrent.sequence = sequence

    return torrent
  }

  async initKeys (path, { publicKey, secretKey, seed } = {}) {
    if (secretKey && !publicKey) throw new Error('Must specify public key if specifying secret key')
    if (publicKey && !secretKey) throw new Error('Must specify secret key if specifying public key')

    if (!secretKey && !publicKey) {
      seed ? debug('Generating keys with seed') : debug('Generating keys without seed')
      // Generate keypair
      const pair = this.webtorrent.createKeypair(seed ? Buffer.from(seed, 'hex') : null)
      secretKey = pair.secretKey
      publicKey = pair.publicKey
    }

    debug('Saving secret for', publicKey)

    await saveSecret(publicKey, secretKey, this.secretStorage)

    const publicKeyString = publicKey.toString('hex')

    const magnetURI = `magnet:?xs=${BTPK_PREFIX}${publicKeyString}`

    debug('Saving BT file', magnetURI)

    await saveBTFile(path, magnetURI)
  }

  async isInitialized (path) {
    return hasBTFile(path)
  }
}

async function hasBTFile (location) {
  const fileLocation = btLocation(location)

  return fs.pathExists(fileLocation)
}

async function loadBTFile (location) {
  const fileLocation = btLocation(location)

  return fs.readFile(fileLocation, 'utf8')
}

async function saveBTFile (location, magnet) {
  const fileLocation = btLocation(location)

  return fs.writeFile(fileLocation, magnet)
}

function btLocation (location) {
  return path.join(location, BT_FILE)
}

async function hasSecret (publicKey, secretStorage, { secretKey } = {}) {
  if (secretKey) return true
  // Check whether the secret key file exists for the given public key
  const location = secretLocation(publicKey, secretStorage)

  return fs.pathExists(location)
}

async function saveSecret (publicKey, secretKey, secretStorage) {
  // Save the secret key to the secret storage
  await fs.ensureDir(secretStorage)
  const location = secretLocation(publicKey, secretStorage)

  return fs.writeFile(location, secretKey.toString('hex'), 'utf8')
}

async function loadSecret (publicKey, secretStorage, { secretKey } = {}) {
  if (secretKey) return secretKey
  const location = secretLocation(publicKey, secretStorage)

  const read = await fs.readFile(location, 'utf8')

  return Buffer.from(read, 'hex')
}

function secretLocation (publicKey, secretStorage) {
  return path.join(secretStorage, publicKey.toString('hex') + SECRET_FILE_EXTENSION)
}
