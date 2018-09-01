const mocha = require("mocha");
const assert = require("assert");
const Hao = require("./haozip");

describe("HaoZip Extract", () => {

    describe("Extract file", () => {
        it("should be password err", async () => {
            try {
                await Hao.Extract("./assets/test.xzip")
            } catch (e) {
                assert.equal(e.type, Hao.HaoStatus.ErrorPassword)
            }
        });
        it("should extract successfully", async () => {
            try {
                await Hao.Extract("./assets/test.xzip", {
                    password: "123",
                })
            } catch (e) {
                assert.equal(e.type, Hao.HaoStatus.ErrorPassword)
            }
        });
        it("should be file err", async () => {
            try {
                await Hao.Extract("./assets/error.xzip")
            } catch (e) {
                assert.equal(e.type, Hao.HaoStatus.ErrorFile)
            }
        });
        it("should extract 7z successfully", async () => {
            try {
                await Hao.Extract("./assets/test.x7z", {
                    password: "1234",
                })
            } catch (e) {
                assert.equal(e.type, Hao.HaoStatus.ErrorFile)
            }
        });
    });

});