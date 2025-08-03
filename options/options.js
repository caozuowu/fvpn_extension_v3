import { Captcha, Account, Proxy, Servers, ProxySetting } from "../utils.js"

async function reload() {
    let storage = await chrome.storage.local.get()
    //console.log(storage)
    let auth = storage.auth
    $('#username').val(auth?.user ?? "");
    $('#username2').val(auth?.user ?? "");
    $('#password').val(auth?.pass ?? "");
    $('#expires').val(auth?.expires ?? "");
    
    var seconds = new Date() / 1000;
    if (typeof auth?.raduser === "undefined" ||
        typeof auth?.expires === "undefined" ||
        auth?.expires < seconds) {
        $('#accountinfo').hide();
        $('#login').show();
        showCaptcha()
    } else {
        $('#accountinfo').show();
        $('#login').hide();
    }
}

async function showCaptcha() {
    function changeBgColor(selectedAnswer) {
        var i = 0;
        while (i < 10) {
            var answer = document.getElementById('captcha' + i);
            if (answer.id == selectedAnswer) {
                answer.style.backgroundColor = '#ccc';
            } else {
                answer.style.backgroundColor = 'white';
            }
            i++;
        }
    }

    $('#loading').fadeIn();
    let captchaResult = await Captcha.fetch()
    //console.log("loaded captchaHtml result ----- ")
    //console.log(captchaHtml)
    if (typeof captchaResult != Error) {
        $('#captcha').html(captchaResult)
        $('#loading').fadeOut();
        jQuery("img.captchaAnswer").click(function () {
            var answer = jQuery(this).data('answer');
            jQuery('#captchaAnswer').val(answer);
            changeBgColor(this.id);
            return false;
        });
    } else {
        alert(captchaResult)
    }
}

document.addEventListener('DOMContentLoaded', function () {
    $('#signup').click(async function () {
        try {
            $('#loading').fadeIn();
            let loginResult = await Account.login(
                $('#username').val(),
                $('#password').val(),
                $('#captchaAnswer').val()
            )
            $('#loading').fadeOut();
            if (loginResult == "") {
                alert("Account.login return LOGOUT")
            } else {
                reload()
            }
        } catch (error) {
            alert(error)
        }

    });

    $('#logout').click(async function() {
        try {
            let logoutResult = await Account.logout()
            $('#loading').fadeOut();
            console.log("logout")
            reload()
            Proxy.set(ProxySetting.system())
        } catch (error) {
            alert(error)
        }
    });
});

try {
    reload()
    Servers.fetch()
    // let storage = await chrome.storage.local.get()
    // console.log(storage)
} catch (error) {
    alert(error)
}
