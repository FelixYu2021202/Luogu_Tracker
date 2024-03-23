const fs = require("fs");
const cheerio = require("cheerio");
const http = require("http");
const WebSocket = require("ws");

/**
 * 
 * @param {string} type 
 * @param {number} pg 
 * @param {(p: {
 *     pid: string;
 *     dif: number;
 *     tags: number[];
 *     tit: string;
 * }) => void} cb
 * @param {() => void} fn
 * @param {WebSocket} ws 
 */
function fetch_page(type, pg, cb, fn, ws) {
    let mxp;
    fetch(`https://www.luogu.com.cn/problem/list?type=${type.toUpperCase()}&page=${pg}`)
        .then(p => p.text())
        .then(p => {
            // console.log(`https://www.luogu.com.cn/problem/list?type=${type.toUpperCase()}&page=${pg}`);
            const $ = cheerio.load(p);
            let sc = $("script")[0].children[0].data;
            let fq = sc.indexOf('"');
            let sq = sc.indexOf('"', fq + 1);
            let dat = JSON.parse(decodeURIComponent(sc.substring(fq + 1, sq)));
            let ps = dat.currentData.problems.result;
            ps.forEach(pb => {
                cb({
                    pid: pb.pid,
                    dif: pb.difficulty,
                    tags: pb.tags,
                    tit: pb.title
                });
            });
            mxp = Math.ceil(dat.currentData.problems.count / dat.currentData.problems.perPage);
            console.log(type, mxp, pg);
            ws.send(JSON.stringify({
                max: mxp,
                cur: pg,
                success: true
            }));
            if (pg < mxp) {
                setTimeout(() => {
                    fetch_page(type, pg + 1, cb, fn, ws);
                }, 1000);
            }
            else {
                ws.close();
                fn();
            }
        }).catch(() => {
            ws.send(JSON.stringify({
                max: mxp,
                cur: pg,
                success: false
            }));
            setTimeout(() => {
                fetch_page(type, pg, cb, fn, res);
            }, 300000);
        });
}

/**
 * 
 * @param {string} type 
 * @param {WebSocket} ws 
 */
function load_prob(type, ws) {
    let data = [];
    fetch_page(type, 1, p => {
        data.push(p);
    }, () => {
        fs.writeFile(`./data/${type}.json`, JSON.stringify(data), Object);
    }, ws);
}

module.exports = load_prob;
