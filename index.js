const fs = require("fs-extra");
const path = require("path");
const Haozip = require("./haozip");
const glob = require("glob");
const meow = require("meow");
const cli = require("cli-color");
const progress = require("progress");
const del = require("del");
const print = {
    success: cli.greenBright,
    warn: cli.yellowBright,
    error: cli.redBright,
}

let argvs = {};
/**已解压文件 */
let unpacked = {};
/**文件解压状态 */
let unpackArr = {
    success: [],
    err: [],
}
/**压缩文件总数 */
let totalFilesNum = 0;
/**已解压文件总数 */
let unpackedFilesNum = 0;
let progressBar;
let configDir = path.join(process.env.TEMP, "unpack.config");

/**加载可能的密码 */
function LoadPwd() {
    let pwdfilepath = path.join(process.cwd(), "unpack.pwd");
    let pwdList = [];
    if (fs.existsSync(pwdfilepath)) {
        let pwdfile = fs.readFileSync(pwdfilepath)
        let pwd = pwdfile.toString()
        pwdList = pwd.split(/[\r\n]+/gi);
    }
    let config = ReadConfig()
    if (config.pwd) {
        let setArr = new Set(pwdList.concat(config.pwd));
        pwdList = Array.from(setArr);
    }
    return pwdList;
}

/**搜寻压缩包 */
function LoadFiles(dir = process.cwd()) {
    return new Promise((r, j) => {
        glob(path.join(dir, "**/*"), {
            strict: false,
            silent: true,
            ignore: ["**/node_modules/**", "**/System Volume Information/**", "**/$RECYCLE.BIN/**"],
            absolute: true,
            nodir: true,
        }, (e, files) => {
            if (e) j();
            else {
                let archiveFiles = [];
                files.map(item => {
                    if (Haozip.IsArchive(item)) {
                        archiveFiles.push(item);
                    }
                })
                r(archiveFiles)
            };
        })
    })
}

/**显示进度条 */
function ShowProgress() {
    progressBar = progressBar || new progress(`:text [:bar] :percent`, {
        complete: '=',
        incomplete: ' ',
        width: 40,
        total: 40
    });
    progressBar.update(unpackedFilesNum / totalFilesNum, {
        text: unpackedFilesNum ? `已处理${unpackedFilesNum}/${totalFilesNum}` : "处理中",
    });
    if (unpackedFilesNum == totalFilesNum) {
        progressBar.terminate();
    }
}

/**解压某个文件夹 */
async function UnPack(file, pwd = LoadPwd()) {
    if (unpacked[file]) return Haozip.HaoStatus.Success;
    if (!pwd.length) pwd = ["-"];
    for (let i = 0; i < pwd.length; i++) {
        try {
            let pathinfo = path.parse(file);
            let output = path.join(pathinfo.dir, pathinfo.name);
            await Haozip.Extract(file, {
                password: pwd[i],
                output: output,
            })
            unpacked[file] = true;
            try {
                // 解压解压出来的压缩包
                await UnPackAll(output);
            } catch (e) {}
            if (argvs.remove) {
                // console.log(file)
                // console.log(del.sync(`'${file}'`, {
                //     force: true,
                // }));
                fs.removeSync(file)
            }
            unpackArr.success.push(file);
            return Haozip.HaoStatus.Success;
        } catch (e) {
            if (e.type == Haozip.HaoStatus.ErrorPassword) {
                continue;
            } else {
                unpackArr.err.push([file, e.msg]);
                return e.type
            }
        }
    }
    unpackArr.err.push(file);
    return Haozip.HaoStatus.ErrorPassword;
}

/**解压目录下所有压缩包 */
async function UnPackAll(dir = process.cwd()) {
    let files = await LoadFiles(dir);
    totalFilesNum += files.length;
    for (let i = 0; i < files.length; i++) {
        let code = await UnPack(files[i])
        unpackedFilesNum += 1;
        ShowProgress();
    }
}

function ReadConfig() {
    if (!fs.existsSync(configDir)) {
        fs.writeFileSync(configDir, "");
    }
    return fs.readJsonSync(configDir, {
        throws: false,
    }) || {};
}

function WriteConfig(data = {}) {
    if (!fs.existsSync(configDir)) {
        fs.writeFileSync(configDir, "");
    }
    fs.writeFileSync(configDir, JSON.stringify(data));
}

function ConfigSet(key, value) {
    if (!(key && value)) return;
    let config = ReadConfig();
    if (key == "pwd") {
        config.pwd = config.pwd || [];
        if (!config.pwd.some(i => i == value)) {
            config.pwd.push(value);
        }
    }
    WriteConfig(config);
}

function ConfigRemove(key, value) {
    if (!(key)) return;
    let config = ReadConfig();
    if (key == "pwd") {
        config.pwd = config.pwd || [];
        if (value) {
            config.pwd.some((item, i) => {
                if (item == value) {
                    config.pwd.splice(i, 1);
                    return true;
                }
            })
        } else {
            delete config.pwd;
        }
    }
    WriteConfig(config);
}

module.exports = {
    run: async (cli = meow()) => {
        if (cli.flags.all) {
            argvs = cli.flags;
            console.log("正在解压文件")
            await UnPackAll();
            console.log(print.success(`解压成功: ${unpackArr.success.length}`))
            console.log(print.error(`压缩文件损坏或者密码错误: ${unpackArr.err.length}`))
            console.log(print.error(`  ${unpackArr.err.join("\n  ")}`))
            return;
        }
        if (cli.input[0] == "config") {
            // input: [ 'config', 'set', 'pwd', '123' ]
            // node bin/unpack config set pwd 123
            if (cli.input[1] == "set") {
                ConfigSet(cli.input[2], cli.input[3]);
                console.log(print.success(`设置成功 ${cli.input[2]}=${cli.input[3]}`));
            } else if (cli.input[1] == "remove") {
                ConfigRemove(cli.input[2], cli.input[3]);
            }
        }
    }
}