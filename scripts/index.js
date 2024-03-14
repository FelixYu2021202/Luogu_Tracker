if (typeof $ == "undefined") {
    $ = require("jquery");
}

/**
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_login(main) {
    return function () {
        console.log("login");
        main.empty();
        main.removeAttr(main.attr("current-page"));
        main.attr("current-page", "login-page");
        main.attr("page");
        $.get("/login.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            $("*[uid]").val(localStorage.getItem("currentUser"));
            $("*[but]").off();
            $("*[but]").on("click", () => {
                let uid = $("*[uid]").val();
                let client = $("*[client]").val();
                $.post(`/api/load?uid=${uid}&client=${client}`, _r => {
                    alert("成功爬取");
                    localStorage.setItem("currentUser", uid);
                    $.get("/accepts.json", res => {
                        ac_data = JSON.parse(res);
                    });
                });
            });
        });
    }
}

/**
 * @type {(WebSocket & {type: string; progress: number})[]}
 */
let wss = [];

function registerWss() {
    wss = wss.filter(ws => ws.readyState != ws.CLOSED);
    let pbsc = $("*[pro-bars-cnt]").empty();
    wss.forEach(ws => {
        let pbc = $(`<div flex-wrap pro-bar-cnt></div>`).appendTo(pbsc);
        let pb = $(`<div pro-bar>${ws.type}: ${ws.progress}%</div>`).appendTo(pbc);
        pb.css("background", `rgba(0, 0, 0, 0) linear-gradient(to right, var(--pro-green) ${ws.progress}%, rgba(0, 0, 0, 0) ${ws.progress}%) repeat scroll 0% 0% / auto border-box border-box`);
        ws.onmessage = ev => {
            let dat = JSON.parse(ev.data);
            let cl;
            if (dat.success) {
                cl = "var(--pro-green)";
            }
            else {
                cl = "var(--pro-red)";
            }
            ws.progress = Math.round(1000 * dat.cur / dat.max) / 10;
            pb.css("background", `rgba(0, 0, 0, 0) linear-gradient(to right, ${cl} ${ws.progress}%, rgba(0, 0, 0, 0) ${ws.progress}%) repeat scroll 0% 0% / auto border-box border-box`);
            pb.text(`${ws.type}: ${ws.progress}%`);
        }
        ws.onclose = registerWss;
    });
}

/**
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_prob(main) {
    return function () {
        console.log("load prob");
        registerWss();
        main.empty();
        main.removeAttr(main.attr("current-page"));
        main.attr("current-page", "lp-page");
        main.attr("lp-page");
        $.get("/lp.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            registerWss();
            $("*[but]").off("");
            $("*[but]").on("click", () => {
                console.log("爬取");
                let type = $("*[selection]").val();
                type.forEach(t => {
                    console.log(t);
                    let ws = new WebSocket(`ws://localhost:51672?type=load_prob&body=${t}`);
                    ws.type = t;
                    ws.progress = 0;
                    wss.push(ws);
                    registerWss();
                });
            });
        });
    }
}

const pbs_type = ["p", "b", "cf", "at", "sp", "uva"];
let pbs_data = {};

let at_dict = {};

let ac_data;

const dif_col = [
    "#BFBFBF",
    "#FE4C61",
    "#F39C11",
    "#FFC116",
    "#52C41A",
    "#3498DB",
    "#9D3DCF",
    "#0E1D69"
];

/**
 * @type {NodeJS.Dict<Function>}
 */
