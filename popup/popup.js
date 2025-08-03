import { Logger, Proxy, ProxySetting, Servers, openOptions, fvpn } from "../utils.js"

function logToBackground(message) {
    chrome.runtime.sendMessage({
        type: 'log',
        data: message
    })
}

// document.getElementById('myButton')?.addEventListener('click', () => {
//     console.log("chrome.proxy.settings")
//     alert('clicked1');
//     var config = {
//         mode: 'fixed_servers',
//         rules: {
//             bypassList: ["<local>", "192.168.0.0/16", "172.16.0.0/12", "169.254.0.0/16", "10.0.0.0/8"],
//             singleProxy: {
//                 scheme: 'https',
//                 host: "dc1.hk.flow.host",
//                 port: 110
//             }
//         }
//     };
//     chrome.proxy.settings.set(
//         { 
//             value: config,
//             scope: 'regular' 
//         },
//         function () { 

//         }
//     );
// });

async function drawProxyList(hard = false) {
    try {
        $("#loadingPopup").show()
        var storage = await chrome.storage.local.get()
        var proxyServers = []
        if (!hard) {
            proxyServers = storage.proxyServers ?? await Servers.fetch()
        } else {
            proxyServers = await Servers.fetch()
        }
        $("#loadingPopup").hide()
        $(".fromServer").remove()
        $.each(proxyServers, function (i, item) {
            let image = item.region.split(" ").join("-")
            let host = item.host
            let id = item.host.split(".").join("-")
            let name = item.node
            let port = item.port
            $("#proxyServers").append(
                `<li class="fProxy fromServer" 
                    id="${id}" 
                    data-proxy-host = "${host}"
                    data-proxy-port="${port}" 
                    data-proxy-type="fixed_servers">
                  <div style="float: left;">
                    <img height="18" src="/images/countryflags/${image}.png" />
                  </div>
                  ${name}
                </li>`
            )
        })
    } catch (error) {
        alert(error)
    }
}

async function proxySelected(selectedId) {
    let element = $('#' + selectedId)
    if (element.html().length > 200) {
        return
    }
    $('li').removeClass('selected');
    $('.selected').removeClass('selected');
    element.removeClass('selected')
    if (selectedId == "reload") {
        drawProxyList(true)
        return
    }

    element.addClass('selected')
    var currentHtml = ""
    var proxySetting = null
    if(selectedId == "pac-script") {
        proxySetting = ProxySetting.pacProxy("")
    } else if (selectedId == "direct") {
        proxySetting = ProxySetting.direct()
        currentHtml = "<div style='border-bottom: 2px solid #3399cc; margin: 0px; padding: 0px; padding-bottom: 14px; padding-top: 4px;'><img style='vertical-align:middle ; height: 32px; float:left; padding-left: 4px;' src='../images/circle_shield_on.png' /><div style='padding-top: 6px;'> &nbsp;FlowVPN Active</div></div>"
    } else if (selectedId == "system") {
        proxySetting = ProxySetting.system()
        currentHtml = "<div style='border-bottom: 2px solid #3399cc; margin: 0px; padding: 0px; padding-bottom: 14px; padding-top: 4px;'><img style='vertical-align:middle ; height: 32px; float:left; padding-left: 4px;' src='../images/circle_shield_on.png' /><div style='padding-top: 6px;'> &nbsp;FlowVPN Active</div></div>"
    } else if (element.data("proxy-type") == "fixed_servers") {
        var host = element.data("proxy-host")
        let port = element.data("proxy-port")
        proxySetting = ProxySetting.fixedServers(host, port)
    }

    if (proxySetting) {
        $("#currentProxy").html(currentHtml)
        let storage = await chrome.storage.local.get()
        chrome.runtime.sendMessage({
            type: 'setProxy', 
            data: {
                proxySetting: proxySetting,
                raduser: storage.auth?.raduser ?? "",
                radpass: fvpn(storage.auth?.radpass ?? "")
            }
        })
    }
}

function selectIdFor(proxySetting) {
    let mode = proxySetting?.proxy?.value?.mode
    if (mode == "fixed_servers" ) {
        var host = proxySetting?.proxy?.value?.rules?.singleProxy?.host ?? ""
        return host.split(".").join("-")
    } else {
        return mode
    }
}

(async function onLoad() {
    try {
        let storage = await chrome.storage.local.get()
        let auth = storage.auth
        var seconds = new Date() / 1000;
        if (typeof auth?.raduser === "undefined" ||
            typeof auth?.expires === "undefined" ||
            auth?.expires < seconds) {
            Proxy.set(ProxySetting.system())
            openOptions()
        } else {
            $('#fvLogo').on('click', openOptions)
            $('#openOptions').on('click', openOptions)
            $('#proxyServers').on('click', function (event) {
                var obj = event.target || event.srcElement
                let selectId = obj?.id
                if (!selectId) {
                    return
                }
                proxySelected(selectId)
            })

            await drawProxyList()
            let storage = await chrome.storage.local.get()
            let selectId = selectIdFor(storage.proxySetting)
            proxySelected(selectId)

            $('[data-i18n-content]').each(function () {
                var message = chrome.i18n.getMessage(this.getAttribute('data-i18n-content'));
                if (message)
                    $(this).html(message);
            });
            logToBackground("popup show")
        }
    } catch (error) {
        alert(error)
    }
})()