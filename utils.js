

export class Logger {
    static enable = true

    static log(message) {
        if (!this.enable) {
            return
        }
        chrome.runtime.sendMessage({
            type: 'log',
            data: message
        })
    }
}

export async function openOptions() {
    const optionsPath = "options/options.html";
    const optionsUrl = chrome.runtime.getURL(optionsPath);
    const tabs = await chrome.tabs.query({ url: optionsUrl });
    if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        chrome.tabs.create({ url: optionsUrl });
    }
}

export class Captcha {
    static fvCh() {
        var text = ""
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (var i = 0; i < 256; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length))
        }
        return text
    }

    static async fetch() {
        try {
            let fvCh = this.fvCh()
            let url = `https://configuredevice.com/vpn/client/captcha/captchaAsync.php?${fvCh}`
            let response = await fetch(url);
            if (response.ok) {
                await chrome.storage.local.set({
                    "fvCh": fvCh
                });
                return response.text()
            } else {
                let msg = "Captcha failed:" + response.status
                Logger.log(msg)
                throw Error(msg)
            }
        } catch (error) {
            Logger.log("Captcha error:" + error)
            throw error
        }
    }
}

export function fvpn(s) {
    return (s ? s : this).split('').map(function (_) {
        if (!_.match(/[A-Za-z]/)) return _;
        const c = Math.floor(_.charCodeAt(0) / 97);
        const k = (_.toLowerCase().charCodeAt(0) - 83) % 26 || 26;
        return String.fromCharCode(k + ((c === 0) ? 64 : 96));
    }).join('');
}

export class Account {
    static async login(username, password, captchaAnswer) {
        try {
            var nowTime = new Date().getTimezoneOffset();
            let url = `https://configuredevice.com/vpn/windows/proxy.php?tz=${nowTime}`;
            let z = username.length + password.length * 1087 + 2;
            let storage = await chrome.storage.local.get()
            let fvCh = storage.fvCh
            if (!fvCh) {
                throw Error("Account fetch error fvcn is null")
            }

            //console.log("ProxySettingStorage fetch fvCh = ", fvCh);
            let formData = new URLSearchParams();
            formData.append('z', z.toString());
            formData.append('username', username);
            formData.append('password', password);
            formData.append('ca', captchaAnswer);
            formData.append('fvCh', fvCh);

            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });

            let responseText = await response.text()
            if (responseText.includes("MESSAGE:")) {
                throw Error(responseText)
            }
            if (responseText == "BADCAPTCHA") {
                throw Error("Robot check failed")
            }
            if (responseText == "LOGOUT") {
                return responseText
            }
            if (responseText == "NOACCOUNT") {
                throw Error("Username / Password is incorrect or too many devices are logged in - delete a device at https://www.flowvpx.com/client")
            }

            let data = JSON.parse(responseText)
            Logger.log("Account fetch success: " + data)

            if (data.expires < (new Date() / 1000)) {
                throw Error("Account expired")
            }

            var d = new Date(0);
            d.setUTCSeconds(data.expires);
            let auth = {
                "user": username,
                "pass": fvpn(data.password),
                "raduser": data.raduser,
                "radpass": fvpn(data.radpass),
                "expirestime": data.expires,
                "expires": d.toLocaleDateString() + " " + d.toLocaleTimeString(),
                "enable": "y"
            }
            await chrome.storage.local.set({
                "auth": auth
            });
            return data
        } catch (error) {
            throw error;
        }
    }

    static async logout() {
        try {
            let url = `https://configuredevice.com/vpn/windows/proxy.php?logout&tz=0`;
            let storage = await chrome.storage.local.get()
            const formData = new URLSearchParams();
            formData.append("username", encodeURIComponent(storage?.auth?.user ?? ""));
            formData.append("password", encodeURIComponent(fvpn(storage?.auth?.pass ?? "")));
            formData.append("fvCh", encodeURIComponent(storage?.fvCh ?? ""));
            let response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString(),
            });

            let auth = {
                "user": "",
                "pass": "",
                "raduser": "",
                "radpass": "",
                "expirestime": "",
                "expires": "",
                "enable": ""
            }
            await chrome.storage.local.set({
                "auth": auth,
                "proxyServers": null
            });
            return await response.text()
        } catch (error) {
            throw error;
        }
    }
}

