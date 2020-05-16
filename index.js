const configStore = require('configstore')
const packageJSON = require('./package.json')

const events = require('events')
const eventEmitter = new events.EventEmitter()

const backupLib = require('./lib/backup')
const restoreLib = require('./lib/restore')

const config = new configStore(packageJSON.name)

const backup = (options) => {
    if (!options || !options.dir || !options.db) {
        throw new Error('Invalid Options Supplied')
    }
    config.set(options)
    try {
        backupLib(config)
    }
    catch (e) {
        throw new Error('Error performing Backup: ' + e.toString())
    }

}

const restore = (options, cb) => {
    if (!options || !options.dir || !options.db) {
        throw new Error('Invalid Options Supplied')
    }
    config.set(options)
    try {
        restoreLib(config, eventEmitter)
    } catch (e) {
        cb(e.toString())
    }
    return eventEmitter
}

module.exports = {
    backup,
    restore
}
