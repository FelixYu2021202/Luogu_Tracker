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
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_prob(main) {
    return function () {
        console.log("load prob");
        main.empty();
        main.removeAttr(main.attr("current-page"));
        main.attr("current-page", "lp-page");
        main.attr("lp-page");
        $.get("/lp.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            let pgb = $("*[pro-bar]");
            $("*[but]").off("");
            $("*[but]").on("click", () => {
                console.log("爬取");
                let type = $("*[selection]").val();
                type.forEach(t => {
                    console.log(t);
                    const ws = new WebSocket(`ws://localhost:51672?type=load_prob&body=${t}`);
                    ws.onmessage = ev => {
                        let dat = JSON.parse(ev.data);
                        if (dat.success) {
                            pgb.css("--pro-color", "var(--pro-green)");
                        }
                        else {
                            pgb.css("--pro-color", "var(--pro-red)");
                        }
                        pgb.css("--progress", `${Math.round(1000 * dat.cur / dat.max) / 10}%`);
                        pgb.text(`${Math.round(1000 * dat.cur / dat.max) / 10}%`);
                    }
                });
            })
        });
    }
}

const pbs_type = ["p", "b", "cf", "at", "sp", "uva"];
let pbs_data = {};

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
]

/**
 * @type {NodeJS.Dict<() => void>}
 */
let lpfuncs = {
    clear() {
        $("pbs-pg-select").empty();
        $("pbs-content").empty();
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
         * Every page there is 200 problems.
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
                $("<tr></tr>").appendTo(tr);
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
         * Every page there is 200 problems.
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
                $("<tr></tr>").appendTo(tr);
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
         * Every page there is 200 problems.
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
         * Every page there is 20 contests
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
    // at(page = Number(localStorage.getItem("pageAT"))) {
    //     if (!page) {
    //         page = 1;
    //     }
    //     localStorage.setItem("pageAT", page);
    //     let buts = [];
    //     let cp = page;
    //     for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
    //         buts.push(cp);
    //     }
    //     buts.push(1);
    //     buts = buts.reverse();
    //     cp = page + 1;
    //     /**
    //      * Every page there is 20 contests
    //      * +-->  problems
    //      * |
    //      * |
    //      * V
    //      * 20 contests
    //      */
    //     let pbs = pbs_data.at;
    //     let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.match(/\d+/)[0])) / 20);
    //     for (let dif = 2; cp < mxp; cp += dif, dif *= 2) {
    //         buts.push(cp);
    //     }
    //     if (page != mxp) {
    //         buts.push(mxp);
    //     }
    //     let select = $("*[pbs-pg-select]");
    //     select.empty();
    //     buts.forEach(p => {
    //         let cur;
    //         if (p == page) {
    //             cur = $(`<div pbs-pg-cur>${p}</div>`);
    //         }
    //         else {
    //             cur = $(`<div pbs-pg-but>${p}</div>`);
    //             cur.on("click", () => {
    //                 lpfuncs.cf(p);
    //             });
    //         }
    //         cur.appendTo(select);
    //     });
    //     let contests = {};
    //     let ml = 0;
    //     pbs.forEach(p => {
    //         /**
    //          * contests: (x - 1) * 20 + 1 to x * 200
    //          */
    //         let cid = Number(p.pid.match(/\d+/)[0]);
    //         if (cid <= (page - 1) * 20 || cid > page * 20) {
    //             return;
    //         }
    //         if (!contests[cid]) {
    //             contests[cid] = [];
    //         }
    //         let end = p.pid.match(/\d+$/);
    //         if (end == null || end[0] == "1") {
    //             contests[cid].push([p]);
    //         }
    //         else {
    //             contests[cid][contests[cid].length - 1].push(p);
    //         }
    //         ml = Math.max(contests[cid].length, ml);
    //     });
    //     let table = $("*[pbs-content]");
    //     table.empty();
    //     let head = $("<tr pbs-head></tr>");
    //     let alp = " ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    //     for (let i = 1; i <= ml; i++) {
    //         $(`<td>${alp[i]}</td>`).appendTo(head);
    //     }
    //     head.appendTo(table);
    //     let cu = Number(localStorage.getItem("currentUser"));
    //     for (let cid in contests) {
    //         let tr = $("<tr></tr>");
    //         let cnt = contests[cid];
    //         cnt.forEach(c => {
    //             if (c.length == 1) {
    //                 let { dif, pid, tit } = c[0];
    //                 if (tit.length > 50) {
    //                     tit = tit.slice(0, 47) + "...";
    //                 }
    //                 let sta = "";
    //                 if (ac_data[cu].accepted.find(p => p == pid)) {
    //                     sta = "pbs-ac";
    //                 }
    //                 if (ac_data[cu].submitted.find(p => p == pid)) {
    //                     sta = "pbs-sb";
    //                 }
    //                 $(`
    //                     <td ${sta}>
    //                         <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
    //                             <div style="color:${dif_col[dif]}" pbs-pid>
    //                                 ${pid}
    //                             </div>
    //                             <div pbs-tit>
    //                                 ${tit}
    //                             </div>
    //                         </a>
    //                     </td>
    //                 `).appendTo(tr);
    //             }
    //             else {
    //                 let td = $("<td></td>");
    //                 c.forEach(p => {
    //                     let { dif, pid, tit } = p;
    //                     if (tit.length > 50) {
    //                         tit = tit.slice(0, 47) + "...";
    //                     }
    //                     let sta = "";
    //                     if (ac_data[cu].accepted.find(p => p == pid)) {
    //                         sta = "pbs-ac";
    //                     }
    //                     if (ac_data[cu].submitted.find(p => p == pid)) {
    //                         sta = "pbs-sb";
    //                     }
    //                     $(`
    //                         <div ${sta}>
    //                             <a href="https://www.luogu.com.cn/problem/${pid}" target="_blank" pbs-link>
    //                                 <div style="color:${dif_col[dif]}" pbs-pid>
    //                                     ${pid}
    //                                 </div>
    //                                 <div pbs-tit>
    //                                     ${tit}
    //                                 </div>
    //                             </a>
    //                         </div>
    //                     `).appendTo(td);
    //                 });
    //                 td.appendTo(tr);
    //             }
    //         });
    //         tr.appendTo(table);
    //     }
    // }
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
