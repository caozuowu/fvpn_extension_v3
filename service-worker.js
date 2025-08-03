
import { openOptions, Proxy, ProxySetting } from "./utils.js"

String.prototype.proxyStatusIcon = function () {
    if (this == "direct" || this == "system" || this == "" || this == undefined) {
        return "/images/off.png"
    } else {
        return "/images/on.png"
    }
}

chrome.runtime.onInstalled.addListener(async () => {
    try {
        openOptions()
    } catch (error) {
        console.log(error)
    }
})

chrome.commands.onCommand.addListener(async function (command) {
    if (command == 'open-option') {
        try {
            openOptions()
        } catch (error) {
            console.log(error)
        }
    }
})

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === 'log') {
        console.log('[Logger]', request.data)
    } else if (request.type === 'setProxy') {
        let proxySetting = request.data
        Proxy.set(proxySetting)
        let proxyType = proxySetting.proxy?.value?.mode ?? ""
        await setOnAuthRequiredListener()
        chrome.action.setIcon({
            path: proxyType.proxyStatusIcon()
        })
    }
});

chrome.runtime.onStartup.addListener(async () => {
    await setOnAuthRequiredListener()
    chrome.proxy.settings.get(
        { incognito: false },
        proxySetting => {
            let proxyType = proxySetting?.value?.mode ?? ""
            chrome.action.setIcon({
                path: proxyType.proxyStatusIcon()
            })
        }
    )
});

async function setOnAuthRequiredListener() {
    let storage = await chrome.storage.local.get()
    let raduser = storage.auth?.raduser ?? ""
    let radpass = storage.auth?.radpass ?? ""
    console.log("setOnAuthRequiredListener ----- ")
    console.log(raduser)
    console.log(radpass)
    function createAuthCallback(user, pass) {
        return function (details) {
            console.log("onAuthRequiredCallback --- " + details.url);
            return {
                authCredentials: {
                    username: user,
                    password: pass
                }
            };
        };
    }

    chrome.webRequest.onAuthRequired.addListener(
        createAuthCallback(raduser, radpass),
        { urls: ["<all_urls>"] },
        ['blocking']
    );
}

chrome.runtime.onSuspend.addListener(() => {
    Proxy.set(ProxySetting.system())
});

console.log("VPN Extension loaded");
