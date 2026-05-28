const MOBILE_USER_AGENT_PATTERN = /Android|BlackBerry|iPad|iPhone|iPod|IEMobile|Mobile|Opera Mini|webOS/i

const MobileCheck = function () {
    const nav = globalThis.navigator || {}
    if (nav.userAgentData && typeof nav.userAgentData.mobile === "boolean") {
        return nav.userAgentData.mobile
    }

    const isTouchMac = nav.platform === "MacIntel" && nav.maxTouchPoints > 1
    const userAgent = nav.userAgent || nav.vendor || globalThis.opera || ""
    return isTouchMac || MOBILE_USER_AGENT_PATTERN.test(userAgent)
}

module.exports = {
    MobileCheck
}
