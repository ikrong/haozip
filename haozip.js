const child_process = require("child_process");
const path = require("path");
const iconv = require("iconv-lite");
const fileType = require("file-type");
const readChunk = require("read-chunk");

const HaoZipC = path.join(__dirname, "haozip", "HaoZipC");
const HaoZipExtractOption = {
    /**是否覆盖 */
    rewrite: false,
    /**密码 */
    password: "",
    /**输出目录 */
    output: "",
}
const HaoZipTestOption = {
    /**密码 */
    password: ""
}
const HaoErrStrs = {
    password: [
        "加密文件CRC校验错误，密码错误？",
        "加密文件数据错误，密码错误？",
        "校验错误，密码错误？"
    ],
    file: [
        "数据错误",
        "未知错误",
        "无法打开加密的文档，密码错误？",
        "无法打开文档",
    ],
}

const HaoStatus = {
    Success: 0,
    /**解压出错 */
    Error: -1,
    /**密码错误 */
    ErrorPassword: -2,
    /**压缩文件损坏 */
    ErrorFile: -3,
}

/**判断是不是压缩文件 */
function IsArchive(file) {
    if (!file) return false;
    let buf = readChunk.sync(file, 0, 4100)
    let result = fileType(buf);
    if (result) {
        let archiveExt = [
            "zip", "rar", "7z", "tar.bz2",
            "tar.gz", "tar.xz", "gzip", "bzip2",
            "xz", "tar", "wim", "lzh"
        ]
        return archiveExt.some(item => item == result.ext);
    } else {
        return false;
    }
}

/**转为绝对路径 */
function ToAbsolutePath(filepath = "./") {
    let isAbsoluteDir = path.isAbsolute(filepath);
    if (!isAbsoluteDir) filepath = path.join(process.cwd(), filepath);
    return filepath;
}

/**转换好压命令参数 */
function TransformParams(options, zipfile = "") {
    let params = [];
    if (!options.output) {
        let pathinfo = path.parse(zipfile);
        options.output = path.join(pathinfo.dir, pathinfo.name);
    }
    for (let key in options) {
        switch (key) {
            case "rewrite":
                params.push(`-ao${options[key]?'a':'s'}`)
                break;
            case "password":
                params.push(`-p"${options[key]||'-'}"`);
                break;
            case "output":
                params.push(`-o"${options[key]}"`)
                break;
        }
    }
    params.push("-y");
    return params.join(" ")
}

/**执行好压命令 */
function HaoExec(cmd) {
    return new Promise((r, j) => {
        child_process.exec(cmd, {
            encoding: "buffer"
        }, (e, stdo, stde) => {
            let sto = ste = "";
            if (stdo) sto = iconv.decode(stdo, "gbk").replace(/[\r\n]+/g, "\n");
            if (stde) ste = iconv.decode(stde, "gbk").replace(/[\r\n]+/g, "\n");
            let err = {
                type: HaoStatus.Error,
                msg: "解压出错",
            }
            if (e) {
                j(err);
            } else {
                let estr =
                    /([\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300ba-z0-9]+)[\r\n]子项错误：[ ]+(\d+)/gi
                    .exec(sto);
                if (!estr) {
                    estr =
                        /错误： ([\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300ba-z0-9]+)\n?$/gi
                        .exec(sto);
                }
                if (estr) {
                    err.msg = estr[1];
                    if (HaoErrStrs.password.some(item => item == estr[1])) {
                        err.type = HaoStatus.ErrorPassword;
                    } else if (HaoErrStrs.file.some(item => item == estr[1])) {
                        err.type = HaoStatus.ErrorFile;
                    }
                    j(err);
                } else {
                    err.type = HaoStatus.Success;
                    err.msg = "";
                    r(err);
                }
            }
        });
    })
}

/**解压 */
function Extract(zipfile = "", options = HaoZipExtractOption) {
    /**
     * -ao 覆盖模式 a 直接覆盖 s 跳过 u 自动重命名释放文件 t 自动重命名现有文件
     * -o  输出目录
     * -p  密码
     * -y  全部yes
     */
    if (!zipfile) {
        return Promise.reject({
            type: HaoStatus.Error,
            msg: "无文件",
        })
    }
    zipfile = ToAbsolutePath(zipfile);
    options = Object.assign(HaoZipExtractOption, options);
    let params = TransformParams(options, zipfile);
    let cmd = `${HaoZipC} e "${zipfile}" ${params}`;
    return HaoExec(cmd)
}

/**测试压缩文件 */
function Test(zipfile = "", options = HaoZipTestOption) {
    if (!zipfile) {
        return Promise.reject({
            type: HaoStatus.Error,
            msg: "无文件",
        })
    }
    zipfile = ToAbsolutePath(zipfile);
    options = Object.assign(HaoZipTestOption, options);
    // HaoZipC u archive.zip *.doc
    let params = TransformParams(options, zipfile);
    let cmd = `${HaoZipC} t ${zipfile} ${params}`;
    return HaoExec(cmd)
}

module.exports = {
    /**判断是否是压缩文件 */
    IsArchive: IsArchive,
    /**解压 */
    Extract: Extract,
    /**测试压缩文件 */
    Test: Test,
    /**好压返回文件状态 */
    HaoStatus: HaoStatus,
};