export class Servers {
    /*  EX response
        Argentina,ar.flow.host,Argentina,-37.1575,-64.3165
        Armenia,dc1.am.flow.host,Armenia,44.503,40.177
        Armenia 21,dc21.am.flow.host,Armenia,44.503,43.177
        Australia 1,au.flow.host,Australia,-25.0479,142.003
        Australia 3,dc2.au.flow.host,Australia,-25.0479,126.003
        Austria,at.flow.host,Austria,47.5162,14.55
        Azerbaijan,az.flow.host,Azerbaijan,40.4093,49.8671
        Azerbaijan 2,dc2.az.flow.host,Azerbaijan,40.4093,51.8671
    */

    static async fetch() {
        try {
            let storage = await chrome.storage.local.get()
            let fvCh = storage.fvCh
            let url = `https://ssl3cdn.com/vpn/getProxyServers.php?proxy=proxy&bid=${fvCh}`
            let response = await fetch(url, {
                method: 'POST'
            });
            // console.log("Request Method:", "POST"); 
            // console.log("Request URL:", response.url);
            // console.log("Request Headers:", [...response.headers.entries()]);
            let resopnseText = await response.text()
            // console.log("result:", atob(resopnseText))
            const headers = ["node", "host", "region", "longitude", "latitude"]
            let proxies = atob(resopnseText)
                .split('\n')
                .filter(item => item.trim() !== "")
                .map(line => {
                    let values = line.split(',')
                    return headers.reduce((obj, key, idx) => {
                        var value = values[idx] ?? ""
                        if (key == "host") {
                           /*
                            * v.host -> v.host 
                            * a.v.host -> a.v.host
                            * a.v.e.host -> a-v.e.host
                            * a.v.e.d.host -> a-v.e.d.host
                            */
                            const dotsCount = value.split('.').length - 1
                            value = dotsCount > 2 ? value.replace('.', '-') : value
                        }
                        obj[key] = value
                        obj.port = 110
                        return obj
                    }, {})
                })
            // Logger.log("Servers fetch:")
            // Logger.log(proxies)
            await chrome.storage.local.set({
                "proxyServers": proxies
            });
            return proxies
        } catch (error) {
            // console.log("Fetch Error", error);
            throw error
        }
    }
}

export const ProxySetting = {
    system: () => ({
        type: "system",
        proxy: {
            value: {
                mode: "system"
            },
            scope: 'regular'
        }
    }),
    direct: () => ({
        type: "direct",
        proxy: {
            value: {
                mode: 'direct'
            },
            scope: "regular"
        }
    }),
    pacProxy: (scriptURL) => ({
        type: 'pac_script',
        proxy: {
            value: {
                mode: 'pac_script',
                pacScript: {
                    url: scriptURL
                }
            },
            scope: 'regular'
        }
    }),
    fixedServers: (host, port) => ({
        type: 'fixed_servers',
        proxy: {
            value: {
                mode: 'fixed_servers',
                rules: {
                    singleProxy: {
                        scheme: 'https',
                        host: host,
                        port: port
                    },
                    bypassList: ["<local>", "192.168.0.0/16", "172.16.0.0/12", "169.254.0.0/16", "10.0.0.0/8"]
                }
            },
            scope: 'regular'
        }
    }),
}

export class Proxy {
    static set(proxySetting) {
        Logger.log("Proxy set:")
        Logger.log(proxySetting)
        chrome.proxy.settings.set(
            proxySetting.proxy,
            function () {
                Proxy.logProxy()
            }
        )
    }

    static logProxy() {
        chrome.proxy.settings.get(
            { incognito: false },
            config => {
                Logger.log("Proxy config ----")
                Logger.log(config)
            }
        )
    }
}