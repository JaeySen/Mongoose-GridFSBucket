// Config
const logger = require('../../../config/logger.config');

// Logic
const mongoose = require("mongoose");
const fileType= require('file-type');

//models
const File = require('../../../models/files.model');

module.exports = router => {
    const conn = mongoose.connection;
    let gfs;

    conn.once("open", () => {
        gfs = new mongoose.mongo.GridFSBucket(conn.db);

        router.get('/home', (req, res) => {
            File.find()
                .exec()
                .then(files => {
                    let uploadedFiles = files.map(file => ({
                        file_name: file.name,
                        file_type: file.type,
                        file_link: `http://${req.headers.host}/v1/bucket/download?document_id=${file.doc_id}`
                    }));
                    res.json({
                        success: true,
                        uploadedFiles
                    })
                })
                .catch(err => {
                    // TODO : improve logging with slack msgs.
                    logger.error(`[*] Error, while getting all uploaded file, with error:  ${err}`);
                    res.status(400).send({
                        message: `Error, while getting all uploaded file, with error: ${err}`
                    });
                });
        });

        router.get('/bucket/download', (req, res) => {
            let {
                document_name
            } = req.query;
            File.findOne({ name: document_name }).then((file) => {
                if (!file) {
                    return res.status(404).send({
                        message: 'File was not found'
                    });
                }
                let data = [];
                let readstream = gfs.openDownloadStreamByName(document_name);
                readstream.on('data', (chunk) => {
                    data.push(chunk);
                });
                readstream.on('end',  async () => {
                    data = Buffer.concat(data);
                    let type = await fileType.fromBuffer(data);
                    res.writeHead(200, {
                        'Content-Type': type.mime,
                        'Content-disposition': 'attachment; filename=' + file.name + '.' + type.ext,
                        'Content-Length': file.length
                    });
                    res.end(data);
                });
                readstream.on('error', (err) => {
                    // TODO : improve logging with slack msgs.
                    logger.error(`[*] Error, while downloading a file, with error:  ${err}`);
                    res.status(400).send({
                        message: `Error, while downloading a file, with error:  ${err}`
                    });
                });
            })
        });
    });
}