const mongoose = require('mongoose')

const fileSchema = mongoose.Schema({
    file: String,
    data: Buffer,
    hash: String
})

module.exports = mongoose.model("file", fileSchema)