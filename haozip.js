const child_process = require("child_process");
const path = require("path");
const iconv = require("iconv-lite");

const HaoZipC = path.join(__dirname, "haozip", "HaoZipC");
const HaoZipExtractOption = {
    /**是否覆盖 */
    rewrite: true,
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
        "CRC 错误",
        "加密文件CRC校验错误，密码错误？",
        "校验错误，密码错误？"
    ],
    file: [
        "数据错误",
        "加密文件数据错误，密码错误？",
        "未知错误",
        "无法打开加密的文档，密码错误？",
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

function ToAbsolutePath(filepath = "./") {
    let isAbsoluteDir = path.isAbsolute(filepath);
    if (!isAbsoluteDir) filepath = path.join(process.cwd(), filepath);
    return filepath;
}

function TransformParams(options, zipfile = "") {
    let params = [];
    for (let key in options) {
        switch (key) {
            case "rewrite":
                params.push(`-ao${options[key]?'a':'s'}`)
                break;
            case "password":
                params.push(`-p${options[key]||'-'}`);
                break;
            case "output":
                params.push(`-o${options[key]?options[key]:path.parse(zipfile).dir}`)
                break;
        }
    }
    params.push("-y");
    return params.join(" ")
}

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
                let estr = /([\u4e00-\u9fa5\u3002\uff1b\uff0c\uff1a\u201c\u201d\uff08\uff09\u3001\uff1f\u300a\u300ba-z0-9]+)[\r\n]子项错误：[ ]+(\d+)/gi.exec(sto);
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
    let cmd = `${HaoZipC} e ${zipfile} ${params}`;
    return HaoExec(cmd)
}

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
    Extract: Extract,
    Test: Test,
    HaoStatus: HaoStatus,
};

Test("./assets/test.xzip", {
    password: "123",
}).then(data => console.log(data), e => console.log(e));

// F:\My_Fun\ali.git\unpack\haozip\HaoZipC e F:\My_Fun\ali.git\unpack\test\test.zip -aoa -oF:\My_Fun\ali.git\unpack\test

// 处理压缩包： F:\My_Fun\ali.git\unpack\test\test.zip ...
// 正在解压  test.txt  加密文件CRC校验错误，密码错误？
// 子项错误： 1

// 处理压缩包： F:\My_Fun\ali.git\unpack\test\error.zip ...
// 正在解压  test.txt  加密文件数据错误，密码错误？
// 子项错误： 1

// 处理压缩包： F:\My_Fun\ali.git\unpack\test\test.zip ...
// 正在解压  test.txt
// 已完成
// 解压大小：9
// 压缩大小：171