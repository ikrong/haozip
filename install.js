#!/usr/bin/env node

const unzipper = require("unzipper");
const fs = require("fs");
const path = require("path")


module.exports.UnzipHaozip = function () {
    fs
        .createReadStream(path.join(__dirname, "haozip.xzip"))
        .pipe(unzipper.Extract({
            path: __dirname,
        }));
}