let lpfuncs = {
    clear() {
        $("pbs-pg-select").empty();
        $("pbs-content").empty();
        $("*[pbs-pg-sub-select]").detach();
    },
    p(page = Number(localStorage.getItem("pageP"))) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem("pageP", page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            buts.push(cp);
        }
        buts.push(1);
        buts = buts.reverse();
        cp = page + 1;
        /**
         * Every page there are 200 problems.
         * +--> 10 problems
         * |
         * |
         * V
         * 20 problems
         */
        let pbs = pbs_data.p;
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.substring(1)) + 1 - 1000) / 200); // max page
        for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
            buts.push(cp);
        }
        if (page != mxp) {
            buts.push(mxp);
        }
        let select = $("*[pbs-pg-select]");
        select.empty();
        buts.forEach(p => {
            let cur;
            if (p == page) {
                cur = $(`<div pbs-pg-cur>${p}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${p}</div>`);
                cur.on("click", () => {
                    lpfuncs.p(p);
                });
            }
            cur.appendTo(select);
        });
        let table = $("*[pbs-content]");
        table.empty();
        let head = $("<tr pbs-head></tr>");
        for (let i = 0; i < 10; i++) {
            let td = $(`<td>${i}</td>`);
            td.appendTo(head);
        }
        head.appendTo(table);
        /**
         * For example: x-th page
         * problems: P(1000 + (x-1) * 200) to P(1000 + x * 200 - 1)
         */
        let cu = Number(localStorage.getItem("currentUser"));
        let las = 999 + (page - 1) * 200;
        let tr = $("<tr></tr>");
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let cn = Number(pid.substring(1));
            if (cn <= las) {
                continue;
            }
            if (cn > 999 + page * 200) {
                break;
            }
            /**
             * render blanks from las + 1 to cn - 1
             */
            for (let j = las + 1; j < cn; j++) {
                if (j % 10 == 0) {
                    tr.appendTo(table);
                    tr = $("<tr></tr>");
                }
                $("<td></td>").appendTo(tr);
            }
            if (cn % 10 == 0) {
                tr.appendTo(table);
                tr = $("<tr></tr>");
            }
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (ac_data[cu].accepted.find(p => p == pid)) {
                sta = "pbs-ac";
            }
            if (ac_data[cu].submitted.find(p => p == pid)) {
                sta = "pbs-sb";
            }
            $(`
                <td ${sta}>
                    <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                        <div style="color:${dif_col[dif]}" pbs-pid>
                            ${pid}
                        </div>
                        <div pbs-tit>
                            ${tit}
                        </div>
                    </a>
                </td>
            `).appendTo(tr);
            las = cn;
        }
        tr.appendTo(table);
    },
    b(page = Number(localStorage.getItem("pageB"))) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem("pageB", page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            if (cp == 2 || cp == 3) {
                continue;
            }
            if (cp > 4 && cp < 9) {
                continue;
            }
            buts.push(cp);
        }
        buts.push(1);
        buts = buts.reverse();
        cp = page + 1;
        /**
         * Every page there are 200 problems.
         * +--> 10 problems
         * |
         * |
         * V
         * 20 problems
         */
        let pbs = pbs_data.b;
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.substring(1)) + 1 - 2000) / 200); // max page
        for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
            if (cp == 2 || cp == 3) {
                continue;
            }
            if (cp > 4 && cp < 9) {
                continue;
            }
            buts.push(cp);
        }
        if (page != mxp) {
            buts.push(mxp);
        }
        let select = $("*[pbs-pg-select]");
        select.empty();
        buts.forEach(p => {
            let cur;
            if (p == page) {
                cur = $(`<div pbs-pg-cur>${p}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${p}</div>`);
                cur.on("click", () => {
                    lpfuncs.b(p);
                });
            }
            cur.appendTo(select);
        });
        let table = $("*[pbs-content]");
        table.empty();
        let head = $("<tr pbs-head></tr>");
        for (let i = 0; i < 10; i++) {
            let td = $(`<td>${i}</td>`);
            td.appendTo(head);
        }
        head.appendTo(table);
        /**
         * For example: x-th page
         * problems: P(2000 + (x-1) * 200) to P(2000 + x * 200 - 1)
         */
        let cu = Number(localStorage.getItem("currentUser"));
        let las = 1999 + (page - 1) * 200;
        let tr = $("<tr></tr>");
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let cn = Number(pid.substring(1));
            if (cn <= las) {
                continue;
            }
            if (cn > 1999 + page * 200) {
                break;
            }
            /**
             * render blanks from las + 1 to cn - 1
             */
            for (let j = las + 1; j < cn; j++) {
                if (j % 10 == 0) {
                    tr.appendTo(table);
                    tr = $("<tr></tr>");
                }
                $("<td></td>").appendTo(tr);
            }
            if (cn % 10 == 0) {
                tr.appendTo(table);
                tr = $("<tr></tr>");
            }
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (ac_data[cu].accepted.find(p => p == pid)) {
                sta = "pbs-ac";
            }
            if (ac_data[cu].submitted.find(p => p == pid)) {
                sta = "pbs-sb";
            }
            $(`
                <td ${sta}>
                    <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                        <div style="color:${dif_col[dif]}" pbs-pid>
                            ${pid}
                        </div>
                        <div pbs-tit>
                            ${tit}
                        </div>
                    </a>
                </td>
            `).appendTo(tr);
            las = cn;
        }
        tr.appendTo(table);
    },
    sp(page = Number(localStorage.getItem("pageSP"))) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem("pageSP", page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            buts.push(cp);
        }
        buts.push(1);
        buts = buts.reverse();
        cp = page + 1;
        /**
         * Every page there are 200 problems.
         * +--> 10 problems
         * |
         * |
         * V
         * 20 problems
         */
        let pbs = pbs_data.sp;
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.substring(2)) + 1) / 200); // max page
        for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
            buts.push(cp);
        }
        if (page != mxp) {
            buts.push(mxp);
        }
        let select = $("*[pbs-pg-select]");
        select.empty();
        buts.forEach(p => {
            let cur;
            if (p == page) {
                cur = $(`<div pbs-pg-cur>${p}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${p}</div>`);
                cur.on("click", () => {
                    lpfuncs.sp(p);
                });
            }
            cur.appendTo(select);
        });
        let table = $("*[pbs-content]");
        table.empty();
        let head = $("<tr pbs-head></tr>");
        for (let i = 0; i < 10; i++) {
            let td = $(`<td>${i}</td>`);
            td.appendTo(head);
        }
        head.appendTo(table);
        /**
         * For example: x-th page
         * problems: P((x-1) * 200) to P(x * 200 - 1)
         */
        let cu = Number(localStorage.getItem("currentUser"));
        let las = (page - 1) * 200 - 1;
        let tr = $("<tr></tr>");
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let cn = Number(pid.substring(2));
            if (cn <= las) {
                continue;
            }
            if (cn > page * 200 - 1) {
                break;
            }
            /**
             * render blanks from las + 1 to cn - 1
             */
            for (let j = las + 1; j < cn; j++) {
                if (j % 10 == 0) {
                    tr.appendTo(table);
                    tr = $("<tr></tr>");
                }
                $("<td></td>").appendTo(tr);
            }
            if (cn % 10 == 0) {
                tr.appendTo(table);
                tr = $("<tr></tr>");
            }
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (ac_data[cu].accepted.find(p => p == pid)) {
                sta = "pbs-ac";
            }
            if (ac_data[cu].submitted.find(p => p == pid)) {
                sta = "pbs-sb";
            }
            $(`
                <td ${sta}>
                    <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                        <div style="color:${dif_col[dif]}" pbs-pid>
                            ${pid}
                        </div>
                        <div pbs-tit>
                            ${tit}
                        </div>
                    </a>
                </td>
            `).appendTo(tr);
            las = cn;
        }
        tr.appendTo(table);
    },
    uva(page = Number(localStorage.getItem("pageUVA"))) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem("pageUVA", page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            if (cp > 9 && cp < 50) {
                continue;
            }
            buts.push(cp);
        }
        buts.push(1);
        buts = buts.reverse();
        cp = page + 1;
        /**
         * Every page there is 200 problems.
         * +--> 10 problems
         * |
         * |
         * V
         * 20 problems
         */
        let pbs = pbs_data.uva;
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.substring(3)) - 99) / 200); // max page
        for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
            if (cp > 9 && cp < 50) {
                continue;
            }
            buts.push(cp);
        }
        if (page != mxp) {
            buts.push(mxp);
        }
        let select = $("*[pbs-pg-select]");
        select.empty();
        buts.forEach(p => {
            let cur;
            if (p == page) {
                cur = $(`<div pbs-pg-cur>${p}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${p}</div>`);
                cur.on("click", () => {
                    lpfuncs.uva(p);
                });
            }
            cur.appendTo(select);
        });
        let table = $("*[pbs-content]");
        table.empty();
        let head = $("<tr pbs-head></tr>");
        for (let i = 0; i < 10; i++) {
            let td = $(`<td>${i}</td>`);
            td.appendTo(head);
        }
        head.appendTo(table);
        /**
         * For example: x-th page
         * problems: P((x-1) * 200) to P(x * 200 - 1)
         */
        let cu = Number(localStorage.getItem("currentUser"));
        let las = (page - 1) * 200 + 99;
        let tr = $("<tr></tr>");
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let cn = Number(pid.substring(3));
            if (cn <= las) {
                continue;
            }
            if (cn > page * 200 + 99) {
                break;
            }
            /**
             * render blanks from las + 1 to cn - 1
             */
            for (let j = las + 1; j < cn; j++) {
                if (j % 10 == 0) {
                    tr.appendTo(table);
                    tr = $("<tr></tr>");
                }
                $("<td></td>").appendTo(tr);
            }
            if (cn % 10 == 0) {
                tr.appendTo(table);
                tr = $("<tr></tr>");
            }
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (ac_data[cu].accepted.find(p => p == pid)) {
                sta = "pbs-ac";
            }
            if (ac_data[cu].submitted.find(p => p == pid)) {
                sta = "pbs-sb";
            }
            $(`
                <td ${sta}>
                    <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                        <div style="color:${dif_col[dif]}" pbs-pid>
                            ${pid}
                        </div>
                        <div pbs-tit>
                            ${tit}
                        </div>
                    </a>
                </td>
            `).appendTo(tr);
            las = cn;
        }
        tr.appendTo(table);
    },
    cf(page = Number(localStorage.getItem("pageCF"))) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem("pageCF", page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            buts.push(cp);
        }
        buts.push(1);
        buts = buts.reverse();
        cp = page + 1;
        /**
         * Every page there are 20 contests
         * +-->  problems
         * |
         * |
         * V
         * 20 contests
         */
        let pbs = pbs_data.cf;
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.match(/\d+/)[0])) / 20);
        for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
            buts.push(cp);
        }
        if (page != mxp) {
            buts.push(mxp);
        }
        let select = $("*[pbs-pg-select]");
        select.empty();
        buts.forEach(p => {
            let cur;
            if (p == page) {
                cur = $(`<div pbs-pg-cur>${p}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${p}</div>`);
                cur.on("click", () => {
                    lpfuncs.cf(p);
                });
            }
            cur.appendTo(select);
        });
        let contests = {};
        let ml = 0;
        pbs.forEach(p => {
            /**
             * contests: (x - 1) * 20 + 1 to x * 200
             */
            let cid = Number(p.pid.match(/\d+/)[0]);
            if (cid <= (page - 1) * 20 || cid > page * 20) {
                return;
            }
            if (!contests[cid]) {
                contests[cid] = [];
            }
            let end = p.pid.match(/\d+$/);
            if (end == null || end[0] == "1") {
                contests[cid].push([p]);
            }
            else {
                contests[cid][contests[cid].length - 1].push(p);
            }
            ml = Math.max(contests[cid].length, ml);
        });
        let table = $("*[pbs-content]");
        table.empty();
        let head = $("<tr pbs-head></tr>");
        let alp = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 1; i <= ml; i++) {
            $(`<td>${alp[i]}</td>`).appendTo(head);
        }
        head.appendTo(table);
        let cu = Number(localStorage.getItem("currentUser"));
        for (let cid in contests) {
            let tr = $("<tr></tr>");
            let cnt = contests[cid];
            cnt.forEach(c => {
                if (c.length == 1) {
                    let { dif, pid, tit } = c[0];
                    if (tit.length > 50) {
                        tit = tit.slice(0, 47) + "...";
                    }
                    let sta = "";
                    if (ac_data[cu].accepted.find(p => p == pid)) {
                        sta = "pbs-ac";
                    }
                    if (ac_data[cu].submitted.find(p => p == pid)) {
                        sta = "pbs-sb";
                    }
                    $(`
                        <td ${sta}>
                            <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                                <div style="color:${dif_col[dif]}" pbs-pid>
                                    ${pid}
                                </div>
                                <div pbs-tit>
                                    ${tit}
                                </div>
                            </a>
                        </td>
                    `).appendTo(tr);
                }
                else {
                    let td = $("<td></td>");
                    c.forEach(p => {
                        let { dif, pid, tit } = p;
                        if (tit.length > 50) {
                            tit = tit.slice(0, 47) + "...";
                        }
                        let sta = "";
                        if (ac_data[cu].accepted.find(p => p == pid)) {
                            sta = "pbs-ac";
                        }
                        if (ac_data[cu].submitted.find(p => p == pid)) {
                            sta = "pbs-sb";
                        }
                        $(`
                            <div ${sta}>
                                <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                                    <div style="color:${dif_col[dif]}" pbs-pid>
                                        ${pid}
                                    </div>
                                    <div pbs-tit>
                                        ${tit}
                                    </div>
                                </a>
                            </div>
                        `).appendTo(td);
                    });
                    td.appendTo(tr);
                }
            });
            tr.appendTo(table);
        }
    },
    contest_series(pid) {
        pid = pid.substring(2);
        if (pid[0] == '_') {
            pid = pid.substring(1);
        }
        pid = pid.match(/[0-9a-zA-Z]+/)[0];
        pid = pid.replace(/\d+$/, "");
        let mat = pid.match(/[a-zA-Z]+(\d+[a-zA-Z]+)/);
        if (mat) {
            pid = pid.replace(mat[1], "");
        }
        return pid;
    },
    contest_id(pid) {
        pid = pid.substring(2);
        if (pid[0] == '_') {
            pid = pid.substring(1);
        }
        if (pid.match(/_[0-9a-zA-Z]+$/)) {
            return pid.match(/([0-9a-zA-Z_]+)_[0-9a-zA-Z]+$/)[1];
        }
        else {
            return pid.replace(/\d+$/, "");
        }
    },
    first(cont) {
        return cont.match(/^\d/) ? "#" : cont[0];
    },
    at_cont(cont) {
        localStorage.setItem("pageAT", cont);
        let pbs = pbs_data.at;
        let table = $("*[pbs-content]").empty();
        let tr = null;
        let cu = Number(localStorage.getItem("currentUser"));
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let ser = lpfuncs.contest_series(pid);
            let cid = lpfuncs.contest_id(pid);
            if (ser != cont) {
                continue;
            }
            if (i == 0) // it must be the start
            {
                tr = $(`
                    <tr>
                        <td pbs-pg-at-head>
                            ${cid}
                        </td>
                    </tr>
                `);
            }
            else {
                let las = lpfuncs.contest_id(pbs[i - 1].pid);
                if (las != cid) { // new line
                    if (tr) {
                        tr.appendTo(table);
                    }
                    tr = $(`
                        <tr>
                            <td pbs-pg-at-head>
                                ${cid}
                            </td>
                        </tr>
                    `);
                }
            }
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (ac_data[cu].accepted.find(p => p == pid)) {
                sta = "pbs-ac";
            }
            if (ac_data[cu].submitted.find(p => p == pid)) {
                sta = "pbs-sb";
            }
            $(`
                <td ${sta}>
                    <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
                        <div style="color:${dif_col[dif]}" pbs-pid>
                            ${pid}
                        </div>
                        <div pbs-tit>
                            ${tit}
                        </div>
                    </a>
                </td>
            `).appendTo(tr);
        }
        if (tr) {
            tr.appendTo(table);
        }
    },
    at_subselect(cont) {
        let subselect = $(`
                <div pbs-pg-sub-select flex-wrap>
                </div>
            `);
        subselect = subselect.appendTo($("*[pbs-pg-sub-select-container]").empty());
        let sta = lpfuncs.first(cont);
        for (let cs in at_dict) {
            if (lpfuncs.first(cs) == sta) {
                let cur;
                if (cs == cont) {
                    cur = $(`<div pbs-pg-cur>${cs}</div>`);
                }
                else {
                    cur = $(`<div pbs-pg-but>${cs}</div>`);
                    cur.on("click", () => {
                        lpfuncs.at_cont(cs);
                        lpfuncs.at_subselect(cs);
                    });
                }
                cur.appendTo(subselect);
            }
        }
    },
    at_select(cont) {
        let select = $("*[pbs-pg-select]").empty();
        let alp = "#abcdefghijklmnopqrstuvwxyz";
        for (let i = 0; i < 27; i++) {
            let cur;
            if (lpfuncs.first(cont) == alp[i]) {
                cur = $(`<div pbs-pg-cur>${alp[i]}</div>`);
            }
            else {
                cur = $(`<div pbs-pg-but>${alp[i]}</div>`);
                cur.on("click", () => {
                    lpfuncs.at_select(alp[i] + "_____");
                });
            }
            cur.appendTo(select);
        }
        lpfuncs.at_subselect(cont);
    },
    at(cont = localStorage.getItem("pageAT")) {
        if (!cont) {
            cont = "abc";
        }
        localStorage.setItem("pageAT", cont);
        lpfuncs.at_select(cont);
        lpfuncs.at_cont(cont);
    }
}

