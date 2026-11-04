const assert = require("node:assert/strict")
const Module = require("node:module")
const test = require("node:test")

function createElement(tagName) {
    return {
        tagName,
        style: {},
        attrs: {},
        children: [],
        parentNode: {},
        remove() {
            if (this.parentNode?.children) {
                this.parentNode.children = this.parentNode.children.filter(child => child !== this)
            }
        },
        setAttribute(name, value) {
            this.attrs[name] = value
        },
        appendChild(child) {
            child.parentNode = this
            this.children.push(child)
        },
        addEventListener() {}
    }
}

function setupBrowserGlobals() {
    globalThis.__listeners = {}
    globalThis.navigator = {
        userAgent: "Mozilla/5.0",
        vendor: "",
        platform: "Win32",
        maxTouchPoints: 0
    }
    globalThis.location = {
        href: "https://merchant.example",
        protocol: "https:",
        host: "merchant.example"
    }
    globalThis.addEventListener = function (eventName, callback) {
        globalThis.__listeners[eventName] = globalThis.__listeners[eventName] || []
        globalThis.__listeners[eventName].push(callback)
    }
    globalThis.open = function () {
        return null
    }
    globalThis.window = {
        MSStream: false,
        location: globalThis.location,
        addEventListener: globalThis.addEventListener,
        open: globalThis.open
    }
    globalThis.document = {
        body: createElement("body"),
        createElement,
        getElementById() {
            return null
        },
        getElementsByClassName() {
            return []
        },
        querySelectorAll() {
            return []
        }
    }
}

function loadSDK() {
    setupBrowserGlobals()
    delete require.cache[require.resolve("../src/index")]
    const originalLoad = Module._load
    Module._load = function (request, parent, isMain) {
        if (request === "progressbar.js/src/main") {
            return {
                Line: function () {
                    return {
                        animate() {}
                    }
                }
            }
        }
        return originalLoad.call(this, request, parent, isMain)
    }
    try {
        return require("../src/index")
    } finally {
        Module._load = originalLoad
    }
}

test("checkout creation sends the backend redirect_url field", async () => {
    const KulmiPay = loadSDK()
    let capturedRequest

    globalThis.fetch = async request => {
        capturedRequest = request
        return {
            async json() {
                return {
                    id: "checkout-id",
                    signature: "checkout-signature"
                }
            }
        }
    }

    const originalPayload = {
        amount: 10,
        currency: "KES",
        api_ref: "ORDER-1",
        email: "buyer@example.com"
    }
    const checkout = new KulmiPay({
        publicAPIKey: "ISPubKey_test_123",
        redirectURL: "https://merchant.example/thanks",
        apiBaseURL: "http://localhost:8000"
    })

    checkout._showProcessing = function () {}
    checkout._hideProcessing = function () {}
    checkout._loadPaymentModal = function () {}
    checkout.run(originalPayload)

    await new Promise(resolve => setTimeout(resolve, 0))

    assert.equal(capturedRequest.url, "http://localhost:8000/api/v1/checkout/")
    const body = await capturedRequest.json()
    assert.equal(body.public_key, "ISPubKey_test_123")
    assert.equal(body.redirect_url, "https://merchant.example/thanks")
    assert.equal(body.callback_url, "https://merchant.example/thanks")
    assert.equal(body.host, "https://merchant.example")
    assert.equal(body.version, "4")
    assert.equal(body.mode, "popup")
    assert.deepEqual(originalPayload, {
        amount: 10,
        currency: "KES",
        api_ref: "ORDER-1",
        email: "buyer@example.com"
    })
})

test("custom checkout base URL is used for iframe rendering", () => {
    const KulmiPay = loadSDK()
    const parent = createElement("div")
    const checkout = new KulmiPay({
        checkoutBaseURL: "http://localhost:3000/",
        live: false
    })

    checkout._hideProcessing = function () {}
    const iframe = checkout._prepareFrame(parent, "checkout-id", "signature", "tabs", ["mpesa"], {})

    assert.equal(parent.children.length, 1)
    assert.equal(iframe.attrs.id, "KULMI-WEBSDK-POPUP-IFRAME-4")
    assert.match(iframe.attrs.src, /^http:\/\/localhost:3000\/\?checkout=/)
    assert.equal(iframe.attrs.allow, "payment; clipboard-read; clipboard-write;")
})

test("custom checkout base URL is trusted for checkout status events", () => {
    const KulmiPay = loadSDK()
    const checkout = new KulmiPay({
        checkoutBaseURL: "http://localhost:3000/"
    })
    let received

    checkout.on("COMPLETE", message => {
        received = message
    })

    for (const handler of globalThis.__listeners.message) {
        handler({
            origin: "http://localhost:3000",
            data: {
                message: {
                    identitier: "kulmipay-status-update-cdrtl",
                    state: "COMPLETE",
                    tracking_id: "invoice-id"
                }
            }
        })
    }

    assert.equal(received.tracking_id, "invoice-id")
})

test("redirect mode sends the customer to the checkout page instead of opening a frame", () => {
    const KulmiPay = loadSDK()
    let opened = null
    globalThis.location.assign = url => { opened = url }

    const sdk = new KulmiPay({ publicAPIKey: "ISPubKey_test_123", checkoutBaseURL: "https://checkout-sandbox.kulmipay.com", mode: "redirect" })
    sdk.continue({ checkoutID: "abc", signature: "sig" })

    assert.ok(opened.startsWith("https://checkout-sandbox.kulmipay.com/?checkout="))
    const data = JSON.parse(atob(new URL(opened).searchParams.get("checkout")))
    assert.equal(data.checkout_id, "abc")
    assert.equal(data.signature, "sig")
    assert.equal(globalThis.document.body.children.some(child => child.tagName === "iframe"), false)
})

test("the pop-up frame declares a colour scheme so it stays transparent on dark mode pages", () => {
    const KulmiPay = loadSDK()
    const sdk = new KulmiPay({ publicAPIKey: "ISPubKey_test_123", checkoutBaseURL: "https://checkout.example" })
    const parent = globalThis.document.createElement("div")
    const frame = sdk._prepareFrame(parent, "abc", "sig", "tabs", ["mpesa"], {})
    assert.equal(frame.style.colorScheme, "light")
})
