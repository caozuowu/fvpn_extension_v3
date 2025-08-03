
import { openOptions, Servers, Proxy, ProxySetting, Logger, fvpn, Account } from "./utils.js"

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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'log') {
        console.log('[Logger]', request.data)
    } else if (request.type === 'setProxy') {
        setProxy(
            request.data.proxySetting,
            request.data.raduser,
            request.data.radpass
        )
    }
});

chrome.runtime.onSuspend.addListener(() => {
    // if (!isSavingData) {
    //   isSavingData = true;
    //   chrome.storage.local.set({ 
    //     lastCloseTime: new Date().toISOString(),
    //   }).then(() => {
    //     console.log('Data saved before suspension');
    //   });
    // }
});

chrome.runtime.onStartup.addListener(async () => {
    let storage = await chrome.storage.local.get()
    setProxy(
        storage.proxySetting,
        storage.auth?.raduser ?? "",
        fvpn(storage.auth?.radpass ?? "")
    )
});

function setProxy(proxySetting, raduser, radpass) {
    console.log("setProxy ----- ")
    console.log(proxySetting)
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

    if (proxySetting) {
        Proxy.set(proxySetting)
    }
    chrome.webRequest.onAuthRequired.addListener(
        createAuthCallback(raduser, radpass),
        { urls: ["<all_urls>"] },
        ['blocking']
    );
}

try {
    console.log("VPN Extension loaded");
} catch (error) {
    console.log(error)
}