/**
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_pbs(main) {
    return function () {
        console.log("problemset");
        main.empty();
        main.removeAttr(main.attr("current-page"));
        main.attr("current-page", "problemset");
        main.attr("problemset");
        $.get("/pbs.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            let usr = $("*[ri-user]");
            usr.val(localStorage.getItem("currentUser"));
            $("*[rb-ch]").off();
            $("*[rb-ch]").on("click", () => {
                localStorage.setItem("currentUser", usr.val());
            });
            pbs_type.forEach(t => {
                $(`*[rb-${t}]`).off();
                $(`*[rb-${t}]`).on("click", () => {
                    lpfuncs.clear();
                    localStorage.setItem("currentPbs", t);
                    lpfuncs[t]();
                })
            });
            if (!localStorage.getItem("currentPbs")) {
                localStorage.setItem("currentPbs", "p");
            }
            lpfuncs[localStorage.getItem("currentPbs")]();
        })
    }
}

$(() => {
    if (!localStorage.getItem("currentUser")) {
        localStorage.setItem("currentUser", 1);
    }
    let main = $("main");
    pbs_type.forEach(t => {
        $.get(`/${t}.json`, res => {
            pbs_data[t] = JSON.parse(res);
            if (t == "at") {
                pbs_data.at.forEach(p => {
                    at_dict[lpfuncs.contest_series(p.pid)] = true;
                });
            }
        });
    });
    $.get("/accepts.json", res => {
        ac_data = JSON.parse(res);
    });
    $("*[side-login]").on("click", load_login(main));
    $("*[side-update]").on("click", load_prob(main));
    $("*[side-pbs]").on("click", load_pbs(main));
    pbs_type.forEach(t => {
        $(`*[side-${t}]`).on("click", () => {
            localStorage.setItem("currentPbs", t);
            load_pbs(main)();
        });
    });
    $(load_pbs(main));
});
