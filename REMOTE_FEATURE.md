# Sycaclip 局域网接收功能

## 功能说明

Sycaclip 现在支持从手机发送文本到电脑剪贴板！

## 使用步骤

### 1. 启用 HTTP 服务

在 ZTools 设置中：
1. 打开「设置」→「HTTP 服务」
2. 开启「启用 HTTP 服务」
3. **重要**：开启「允许局域网访问」选项

### 2. 在 Sycaclip 中查看访问地址

1. 打开 Sycaclip 插件
2. 切换到「远程」标签页
3. 查看显示的访问地址和二维码

### 3. 手机访问

方式一：扫描二维码（推荐）
- 使用手机浏览器扫描二维码

方式二：手动输入地址
- 在手机浏览器中输入显示的地址（例如：`http://192.168.1.100:36578/remote`）

### 4. 发送文本

1. 在手机网页中输入或粘贴文本
2. 点击「发送」按钮
3. 文本会立即出现在电脑剪贴板中

## 技术实现

### 主程序修改（SycaTools）

1. **httpServer.ts**
   - 添加 `allowLAN` 配置选项
   - 支持监听 `0.0.0.0` 以接受局域网连接
   - 新增 `/remote` 路由返回手机端网页
   - 新增 `/api/clipboard/receive` 接口接收剪贴板内容
   - 添加 `getLocalIP()` 和 `getServerInfo()` 方法

2. **pluginHttpServerAPI.ts**（新增）
   - 暴露 `http:getConfig` 和 `http:getServerInfo` 接口给插件

### 插件修改（sycaclip-dev）

1. **constants/index.js**
   - 添加「远程」标签页定义

2. **components/RemoteReceiver.vue**（新增）
   - 显示访问地址和二维码
   - 实时检查 HTTP 服务器状态
   - 提供复制地址功能

3. **App.vue**
   - 集成 RemoteReceiver 组件
   - 在「远程」标签页显示远程接收界面

4. **public/preload.js**
   - 添加 `window.ztools.remote` API
   - 提供 `getHttpConfig()` 和 `getHttpServerInfo()` 方法

## 安全说明

- HTTP 服务需要 API 密钥认证
- 手机端网页会自动包含 API 密钥
- 仅在局域网内可访问，不会暴露到公网
- 建议仅在可信网络环境下使用

## 注意事项

1. 确保电脑和手机在同一局域网内
2. 某些防火墙可能会阻止连接，需要允许 ZTools 通过防火墙
3. 如果无法连接，检查：
   - HTTP 服务是否已启动
   - 「允许局域网访问」是否已开启
   - 防火墙设置
   - 网络连接状态

## 开发说明

### 构建插件

```bash
cd /j/software/ztools/ZTools-plugins-2026.03.23.1338/plugins/sycaclip-dev
npm install
npm run build
```

### 开发模式

```bash
npm run dev
```

然后在 ZTools 中加载开发版插件（使用 `http://localhost:5179/`）。

## 未来改进

- [ ] 添加真正的二维码生成（需要 qrcode 库）
- [ ] 支持发送图片
- [ ] 支持发送文件
- [ ] 添加历史记录
- [ ] 支持多设备同时连接
