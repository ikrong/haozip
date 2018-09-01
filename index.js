const ua = require("all-unpacker");

ua.unpack("./package.zip", {
    targetDir: "./test/unpackfiles/",
    password: "123",
    quiet: false,
    forceOverwrite: true,
}, e => {
    console.log(e)
})