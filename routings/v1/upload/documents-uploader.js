// Config
const logger = require('../../../config/logger.config');

// Logic
const mongoose = require("mongoose");

//models
const Files = require('../../../models/files.model');

module.exports = router => {
    const conn = mongoose.connection;
    // Grid.mongo = mongoose.mongo;
    // const gridFSBucket = new mongoose.mongo.GridFSBucket(conn.db);
    let gfs;

    conn.once("open", () => {
        // gfs = Grid(conn.db);
        gfs = new mongoose.mongo.GridFSBucket(conn.db);

        router.post('/bucket/upload', (req, res) => {
            let {
                file
            } = req.files;
            let writeStream = gfs.openUploadStream({
                filename: `${file.name}`,
                mode: 'w',
                content_type: file.mimetype
            });
            writeStream.on('finish', (uploadedFile) => {
                console.log(uploadedFile)
                Files.create({
                        doc_id: uploadedFile._id,
                        length: uploadedFile.length,
                        name: uploadedFile.filename.filename,
                        type: uploadedFile.filename.contentType
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