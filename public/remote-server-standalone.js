#!/usr/bin/env node

const http = require('http');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const PORT = process.argv[2] || 8765;

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

async function writeToClipboard(text) {
    const platform = os.platform();

    try {
        if (platform === 'win32') {
            // Windows: 使用 PowerShell
            const escapedText = text.replace(/"/g, '""');
            await execPromise(`powershell -command "Set-Clipboard -Value \\"${escapedText}\\""`);
        } else if (platform === 'darwin') {
            // macOS: 使用 pbcopy
            await execPromise(`echo "${text.replace(/"/g, '\\"')}" | pbcopy`);
        } else {
            // Linux: 使用 xclip 或 xsel
            try {
                await execPromise(`echo "${text.replace(/"/g, '\\"')}" | xclip -selection clipboard`);
            } catch {
                await execPromise(`echo "${text.replace(/"/g, '\\"')}" | xsel --clipboard`);
            }
        }
        return true;
    } catch (error) {
        console.error('写入剪贴板失败:', error);
        return false;
    }
}

const HTML_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>发送到剪贴板</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            padding: 20px;
        }
        .container {
            flex: 1;
            display: flex;
            flex-direction: column;
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
        }
        .header {
            text-align: center;
            color: white;
            margin-bottom: 30px;
        }
        .header h1 {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 8px;
        }
        .header p {
            font-size: 14px;
            opacity: 0.9;
        }
        .card {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        .textarea-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            margin-bottom: 16px;
        }
        textarea {
            flex: 1;
            width: 100%;
            padding: 16px;
            border: 2px solid #e0e0e0;
            border-radius: 12px;
            font-size: 16px;
            font-family: inherit;
            resize: none;
            transition: border-color 0.3s;
            min-height: 200px;
        }
        textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .button-group {
            display: flex;
            gap: 12px;
        }
        button {
            flex: 1;
            padding: 16px;
            border: none;
            border-radius: 12px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }
        .btn-send {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-send:active {
            transform: scale(0.98);
        }
        .btn-clear {
            background: #f5f5f5;
            color: #666;
        }
        .btn-clear:active {
            background: #e0e0e0;
        }
        .toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            opacity: 0;
            transition: all 0.3s;
            z-index: 1000;
        }
        .toast.show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .toast.success {
            background: rgba(76, 175, 80, 0.9);
        }
        .toast.error {
            background: rgba(244, 67, 54, 0.9);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 发送到剪贴板</h1>
            <p>输入文本后点击发送</p>
        </div>
        <div class="card">
            <div class="textarea-wrapper">
                <textarea id="textInput" placeholder="在这里输入或粘贴文本..." autofocus></textarea>
            </div>
            <div class="button-group">
                <button class="btn-clear" onclick="clearText()">清空</button>
                <button class="btn-send" onclick="sendText()">发送</button>
            </div>
        </div>
    </div>
    <div id="toast" class="toast"></div>
    <script>
        const textInput = document.getElementById('textInput');
        const toast = document.getElementById('toast');
        function showToast(message, type = 'success') {
            toast.textContent = message;
            toast.className = 'toast show ' + type;
            setTimeout(() => { toast.className = 'toast'; }, 2000);
        }
        function clearText() {
            textInput.value = '';
            textInput.focus();
        }
        async function sendText() {
            const text = textInput.value.trim();
            if (!text) {
                showToast('请输入文本', 'error');
                return;
            }
            try {
                const response = await fetch('/api/clipboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                const result = await response.json();
                if (result.success) {
                    showToast('✓ 发送成功', 'success');
                    textInput.value = '';
                } else {
                    showToast('发送失败: ' + (result.error || '未知错误'), 'error');
                }
            } catch (error) {
                showToast('网络错误: ' + error.message, 'error');
            }
        }
        textInput.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                sendText();
            }
        });
    </script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML_PAGE);
    } else if (req.method === 'POST' && req.url === '/api/clipboard') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
            if (body.length > 1e6) {
                req.connection.destroy();
            }
        });

        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const text = data.text;

                if (!text || typeof text !== 'string') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '无效的文本' }));
                    return;
                }

                const success = await writeToClipboard(text);

                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: '写入剪贴板失败' }));
                }
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

server.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(JSON.stringify({
        status: 'running',
        ip: ip,
        port: PORT,
        url: `http://${ip}:${PORT}`
    }));
});

server.on('error', (error) => {
    console.error(JSON.stringify({
        status: 'error',
        error: error.message
    }));
    process.exit(1);
});
