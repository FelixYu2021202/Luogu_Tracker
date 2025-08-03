if (typeof $ == "undefined") {
    $ = require("jquery");
}

let config;

/**
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_login(main) {
    return function () {
        console.log("login");
        main.empty();
        main.attr("current-page", "login-page");
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
        main.attr("current-page", "lp-page");
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
                    let ws = new WebSocket(`ws://${config.ip}:${config.socketPort}?type=load_prob&body=${t}`);
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
/**
 * @type {{[key : string]: {pid: string, dif: number, tags: number[], tit: string}[]}}
 */
let pbs_data = {};

/**
 * @type {{[key : string]: {[key: string]: {pid: string, dif: number, tags: number[], tit: string}}}}
 */
let pbs_map = {};

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

let lpfuncs = {
    clear() {
        $("pbs-pg-select").empty();
        $("pbs-content").empty();
        $("*[pbs-pg-sub-select]").detach();
    },
    /**
     * 
     * @param {string} sta 
     * @param {string} pid 
     * @param {string} tit 
     * @param {number} dif 
     */
    rp(sta, pid, tit, dif) {
        return $(`
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
        `);
    },
    /**
     * 
     * @param {string} t 
     * @param {number} page 
     * @param {number} st 
     * @param {number[]} dis 
     */
    default(t, page, st, dis) {
        if (!page) {
            page = 1;
        }
        localStorage.setItem(`page${t.toUpperCase()}`, page);
        let buts = [];
        let cp = page;
        for (let dif = 1; cp > 1; cp -= dif, dif *= 2) {
            if (!dis.find(p => p == cp)) {
                buts.push(cp);
            }
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
        let pbs = pbs_data[t];
        let mxp = Math.ceil((Number(pbs[pbs.length - 1].pid.substring(t.length)) + 1 - st) / 200); // max page
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
                    lpfuncs[t](p);
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
        let las = st - 1 + (page - 1) * 200;
        let tr = $("<tr></tr>");
        for (let i = 0; i < pbs.length; i++) {
            let { dif, pid, tit } = pbs[i];
            let cn = Number(pid.substring(t.length));
            if (cn <= las) {
                continue;
            }
            if (cn > st - 1 + page * 200) {
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
            lpfuncs.rp(sta, pid, tit, dif).appendTo(tr);
            las = cn;
        }
        tr.appendTo(table);
    },
    p(page = Number(localStorage.getItem("pageP"))) {
        lpfuncs.default("p", page, 1000, []);
    },
    b(page = Number(localStorage.getItem("pageB"))) {
        lpfuncs.default("b", page, 2000, [2, 3, 5, 6, 7, 8]);
    },
    sp(page = Number(localStorage.getItem("pageSP"))) {
        lpfuncs.default("sp", page, 0, []);
    },
    uva(page = Number(localStorage.getItem("pageUVA"))) {
        let dis = [];
        for (let i = 10; i < 50; i++) {
            dis.push(i);
        }
        lpfuncs.default("uva", page, 100, dis);
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
                    lpfuncs.rp(sta, pid, tit, dif).appendTo(tr);
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
                        lpfuncs.rp(sta, pid, tit, dif).appendTo(td);
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
            lpfuncs.rp(sta, pid, tit, dif).appendTo(tr);
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

class Counter {
    /**
     * @param {()=>void} cb 
     * @param {number} cnt 
     */
    constructor(cb, cnt) {
        this.cb = cb;
        this.cnt = cnt;
    }
    count() {
        this.cnt--;
        if (!this.cnt) {
            this.cb();
        }
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
        main.attr("current-page", "problemset");
        $.get("/pbs.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            let usr = $("*[ri-user]");
            usr.val(localStorage.getItem("currentUser"));
            $("*[rb-ch]").off();
            $("*[rb-ch]").on("click", () => {
                localStorage.setItem("currentUser", usr.val());
                lpfuncs[localStorage.getItem("currentPbs")]();
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

/**
 * @typedef {{pid: string, comment: string}} TrainingProblem
 * @typedef {{name: string, date: string, source: string, notes: string, comment: string, problems: TrainingProblem[]}} Training
 */
let trainingfuncs = {
    /**
     * @type {JQuery<HTMLDivElement>}
     */
    listdiv: null,
    /**
     * @type {JQuery<HTMLDivElement>}
     */
    viewdiv: null,
    /**
     * @type {Training[]}
     */
    trainings: null,
    /**
     * @param {string} pid 
     */
    check_prob(pid) {
        for (let ps of pbs_type) {
            if (pid.startsWith(ps.toUpperCase())) {
                return pbs_map[ps][pid] != null;
            }
        }
        return false;
    },
    get_prob(pid) {
        for (let ps of pbs_type) {
            if (pid.startsWith(ps.toUpperCase())) {
                return pbs_map[ps][pid];
            }
        }
        return null;
    },
    /**
     * @param {string} s
     */
    check_training(s) {
        try {
            /**
             * @type {Training []}
             */
            let tr = JSON.parse(s);
            if (tr.constructor != Array) {
                return null;
            }
            let ok = true;
            tr.forEach(tra => {
                ["name", "date", "source", "comment", "notes"].forEach(v => {
                    if (typeof tra[v] != "string") {
                        ok = false;
                    }
                });
                if (tra.problems.constructor != Array) {
                    ok = false;
                } else {
                    tra.problems.forEach(pb => {
                        if (typeof pb.pid != "string" || !trainingfuncs.check_prob(pb.pid)) {
                            ok = false;
                        }
                        if (typeof pb.comment != "string") {
                            ok = false;
                        }
                    });
                }
            });
            return ok ? tr : null;
        } catch (e) {
            return null;
        }
    },
    clear_div() {
        $("#training-view-area").children().remove();
        trainingfuncs.listdiv.children().children().children().not(":first").remove();
        trainingfuncs.viewdiv.attr("training-hide", "");
        trainingfuncs.listdiv.attr("training-hide", "");
    },
    load_list() {
        trainingfuncs.clear_div(trainingfuncs.listdiv, trainingfuncs.viewdiv);
        trainingfuncs.listdiv.removeAttr("training-hide");
        let table = trainingfuncs.listdiv.children().first();
        trainingfuncs.trainings.forEach((training, idx) => {
            let trainingtr = $(`
                <tr>
                <td>${training.date}</td>
                <td>${training.name}</td>
                <td>${training.source}</td>
                <td>${training.notes}</td>
                <td>${training.problems.length}</td>
                <td></td>
                </tr>`).appendTo(table);
            let tcl = trainingtr.children().last();
            let viewbut = $(`<button training-list-view>查看题单</button>`);
            viewbut.appendTo(tcl);
            $(`<span style="width: 1em; display: inline-block;"></span>`).insertAfter(viewbut);
            let deletebut = $(`<button training-delete>删除题单</button>`);
            deletebut.appendTo(tcl);
            $(`<span style="width: 1em; display: inline-block;"></span>`).insertAfter(deletebut);
            let downloadbut = $(`<button training-download>获取下载链接</button>`);
            downloadbut.appendTo(tcl);
            viewbut.on("click", () => {
                trainingfuncs.load_view(idx);
            });
            deletebut.on("click", () => {
                let res = true;
                let texts = [
                    "你确定要删除这个题单吗？(1/3)",
                    "删除后无法找回哦！真的没有办法！(2/3)",
                    "最后再确认一遍，以免你误触两次。你将永远失去这个题单！(3/3)"
                ];
                for (let i = 0; i < 3; i++) {
                    if (!confirm(texts[i])) {
                        res = false;
                        break;
                    }
                }
                if (res) {
                    trainingfuncs.trainings.splice(idx, 1);
                    localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
                    trainingfuncs.load_list();
                }
            });
            downloadbut.on("click", () => {
                let blob = new Blob([JSON.stringify([training])], {
                    type: "application/json"
                });
                let url = URL.createObjectURL(blob);
                downloadbut.hide();
                let a = $(`<a target="_blank" href="${url}" training-download download="LTTraining_${training.name.replaceAll('"', '""')}-By-${training.source.replaceAll('"', '""')}_${training.date.replaceAll('"', '""')}.json">下载链接</a>`).appendTo(tcl);
                a.on("click", () => {
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                        downloadbut.show();
                        a.remove();
                    }, 500);
                });
            });
        });
        let createtr = $(`
                <tr>
                <td>创建题单</td>
                <td><input id="create-training-name" inline-input></td>
                <td><input id="create-training-source" value="none" inline-input></td>
                <td><input id="create-training-notes" inline-input></td>
                <td></td>
                <td></td>
                </tr>`).appendTo(table);
        let createbut = $(`<button training-download>创建题单</button>`).appendTo(createtr.children().last());
        createbut.on("click", () => {
            let now = new Date();
            trainingfuncs.trainings.push({
                name: $("#create-training-name").val(),
                date: `${now.getFullYear()}.${now.getMonth() + 1}.${now.getDate()}`,
                source: $("#create-training-source").val(),
                comment: "",
                notes: $("#create-training-notes").val(),
                problems: []
            });
            localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
            trainingfuncs.load_list();
        });
        let ootr = $(`
                <tr>
                <td>其他选项</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                </tr>`).appendTo(table);
        let ocl = ootr.children().last();
        let mergebut = $(`<button training-list-view>加入题单</button>`).appendTo(ocl);
        let mergeinput = $(`<input type="file" style="display: none;" accept=".json">`).appendTo(ocl);
        $(`<span style="width: 1em; display: inline-block;"></span>`).insertAfter(mergebut);
        let changebut = $(`<button training-delete>替换题单</button>`).appendTo(ocl);
        let changeinput = $(`<input type="file" style="display: none;" accept=".json">`).appendTo(ocl);
        $(`<span style="width: 1em; display: inline-block;"></span>`).insertAfter(changebut);
        let dabut = $(`<button training-download>获取完整链接</button>`).appendTo(ocl);
        dabut.on("click", () => {
            let blob = new Blob([JSON.stringify(trainingfuncs.trainings)], {
                type: "application/json"
            });
            let url = URL.createObjectURL(blob);
            dabut.hide();
            let a = $(`<a target="_blank" href="${url}" training-download download="LTTrainings_All.json">下载链接</a>`).appendTo(ocl);
            a.on("click", () => {
                setTimeout(() => {
                    URL.revokeObjectURL(url);
                    dabut.show();
                    a.remove();
                }, 500);
            });
        });
        mergebut.on("click", () => {
            alert("请选择由 Luogu Tracker 下载的题单文件。若文件无效，则保持原样，不会合并。");
            mergeinput.trigger("click");
        });
        mergeinput[0].addEventListener("change", function () {
            /**
             * @type {File}
             */
            let file = this.files[0];
            let reader = new FileReader();
            reader.onload = (e) => {
                let newtraining = trainingfuncs.check_training(e.target.result);
                if (newtraining != null) {
                    trainingfuncs.trainings = trainingfuncs.trainings.concat(newtraining);
                    localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
                    trainingfuncs.load_list();
                }
                else {
                    alert("题单格式不正确。请选择 Luogu Tracker 下载的题单文件。");
                }
            };
            reader.readAsText(file);
        });
        changebut.on("click", () => {
            let texts = [
                "请选择由 Luogu Tracker 下载的题单文件。若文件无效，则保持原样。\n注意：此功能为替换，原来的题单信息会丢失！",
                "你确定要替换题单吗？如果你只想添加、导入题单，请选择合并题单。",
                "请注意，这样做会永久失去原有的题单信息。"
            ];
            for (let i = 0; i < 3; i++) {
                if (!confirm(texts[i])) {
                    return;
                }
            }
            changeinput.trigger("click");
        });
        changeinput[0].addEventListener("change", function () {
            /**
             * @type {File}
             */
            let file = this.files[0];
            let reader = new FileReader();
            reader.onload = (e) => {
                let newtraining = trainingfuncs.check_training(e.target.result);
                if (newtraining != null) {
                    trainingfuncs.trainings = newtraining;
                    localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
                    trainingfuncs.load_list();
                }
                else {
                    alert("题单格式不正确。请选择 Luogu Tracker 下载的题单文件。");
                }
            };
            reader.readAsText(file);
        });
    },
    /**
     * @param {number} tid
     */
    load_view(tid) {
        trainingfuncs.clear_div();
        trainingfuncs.viewdiv.removeAttr("training-hide");
        let training = trainingfuncs.trainings[tid];
        let nameinput = $("#training-name");
        let sourceinput = $("#training-source");
        let notesinput = $("#training-notes");
        let dateinput = $("#training-date");
        let commentarea = $("#training-comment");
        let table = $("#training-view-area");
        let backbut = $("#training-view-back");
        backbut.off("click");
        let deletebut = $("#training-view-delete");
        deletebut.off("click");
        let savebut = $("#training-view-save");
        savebut.off("click");
        let downloadbut = $("#training-view-download");
        downloadbut.off("click");
        /**
         * @type {HTMLAnchorElement}
         */
        let downloada = $("#training-download-a")[0];
        nameinput.val(training.name);
        sourceinput.val(training.source);
        notesinput.val(training.notes);
        dateinput.val(training.date);
        commentarea.val(training.comment);
        $(`<tr pbs-head><td>题目链接</td><td>备注</td></tr>`).appendTo(table);
        let cu = Number(localStorage.getItem("currentUser"));
        for (let prob of training.problems) {
            let probinfo = trainingfuncs.get_prob(prob.pid);
            if (probinfo == null) {
                continue;
            }
            let probrow = $(`<tr></tr>`).appendTo(table);
            let { dif, pid, tit } = probinfo;
            if (tit.length > 50) {
                tit = tit.slice(0, 47) + "...";
            }
            let sta = "";
            if (cu) {
                if (ac_data[cu].accepted.find(p => p == pid)) {
                    sta = "pbs-ac";
                }
                if (ac_data[cu].submitted.find(p => p == pid)) {
                    sta = "pbs-sb";
                }
            }
            lpfuncs.rp(sta, pid, tit, dif).appendTo(probrow);
            $(`<td><textarea>${prob.comment}</textarea></td>`).appendTo(probrow);
            probrow.appendTo(table);
        }
        let createtr = $(`<tr></tr>`).appendTo(table);
        let pidtd = $(`<textarea input-pid></textarea>`).appendTo($(`<td></td>`).appendTo(createtr));
        let createbut = $(`<button create-pid training-list-view>添加题目</button>`).appendTo($(`<td></td>`).appendTo(createtr));
        createbut.on("click", () => {
            let val = pidtd.val().split(/,[\s]*/);
            let sucpid = [], exipid = [], errpid = [];
            let tc = table.children().not(":first").not(":last");
            for (let pid of val) {
                if (!trainingfuncs.check_prob(pid)) {
                    errpid.push(pid);
                    continue;
                }
                if (sucpid.indexOf(pid) != -1 || exipid.indexOf(pid) != -1) {
                    exipid.push(pid);
                    continue;
                }
                let ok = true;
                for (let i = 0; i < tc.length; i++) {
                    if (tc[i].children[0].children[0].children[0].innerText == pid) {
                        exipid.push(pid);
                        ok = false;
                        break;
                    }
                }
                if (ok) {
                    sucpid.push(pid);
                }
            }
            let res = confirm(`下列题目将被加入题单：
${sucpid.join(",  ")}
下列题目已经进入题单，不再添加：
${exipid.join(",  ")}
下列题目未找到：
${errpid.join(",  ")}
请确认是否添加。`);
            if (res) {
                for (let pid of sucpid) {
                    let probinfo = trainingfuncs.get_prob(pid);
                    if (probinfo == null) {
                        continue;
                    }
                    let probrow = $(`<tr></tr>`).appendTo(table);
                    let { dif, tit } = probinfo;
                    if (tit.length > 50) {
                        tit = tit.slice(0, 47) + "...";
                    }
                    let sta = "";
                    if (cu) {
                        if (ac_data[cu].accepted.find(p => p == pid)) {
                            sta = "pbs-ac";
                        }
                        if (ac_data[cu].submitted.find(p => p == pid)) {
                            sta = "pbs-sb";
                        }
                    }
                    lpfuncs.rp(sta, pid, tit, dif).appendTo(probrow);
                    $(`<td><textarea></textarea></td>`).appendTo(probrow);
                    probrow.insertBefore(createtr);
                }
            }
        });
        backbut.on("click", () => {
            if (confirm("确认要退出？此操作不会保存更改！")) {
                trainingfuncs.load_list();
            }
        });
        deletebut.on("click", () => {
            let res = true;
            let texts = [
                "你确定要删除这个题单吗？(1/3)",
                "删除后无法找回哦！真的没有办法！(2/3)",
                "最后再确认一遍，以免你误触两次。你将永远失去这个题单！(3/3)"
            ];
            for (let i = 0; i < 3; i++) {
                if (!confirm(texts[i])) {
                    res = false;
                    break;
                }
            }
            if (res) {
                trainingfuncs.trainings.splice(tid, 1);
                localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
                trainingfuncs.load_list();
            }
        });
        savebut.on("click", () => {
            /**
             * @type {Training}
             */
            let newtraining = {
                name: nameinput.val(),
                source: sourceinput.val(),
                notes: notesinput.val(),
                date: dateinput.val(),
                comment: commentarea.val(),
                problems: []
            };
            let tc = table.children().not(":first").not(":last");
            for (let td of tc) {
                newtraining.problems.push({
                    pid: td.children[0].children[0].children[0].innerText,
                    comment: td.children[1].children[0].value
                });
            }
            training = trainingfuncs.trainings[tid] = newtraining;
            localStorage.setItem("trainings", JSON.stringify(trainingfuncs.trainings));
            alert("保存成功");
        });
        downloadbut.on("click", () => {
            savebut.trigger("click");
            let blob = new Blob([JSON.stringify([training])], {
                type: "application/json"
            });
            let url = URL.createObjectURL(blob);
            downloada.href = url;
            downloada.download = `LTTraining_${training.name.replaceAll('"', '""')}-By-${training.source.replaceAll('"', '""')}_${training.date.replaceAll('"', '""')}.json`;
            downloada.click();
            setTimeout(() => {
                URL.revokeObjectURL(blob);
            }, 500);
        });
    }
}

/**
 * 
 * @param {JQuery<HTMLElement>} main
 */
function load_training(main) {
    return function () {
        console.log("training");
        main.empty();
        main.attr("current-page", "training-page");
        $.get("/training.html", (data) => {
            let inner = $(data);
            inner.appendTo(main);
            let listdiv = $("*[training-select]");
            let viewdiv = $("*[training-view]");
            if (!localStorage.getItem("trainings")) {
                localStorage.setItem("trainings", "[]");
            }
            /**
             * @type {Training[]}
             */
            let trainings = JSON.parse(localStorage.getItem("trainings"));
            trainingfuncs.listdiv = listdiv;
            trainingfuncs.viewdiv = viewdiv;
            trainingfuncs.trainings = trainings;
            trainingfuncs.load_list(listdiv, viewdiv, trainings);
        });
    }
}

$(() => {
    if (!localStorage.getItem("currentUser")) {
        localStorage.setItem("currentUser", 1);
    }
    let main = $("main");
    let counter = new Counter(load_pbs(main), 8);
    pbs_type.forEach(t => {
        $.get(`/${t}.json`, res => {
            pbs_data[t] = JSON.parse(res);
            pbs_map[t] = {};
            for (let prob of pbs_data[t]) {
                pbs_map[t][prob.pid] = prob;
            }
            counter.count();
            if (t == "at") {
                pbs_data.at.forEach(p => {
                    at_dict[lpfuncs.contest_series(p.pid)] = true;
                });
            }
        });
    });
    $.get("/accepts.json", res => {
        ac_data = JSON.parse(res);
        counter.count();
    });
    $.get("/ports.json", res => {
        config = JSON.parse(res);
        counter.count();
    });
    $("*[side-login]").on("click", load_login(main));
    $("*[side-update]").on("click", load_prob(main));
    $("*[side-pbs]").on("click", load_pbs(main));
    $("*[side-training]").on("click", load_training(main));
    pbs_type.forEach(t => {
        $(`*[side-${t}]`).on("click", () => {
            localStorage.setItem("currentPbs", t);
            load_pbs(main)();
        });
    });
});
