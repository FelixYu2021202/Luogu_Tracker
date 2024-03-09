# Luogu Tracker by cosf

> Last update: 9/3/2024
>
> Author: cosf

## 简介

此 Luogu Tracker 提供题目列表、完成情况的图形化展示，并且支持不同操作系统。

## 后台工作

### 1. 安装 Node.js

[官网链接](https://nodejs.org/)

### 2. 安装库文件

进到该目录下，在命令行内输入：

```powershell
npm install
```

### 3. 运行服务器

运行：

```powershell
cd server && node server
```

### 4. 查看日志

服务器的每一次访问都会记录在 `logs/server.log` 里面。

格式：

```log
[Time Stamp] Url Ref
```

## 使用方法

### 打开[网页](http://localhost:5167/)

### 侧边栏

- 顶端为洛谷标志，点击可跳转至洛谷主页。
- 题库按钮，点击可打开题目界面。
- 登陆按钮，点击可打开登陆界面。
- 刷新按钮，点击可打开爬取题目界面。
- 主题库、入门、CF、AtC、SPoj、UVa 按钮，点击可打开对应 oj 题目界面。

### 爬取题目界面

- 中间有对应 OJ 的按钮，选择以爬取对应题目。
- 按“爬取”按钮开始爬取题目。
- 如果重复爬取同一种题目，可能会导致爬取失败。

### 登陆界面

- 按照网页内提示即可使用。

### 题目界面

- 顶端有 OJ 选择器以及用户选择框。
- 每一次点击 OJ 选择器，下方题目表格就会更新内容至对应 OJ。
- 在点击“切换”按钮后，通过信息会转换为输入框内的用户的通过信息。请在登陆界面爬取信息后再使用。
- 表格的顶端和底端都有页面选择器。带框的是当前页面，其他的为按钮，点击可跳转。
- 表格内部由表头和表身组成。表头由题目末尾数字/题号组成。
- 表身由题目组成，每一个非空的格对应一个题目（或者对应多个，如 CFxxxA1, CFxxxA2 等）。
- 点击格子即可跳转至对应题目。
- 绿色背景表示通过，黄色背景表示没通过。

## 注释

\* 所有链接均设置 `target="_blank"`，点击后会跳转，即新建页面打开内容。
