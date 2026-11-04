# kulmipay Checkout SDK

WebSdk plugin for [Kulmipay Payments Button](https://kulmipay.com). Kulmipay enables you to easily add payments to your website with a few lines of code.

Follow the instruction below to install and get started. 

Visit our [sandbox/developers test](https://sandbox.kulmipay.com) for your publishable API. More information is available on the [KulmiPay Documentation](https://developers.kulmipay.com).

## Install locally

    yarn add kulmipay
    npm install kulmipay

### CDN option

- https://unpkg.com/kulmipay

## Configuration

The SDK targets KulmiPay sandbox or live endpoints by default.

    const kulmiObj = new window.KulmiPay({
        publicAPIKey: "<YOUR-API-KEY>",
        redirectURL: "<YOUR-REDIRECT-URL>",
        live: false
    })

For local or self-hosted backend testing, pass the backend and checkout origins explicitly:

    const kulmiObj = new window.KulmiPay({
        publicAPIKey: "<YOUR-API-KEY>",
        redirectURL: "http://localhost:8080/thank-you",
        apiBaseURL: "http://localhost:8000",
        checkoutBaseURL: "http://localhost:3000",
        live: false
    })

`apiBaseURL` is resolved to `/api/v1/checkout/`. You can also pass `checkoutAPIURL` if you need to provide the full checkout API endpoint.

## Setup inline mode

Define the container where you want the payment component to appear

    <div id="checkoutElement" style="padding: 40;width: 400px; height: 100vh; background: #cacaca; overflow-y: auto;"></div>

Instantiate the checkout element. Include this before closing your body tag

    <script type="text/javascript" src="https://unpkg.com/kulmipay"></script>
    <script>
        function openInlineCheckout() {
                const kulmiObj = new window.KulmiPay({
                    publicAPIKey: "ISPubKey_test_91ffc81a-8ac4-419e-8008-7091caa8d73f",
                    redirectURL: "http://kulmipay.com",
                    live: false,
                    mode: "inline",
                    inlineContainer: "checkoutElement"
                })
                .on("COMPLETE", () => alert("COMPLETE"))
                .on("FAILED", () => alert("FAILED"))
                .on("IN-PROGRESS", () => console.log("INPROGRESS ..."))

                kulmiObj.run({
                    amount: 10,
                    currency: "USD",
                    api_ref: "123",
                    email: "mugendi@kulmipay.com"
                })
        }
        openInlineCheckout()
    </script>

## Setup redirect mode

Set `mode: "redirect"` to send the customer to the full Kulmi Pay checkout page instead of opening a pop-up. After paying, they return to your `redirectURL`.

```js
new window.KulmiPay({
    publicAPIKey: "ISPubKey_live_xxxxxxxx",
    redirectURL: "https://example.com/thanks",
    live: true,
    mode: "redirect"
})
```

## Setup popup mode website

    <button class="kulmiPayButton" data-api_ref="payment-link" data-phone-number="254xxxxxxxx"
        data-email="example@kulmipay.com" data-amount="100">
        Pay Now
    </button>

Include this before closing your body tag

    <script src="https://unpkg.com/kulmipay"></script>
    <script>
        let isObj = new window.KulmiPay({
            publicAPIKey: "<YOUR-API-KEY>",
            redirectURL: "<YOUR-REDIRECT-URL>",
            live: true //or false for sandbox environment
        })
        .on("COMPLETE", (response) => { console.log("COMPLETE:", response) })
        .on("FAILED", (response) => { console.log("FAILED", response) })
        .on("IN-PROGRESS", () => { console.log("INPROGRESS ...") })
    </script>
