let agents = require("./agents")
var ProgressBar = require('progressbar.js/src/main')

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

var KulmiPay = function (obj) {
    let self = this
    obj = obj || {}
    this._btnElement = Object
    this._dataset = Object
    this._checkoutID = ""
    this._signature = ""
    this.version = VERSION
    this._publicAPIKey = obj.publicAPIKey
    this._redirectURL = obj.redirectURL
    this._live = obj.live || false
    this._element = obj.element || "kulmiPayButton"
    this.mode = obj.mode || "popup"
    this.inlineContainer = obj.inlineContainer || "checkoutElement"

    this._layout = obj.layout || 'tabs'
    this._methods = obj.methods || ["card", "mpesa"]
    this._styles = obj.styles || {
        componentBackgroundColor: "#F7FAFC",
        unselectedCardBackgroundColor: "#FFFFFF",
        selectedCardBackgroundColor: "#FFFFFF",
        selectedBorderColor: "2px solid #056BD5",
        unselectedBorderColor: "2px solid #A0AEC0",
        selectedFontColor: "#056BD5",
        unselectedFontColor: "#333333",
        selectedCardShadow: "0px 0px 7px rgba(5, 107, 213, 0.5)",
        unselectedCardShadow: "none",
        borderRadius: "10px",
        inputLabelColor: "#000000",
        inputTextColor: "#000",
        inputBackgroundColor: "#FFFFFF",
        inputBorderColor: "#CCCCCC",
        inputBorderRadius: "10px",
        ctaBgColor: "#056BD5",
        ctaFontColor: "#fff",
        fontFamily: "",
        fontWeight: "light",
    }

    this.is_mobile = agents.MobileCheck()
    this.is_ios = (/iPad|iPhone|iPod/.test(navigator.platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) && !window.MSStream

    this._showProcessing = function () {
        let isLoadIdt = document.createElement("isLoadIdt");
        isLoadIdt.id = "isLoadIdt"
        isLoadIdt.style.top = 0
        isLoadIdt.style.left = 0
        isLoadIdt.style.position = "fixed"
        document.body.appendChild(isLoadIdt);
        var line = new ProgressBar.Line('#isLoadIdt', {
            color: '#666',
            easing: 'easeInOut',
            strokeWidth: 1
        });
        line.animate(1);
    }

    this._hideProcessing = function () {
        let isLoadIdts = document.querySelectorAll('isLoadIdt');
        for (let x = 0; x < isLoadIdts.length; x++) {
            isLoadIdts[x].parentNode.removeChild(isLoadIdts[x]);
        }
    }

    this._createCheckoutRequest = function (payload) {
        let self = this
        payload.callback_url = this._redirectURL
        payload.public_key = this._publicAPIKey
        payload.host = window.location.protocol + "//" + window.location.host
        payload.is_mobile = this.is_mobile
        payload.is_ios = this.is_ios
        payload.version = this.version
        payload.mode = this.mode

        this._showProcessing()
        var requestURL = "https://sandbox.kulmipay.com/api/v1/checkout/"
        if (this._live) {
            requestURL = "https://app.kulmipay.com/api/v1/checkout/"
        }
        
        let myRequest = new Request(requestURL, { method: "POST", body: JSON.stringify(payload), headers: { "Content-type": "application/json; charset=UTF-8" } })
        fetch(myRequest)
            .then(response => response.json())
            .then(response => {
                self._checkoutID = response.id
                self._signature = response.signature

                self._layout = response.layout ? response.layout : self._layout
                self._methods = response.methods ? response.methods : self._methods
                self._styles = response.styles ? response.styles : self._styles

                if (self._checkoutID && self._signature) {
                    self._loadPaymentModal()
                } else {
                    self._hideProcessing()
                }
            })
            .catch(err => {
                alert("We experienced a problem while initiating your request. Please consider starting the payment process again. If this issue persist, please contact us at support@kulmipay.com")
                self._hideProcessing()
            });
    }

    this._clearElements = function () {
        let iframe = document.getElementById(IFRAME_ID);
        if (iframe) {
            iframe.parentNode.removeChild(iframe);
        }

        let modal = document.getElementById(MODAL_ELEMENT_ID);
        if (modal) {
            modal.parentNode.removeChild(modal);
        }
    }

    this._btnElement = document.getElementsByClassName(this._element)
    if (this._btnElement) {
        for (let i = 0; i < this._btnElement.length; ++i) {
            let btn = this._btnElement[i]
            btn.addEventListener('click', function () {
                let dataset = btn.dataset
                self._createCheckoutRequest(dataset)
            })
        }
    }

    this._loadPaymentModal = function () {
        try {
            if (this._checkoutID && this._signature) {
                if (this.mode === "popup") {
                    this._clearElements()
                    let modalContent = this._prepareModal()
                    if (!this.is_mobile) {
                        this._closeModalIcon(modalContent)
                    }
                    let iframe = this._prepareFrame(modalContent, this._checkoutID, this._signature, this._layout, this._methods, this._styles)
                    return iframe
                } else if (this.mode === "inline") {
                    var containerElem = document.getElementById(this.inlineContainer)
                    let iframe = this._prepareFrame(containerElem, this._checkoutID, this._signature, this._layout, this._methods, this._styles)
                    return iframe
                }
            }
        } catch (err) {
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
        } else {
            if (this.mode === "popup") {
                modalContent.style.width = "380px";
            }
        }
        modalContent.style.height = "100%";
        modalContent.style.margin = "auto"
        modalContent.style.display = "block"
        if (!this.is_mobile) {
            modalContent.style.paddingTop = "20px"
            modalContent.style.backgroundColor = "transparent"
        } else {
            modalContent.style.paddingTop = "0px"
            modalContent.style.backgroundColor = "#ffffff"
        }

        modal.appendChild(modalContent)
        return modalContent
    }

    this.onClose = function () {
        let self = this
        if (this.mode === "popup") {
            bindEvent(window, 'message', function (e) {
                if (e.origin === "https://checkout-sandbox.kulmipay.com" || e.origin === "https://checkout.kulmipay.com") {
                    if (e.data.message) {
                        if (e.data.message.identitier == 'kulmipay-close-modal-cdrtl') {
                            self.exitPay()
                        }
                    }
                }
            });
        }
    }

    this._closeModalIcon = function (modalContent) {
        let self = this
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

        icon.addEventListener('click', function () {
            self._clearElements()
        })
    }

    this._openInNewTab = function(url) {
        try {
            var newWindow = window.open(url, '_blank');
            if (newWindow) {
                newWindow.focus();
            } else {
                window.location.href = url;
            }
        } catch(err) {
            window.location.href = url;
        }
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
        
        // Make it work for Google Pay and Apple Pay in IOS
        let ifrm = document.createElement("iframe");
        if (this.is_ios) {
            let websdk_url = this._live
                ? "https://checkout.kulmipay.com/?" + params
                : "https://checkout-sandbox.kulmipay.com/?" + params
            this._openInNewTab(websdk_url)
            self._hideProcessing()
            return
        }

        if (this._live) {
            ifrm.setAttribute("src", "https://checkout.kulmipay.com/?" + params);
        } else {
            ifrm.setAttribute("src", "https://checkout-sandbox.kulmipay.com/?" + params);
        }
        ifrm.setAttribute("id", IFRAME_ID)
        ifrm.setAttribute("allow", "payment; clipboard-read; clipboard-write;")
        ifrm.setAttribute("sandbox", "allow-scripts allow-popups allow-same-origin allow-forms")
        ifrm.style.width = "100%";
        if (!this.is_mobile) {
            ifrm.style.height = "100%";
        } else {
            ifrm.style.height = "100vh";
        }
        ifrm.style.border = 0;
        ifrm.frameborder = 0;
        ifrm.style.borderRadius = "0.25rem";

        ifrm.scrolling = "no";
        ifrm.onload = function () {
            self._hideProcessing()
        }

        parentContainer.appendChild(ifrm)
        return ifrm
    }

    this._eventListener = function (eventName, callback) {
        bindEvent(window, 'message', function (e) {
            if (e.origin === "https://checkout-sandbox.kulmipay.com" || e.origin === "https://checkout.kulmipay.com") {
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
    if (self._redirectURL) {
        this.on("COMPLETE", () => {
            window.location.href = self._redirectURL
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

window.KulmiPay = KulmiPay;
module.exports = KulmiPay;