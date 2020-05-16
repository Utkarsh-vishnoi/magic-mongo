const path = require('path')
const fs = require('fs-extra')
const md5File = require('md5-file')
const mongoose = require('mongoose')
const fileSchema = require('../schemas/fileSchema')
const untildify = require('untildify')

module.exports = async (config, eventEmitter) => {

    mongoose.connect(config.get('db'), {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).catch(error => new Error('Error connecting to DB: ' + error))

    mongoose.connection.on('error', err => {
        throw new Error('Mongo DB Error: ' + err)
    })

    const onConnect = () => {
        // Restore from Backup
        const rawPath = untildify(config.get('dir'))

        let counter = 0, previous = 0
        fileSchema.countDocuments({}, (err, count) => {
            if (err)
                throw new Error('Error getting File Count: ' + err.toString())
            else {
                if(count === 0) {
                    console.log('Nothing to Restore')
                    eventEmitter.emit('data', 100)
                }
                let files = fileSchema.find().stream()
                files.on('data', async doc => {
                    counter++
                    const label = `[${counter}/${count}]`
                    const file = path.resolve(path.join(rawPath, path.isAbsolute(doc.file) ? path.relative(rawPath, doc.file) : doc.file))
                    fs.outputFileSync(file, doc.data.buffer)
                    let hash = md5File.sync(file)
                    console.log(hash === doc.hash ? `${label} Created File: ${file}` : `${label} Error Creating File ${file}: Hashes Mismatch`)
                    const progress = Math.floor(counter / count * 100)
                    if (previous !== progress) {
                        eventEmitter.emit('data', progress)
                    }
                    previous = progress
                }).on('error', err => {
                    throw new Error("Error Processing File: " + err.toString())
                }).on('close', () => {
                    mongoose.disconnect(() => console.log('Mongoose Disconnected'))
                })
            }
        })
    }

    await new Promise(onConnect).catch(() => {})
}