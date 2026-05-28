const agents = require("./agents")
const ProgressBar = require('progressbar.js/src/main')

function bindEvent(element, eventName, eventHandler) {
    if (element.addEventListener) {
        element.addEventListener(eventName, eventHandler, false);
    } else if (element.attachEvent) {
        element.attachEvent('on' + eventName, eventHandler);
    }
}

const VERSION = "4"
const IFRAME_ID = "KULMI-WEBSDK-POPUP-IFRAME-" + VERSION
const MODAL_ELEMENT_ID = "KULMI-WEBSDK-MODAL-" + VERSION
const SANDBOX_API_URL = "https://sandbox.kulmipay.com/api/v1/checkout/"
const LIVE_API_URL = "https://app.kulmipay.com/api/v1/checkout/"
const SANDBOX_CHECKOUT_URL = "https://checkout-sandbox.kulmipay.com"
const LIVE_CHECKOUT_URL = "https://checkout.kulmipay.com"

function trimTrailingSlash(value) {
    return String(value || "").replace(/\/+$/, "")
}

function checkoutApiURLFromBase(baseURL) {
    let normalized = trimTrailingSlash(baseURL)
    if (normalized) {
        if (normalized.endsWith("/api/v1/checkout") || normalized.endsWith("/checkout")) {
            return normalized + "/"
        }
        if (normalized.endsWith("/api/v1")) {
            return normalized + "/checkout/"
        }
        return normalized + "/api/v1/checkout/"
    }
    return ""
}

