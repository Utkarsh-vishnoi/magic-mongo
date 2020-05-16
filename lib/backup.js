const path = require('path')
const fs = require('fs-extra')
const md5File = require('md5-file')
const mongoose = require('mongoose')
const fileSchema = require('../schemas/fileSchema')
const untildify = require('untildify')
const watch = require('file-watch-iterator')

module.exports = (config) => {

        const onConnect = async () => {
                // Perform Backup
                const relative = f => path.relative(untildify(config.get('dir')), f).replace('\\', '/')
                await mongoose.connection.dropCollection('files', (err, result) => {
                        if(err)
                                console.log('Error Dropping Collection Files: ' + err)
                        else
                                console.log('Files Collection Dropped')
                        console.log(result)
                })
                const fileWatcher = watch(untildify(config.get('dir')))
                for await (const _files of fileWatcher) {
                        const files = _files.toArray().filter(f => f.changed && f.event !== 'addDir' && f.file !== untildify(config.get('dir')))
                        await Promise.all(files.map(async ({ file, event }, i, { length }) => {
                                const label = `[${i+1}/${length}]`
                                let relativeFile = relative(file)
                                switch (event) {
                                        case 'add':
                                        case 'change':
                                                // Add File
                                                let data = fs.readFileSync(file)
                                                let hash = md5File.sync(file)
                                                await fileSchema.findOneAndUpdate({
                                                        file: relativeFile
                                                }, {
                                                        file: relativeFile,
                                                        hash: hash,
                                                        data: data
                                                }, {
                                                        upsert: true
                                                }, err => {
                                                        if (err)
                                                                throw new Error('Error backing up File: ' + err.toString())
                                                        else
                                                                console.log(`${label} Adding File: ${relativeFile}`)
                                                })
                                        break
                                        case 'unlink':
                                                // Delete File
                                                await fileSchema.deleteOne({
                                                        file: relativeFile
                                                }, err => {
                                                        if (err)
                                                                throw new Error('Error Unlinking File: ' + err.toString())
                                                        else
                                                                console.log(`${label} Deleting File: ${relativeFile}`)
                                                })
                                        break
                                }
                        }))
                }
        }

        const disconnect = () => {
                mongoose.disconnect(() => console.log('Mongoose Disconnected'))
        }

        mongoose.connect(config.get('db'), {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                useFindAndModify: false
        }).then(onConnect).then(disconnect).catch(error => new Error('Error connecting to DB: ' + error))

        mongoose.connection.on('error', err => {
                throw new Error('Mongo DB Error: ' + err)
        })

}