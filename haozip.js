const child_process = require("child_process");
const path = require("path");

const HaoZipC = path.join(__dirname, "haozip", "HaoZipC");

module.exports.Haozip = function (cmd) {
    child_process.spawn(path.join(__dirname, "haozip", "HaoZipC"))
}