const KulmiPay = function (obj) {
    obj = obj || {}
    this._btnElement = Object
    this._dataset = Object
    this._checkoutID = ""
    this._signature = ""
    this.version = VERSION
    this._publicAPIKey = obj.publicAPIKey
    this._redirectURL = obj.redirectURL
    this._live = obj.live || false
    this._apiBaseURL = obj.apiBaseURL || obj.baseURL
    this._checkoutAPIURL = obj.checkoutAPIURL || obj.checkoutApiURL
    this._checkoutBaseURL = obj.checkoutBaseURL || obj.websdkBaseURL || obj.webSDKBaseURL
    this._element = obj.element || "kulmiPayButton"
    this.mode = obj.mode || "popup"
    this.inlineContainer = obj.inlineContainer || "checkoutElement"

    this._layout = obj.layout || 'tabs'
    this._methods = obj.methods || ["mpesa", "pesalink"]
    this._styles = obj.styles || {
        componentBackgroundColor: "#FFF7F0",
        unselectedCardBackgroundColor: "#FFFFFF",
        selectedCardBackgroundColor: "#FFFFFF",
        selectedBorderColor: "2px solid #F56E0F",
        unselectedBorderColor: "2px solid #F0EBE6",
        selectedFontColor: "#F56E0F",
        unselectedFontColor: "#1A1A2E",
        selectedCardShadow: "0px 0px 7px rgba(245, 110, 15, 0.25)",
        unselectedCardShadow: "none",
        borderRadius: "10px",
        inputLabelColor: "#1A1A2E",
        inputTextColor: "#1A1A2E",
        inputBackgroundColor: "#FFFFFF",
        inputBorderColor: "#F0EBE6",
        inputBorderRadius: "10px",
        ctaBgColor: "#F56E0F",
        ctaFontColor: "#fff",
        fontFamily: "",
        fontWeight: "light",
    }

    this.is_mobile = agents.MobileCheck()
    this.is_ios = (/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !globalThis.MSStream

    this._showProcessing = function () {
        let isLoadIdt = document.createElement("isLoadIdt");
        isLoadIdt.id = "isLoadIdt"
        isLoadIdt.style.top = 0
        isLoadIdt.style.left = 0
        isLoadIdt.style.position = "fixed"
        document.body.appendChild(isLoadIdt);
        const line = new ProgressBar.Line('#isLoadIdt', {
            color: '#666',
            easing: 'easeInOut',
            strokeWidth: 1
        });
        line.animate(1);
    }

    this._hideProcessing = function () {
        const isLoadIdts = document.querySelectorAll('isLoadIdt');
        for (const isLoadIdt of isLoadIdts) {
            isLoadIdt.remove();
        }
    }

    this._createCheckoutRequest = function (payload) {
        payload = { ...payload }
        payload.callback_url = this._redirectURL
        payload.redirect_url = this._redirectURL
        payload.public_key = this._publicAPIKey
        payload.host = globalThis.location.protocol + "//" + globalThis.location.host
        payload.is_mobile = this.is_mobile
        payload.is_ios = this.is_ios
        payload.version = this.version
        payload.mode = this.mode

        this._showProcessing()
        let requestURL = this._checkoutAPIURL || checkoutApiURLFromBase(this._apiBaseURL)
        requestURL = requestURL || (this._live ? LIVE_API_URL : SANDBOX_API_URL)
        
        let myRequest = new Request(requestURL, { method: "POST", body: JSON.stringify(payload), headers: { "Content-type": "application/json; charset=UTF-8" } })
        fetch(myRequest)
            .then(response => response.json())
            .then(response => {
                this._checkoutID = response.id
                this._signature = response.signature

                this._layout = response.layout ? response.layout : this._layout
                this._methods = response.methods ? response.methods : this._methods
                this._styles = response.styles ? response.styles : this._styles

                if (this._checkoutID && this._signature) {
                    this._loadPaymentModal()
                } else {
                    this._hideProcessing()
                }
            })
            .catch(() => {
                alert("We experienced a problem while initiating your request. Please consider starting the payment process again. If this issue persist, please contact us at support@kulmipay.com")
                this._hideProcessing()
            });
    }

    this._clearElements = function () {
        let iframe = document.getElementById(IFRAME_ID);
        if (iframe) {
            iframe.remove();
        }

        let modal = document.getElementById(MODAL_ELEMENT_ID);
        if (modal) {
            modal.remove();
        }
    }

    this._btnElement = document.getElementsByClassName(this._element)
    if (this._btnElement) {
        for (const btn of this._btnElement) {
            btn.addEventListener('click', () => {
                let dataset = btn.dataset
                this._createCheckoutRequest(dataset)
            })
        }
    }

    this._loadPaymentModal = function () {
        try {
            if (this._checkoutID && this._signature) {
                if (this.mode === "popup") {
                    this._clearElements()
                    let modalContent = this._prepareModal()
                    if (this.is_mobile === false) {
                        this._closeModalIcon(modalContent)
                    }
                    let iframe = this._prepareFrame(modalContent, this._checkoutID, this._signature, this._layout, this._methods, this._styles)
                    return iframe
                } else if (this.mode === "inline") {
                    const containerElem = document.getElementById(this.inlineContainer)
                    let iframe = this._prepareFrame(containerElem, this._checkoutID, this._signature, this._layout, this._methods, this._styles)
                    return iframe
                }
            }
        } catch (err) {
            if (globalThis.console) {
                globalThis.console.error(err)
            }
            this._hideProcessing()
        }
    }

    this._prepareModal = function () {
        let modal = document.createElement("modal");
        modal.setAttribute("id", MODAL_ELEMENT_ID)
        if (this.mode === "popup") {
            modal.style.display = "flex"
            modal.style.position = "fixed"
            modal.style.zIndex = 1200
            modal.style.left = 0
            modal.style.top = 0
            modal.style.width = "100%"
            modal.style.height = "100%"
            modal.style.overflow = "auto"
            modal.style.backgroundColor = "rgb(0,0,0)"
            modal.style.backgroundColor = "rgba(0,0,0,0.7)"
        }
        document.body.appendChild(modal);

        let modalContent = document.createElement("modal-content")
        if (this.is_mobile) {
            modalContent.style.width = "100%";
        } else if (this.mode === "popup") {
            modalContent.style.width = "380px";
        }
        modalContent.style.height = "100%";
        modalContent.style.margin = "auto"
        modalContent.style.display = "block"
        if (this.is_mobile) {
            modalContent.style.paddingTop = "0px"
            modalContent.style.backgroundColor = "#ffffff"
        } else {
            modalContent.style.paddingTop = "20px"
            modalContent.style.backgroundColor = "transparent"
        }

        modal.appendChild(modalContent)
        return modalContent
    }

    this._isAllowedCheckoutOrigin = function (origin) {
        if (origin === SANDBOX_CHECKOUT_URL || origin === LIVE_CHECKOUT_URL) {
            return true
        }
        if (this._checkoutBaseURL) {
            const checkoutBaseURL = trimTrailingSlash(this._checkoutBaseURL)
            if (/^[a-z][a-z\d+.-]*:\/\//i.test(checkoutBaseURL)) {
                return origin === new URL(checkoutBaseURL).origin
            }
            return origin === checkoutBaseURL
        }
        return false
    }

    this.onClose = function () {
        if (this.mode === "popup") {
            bindEvent(globalThis, 'message', e => {
                if (this._isAllowedCheckoutOrigin(e.origin)) {
                    if (e.data.message) {
                        if (e.data.message.identitier == 'kulmipay-close-modal-cdrtl') {
                            this.exitPay()
                        }
                    }
                }
            });
        }
    }

    this._closeModalIcon = function (modalContent) {
        let iconHolder = document.createElement("div")
        let icon = document.createElement("div")
        icon.innerHTML = this._closeIconSVG()
        icon.style.cursor = "pointer"
        icon.style.right = "-32px"
        icon.style.bottom = "-32px"
        icon.style.position = "absolute"
        iconHolder.style.position = "relative"
        iconHolder.style.display = "block"
        iconHolder.style.height = "10px"
        iconHolder.style.zIndex = 1250
        iconHolder.appendChild(icon)
        modalContent.appendChild(iconHolder)

        icon.addEventListener('click', () => {
            this._clearElements()
        })
    }

    this._openInNewTab = function(url) {
        try {
            const newWindow = globalThis.open(url, '_blank');
            if (newWindow) {
                newWindow.focus();
            } else {
                globalThis.location.href = url;
            }
        } catch(err) {
            if (globalThis.console) {
                globalThis.console.warn(err)
            }
            globalThis.location.href = url;
        }
    }

    this._getCheckoutBaseURL = function () {
        if (this._checkoutBaseURL) {
            return trimTrailingSlash(this._checkoutBaseURL)
        }
        return this._live ? LIVE_CHECKOUT_URL : SANDBOX_CHECKOUT_URL
    }

    this._prepareFrame = function (parentContainer, checkoutID, signature, layout, methods, styles) {
        let data = {
            "checkout_id": checkoutID,
            "signature": signature,
            "layout": layout,
            "methods": methods,
            "styles": styles
        }
        let encoded = btoa(JSON.stringify(data))
        let payload = {
            "checkout": encoded,
            "is_mobile": this.is_mobile,
            "is_ios": this.is_ios
        }
        let params = new URLSearchParams(payload).toString()
        
        let ifrm = document.createElement("iframe");
        let websdk_url = this._getCheckoutBaseURL() + "/?" + params
        if (this.is_ios) {
            this._openInNewTab(websdk_url)
            this._hideProcessing()
            return
        }

        ifrm.setAttribute("src", websdk_url);
        ifrm.setAttribute("id", IFRAME_ID)
        ifrm.setAttribute("allow", "payment; clipboard-read; clipboard-write;")
        ifrm.setAttribute("sandbox", "allow-scripts allow-popups allow-same-origin allow-forms")
        ifrm.style.width = "100%";
        if (this.is_mobile) {
            ifrm.style.height = "100vh";
        } else {
            ifrm.style.height = "100%";
        }
        ifrm.style.border = 0;
        ifrm.frameborder = 0;
        ifrm.style.borderRadius = "0.25rem";

        ifrm.style.overflow = "hidden";
        ifrm.onload = () => {
            this._hideProcessing()
        }

        parentContainer.appendChild(ifrm)
        return ifrm
    }

    this._eventListener = function (eventName, callback) {
        bindEvent(globalThis, 'message', e => {
            if (this._isAllowedCheckoutOrigin(e.origin)) {
                if (e.data.message) {
                    if (e.data.message.identitier == 'kulmipay-status-update-cdrtl') {
                        if (e.data.message.state === eventName) {
                            callback(e.data.message)
                        }
                    }
                }

            }
        });
        return this
    }

    this._closeIconSVG = function () {
        return `<svg xmlns="https://www.w3.org/2000/svg" xmlns:xlink="https://www.w3.org/1999/xlink" width="54" height="54" viewBox="0 0 60 60">
        <defs>
          <filter id="Ellipse_11" x="0" y="0" width="60" height="60" filterUnits="userSpaceOnUse">
            <feOffset dy="3" input="SourceAlpha"/>
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feFlood flood-color="#6b6b6b" flood-opacity="0.157"/>
            <feComposite operator="in" in2="blur"/>
            <feComposite in="SourceGraphic"/>
          </filter>
        </defs>
        <g id="Group_142" data-name="Group 142" transform="translate(-1178 -327)">
          <g transform="matrix(1, 0, 0, 1, 1178, 327)" filter="url(#Ellipse_11)">
            <circle id="Ellipse_11-2" data-name="Ellipse 11" cx="21" cy="21" r="21" transform="translate(9 6)" fill="#fff"/>
          </g>
          <g id="x-circle" transform="translate(1196 342)">
            <circle id="Ellipse_12" data-name="Ellipse 12" cx="10" cy="10" r="10" transform="translate(2 2)" fill="none" stroke="#414141" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            <line id="Line_3" data-name="Line 3" x1="6" y2="6" transform="translate(9 9)" fill="none" stroke="#414141" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
            <line id="Line_4" data-name="Line 4" x2="6" y2="6" transform="translate(9 9)" fill="none" stroke="#414141" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </g>
        </g>
      </svg>`
    }


    // Define default events
    this.onClose()
    this.on = this._eventListener;
    if (this._redirectURL) {
        this.on("COMPLETE", () => {
            globalThis.location.href = this._redirectURL
        })
    }

    this.exitPay = function () {
        this._clearElements()
    }

    this.run = function (obj) {
        this._createCheckoutRequest(obj)
        return this
    }

    this.continue = function (payload) {
        this._checkoutID = payload.checkoutID
        this._signature = payload.signature
        this._live = payload.live || false
        this._showProcessing()
        this._loadPaymentModal()
        return this
    }
    return this
}

globalThis.KulmiPay = KulmiPay;
module.exports = KulmiPay;
