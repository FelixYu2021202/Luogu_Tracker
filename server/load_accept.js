const fs = require("fs");
const cheerio = require("cheerio");
const http = require("http");

/**
 * 
 * @param {string} uid 
 * @param {string} client 
 * @param {http.ServerResponse<http.IncomingMessage> & {req: http.IncomingMessage}} res 
 */
function load_accept(uid, client, res) {
    fs.readFile("../data/accepts.json", (err, buf) => {
        let data = JSON.parse(buf.toString());
        fetch(`https://www.luogu.com.cn/user/${uid}#practice`, {
            "headers": {
                "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
                "cache-control": "max-age=0",
                "sec-ch-ua": "\"Not A(Brand\";v=\"99\", \"Google Chrome\";v=\"121\", \"Chromium\";v=\"121\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "document",
                "sec-fetch-mode": "navigate",
                "sec-fetch-site": "same-origin",
                "sec-fetch-user": "?1",
                "upgrade-insecure-requests": "1",
                "cookie": `__client_id=${client}; _uid=${uid}`,
                "Referer": `https://www.luogu.com.cn/user/${uid}`,
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            "body": null,
            "method": "GET"
        }).then(p => p.text()).then(p => {
            let $ = cheerio.load(p);
            let sc = $("script")[0].children[0].data;
            let fq = sc.indexOf('"');
            let sq = sc.indexOf('"', fq + 1);
            let dat = JSON.parse(decodeURIComponent(sc.substring(fq + 1, sq)));
            data[uid] = {
                "accepted": [],
                "submitted": []
            }
            dat.currentData.passedProblems.forEach(p => {
                data[uid].accepted.push(p.pid);
            });
            dat.currentData.submittedProblems.forEach(p => {
                data[uid].submitted.push(p.pid);
            });
            fs.writeFile("../data/accepts.json", JSON.stringify(data), Object);
            res.writeHead(200);
            res.end();
        }).catch(() => {
            res.writeHead(404);
            res.end();
        });
    });
}

module.exports = load_accept;