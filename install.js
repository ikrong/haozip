const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path")


function UnzipHaozip() {
    fs.createReadStream(path.join(__dirname, "haozip.zip"))
        .pipe(unzipper.Extract({
            path: path.join(__dirname, "haozip"),
        }));
}


UnzipHaozip();