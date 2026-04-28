const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

class SycaclipRemoteServer {
    constructor() {
        this.server = null;
        this.port = 0;
        this.clipboardAPI = null;
    }

    getLocalIP() {
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

    async start(port, clipboardAPI, pluginPath) {
        if (this.server) {
            await this.stop();
        }

        this.port = port || 8765;
        this.clipboardAPI = clipboardAPI;

        return new Promise((resolve, reject) => {
            this.server = http.createServer(async (req, res) => {
                // CORS 头
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }

                // 路由处理
                if (req.method === 'GET' && req.url === '/') {
                    // 返回手机端网页
                    const htmlPath = path.join(pluginPath, 'remote.html');
                    try {
                        const html = fs.readFileSync(htmlPath, 'utf-8');
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                        res.end(html);
                    } catch (error) {
                        res.writeHead(404);
                        res.end('Page not found');
                    }
                } else if (req.method === 'POST' && req.url === '/api/clipboard') {
                    // 接收剪贴板内容
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
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

                            // 写入剪贴板
                            await this.clipboardAPI.writeText(text);

                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true }));
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

            this.server.on('error', (error) => {
                console.error('[SycaclipRemote] 服务器错误:', error);
                reject(error);
            });

            this.server.listen(this.port, '0.0.0.0', () => {
                const ip = this.getLocalIP();
                console.log(`[SycaclipRemote] 服务已启动: http://${ip}:${this.port}`);
                resolve({ ip, port: this.port });
            });
        });
    }

    async stop() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    console.log('[SycaclipRemote] 服务已停止');
                    this.server = null;
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getInfo() {
        if (!this.server) {
            return null;
        }
        return {
            ip: this.getLocalIP(),
            port: this.port,
            url: `http://${this.getLocalIP()}:${this.port}`
        };
    }
}

module.exports = new SycaclipRemoteServer();
