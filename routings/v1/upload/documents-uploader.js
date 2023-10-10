// Config
const logger = require('../../../config/logger.config');

// Logic
const mongoose = require("mongoose");

//models
const Files = require('../../../models/files.model');

module.exports = router => {
    const conn = mongoose.connection;
    let gfs;

    conn.once("open", () => {
        gfs = new mongoose.mongo.GridFSBucket(conn.db);

        router.post('/bucket/upload', (req, res) => {
            let {
                file
            } = req.files;
            let writeStream = gfs.openUploadStream(file.name)
            writeStream.on('finish', (uploadedFile) => {
                Files.create({
                        doc_id: uploadedFile._id,
                        length: uploadedFile.length,
                        name: uploadedFile.filename,
                        type: file.mimeType
                    })
                    .then(_ => res.json({
                        success: true,
                        message: "File was saved with success"
                    }))
                    .catch(err => {
                        console.log(err);
                        // TODO : improve logging with slack messages
                        logger.error(`[*] Error, while uploading new files, with error: ${err}`);
                        res.status(500).json({
                            message: `[*] Error while uploading new files, with error: ${err}`
                        })
                    })
            });
            writeStream.write(file.data);
            writeStream.end();
        });
    });
}