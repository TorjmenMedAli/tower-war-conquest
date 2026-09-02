import UIKit
import Capacitor
import FirebaseCore
import FirebaseCrashlytics

/// Custom bridge controller: registers app-local plugins that need SPM products
/// (Firebase lives in the App target via Swift Package Manager, so these plugins
/// can't live in a CocoaPod like tds-gamecenter does).
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(CrashBridgePlugin())
    }
}

/// Crashlytics bridge for the WebView game. JS name: `TDSCrash`.
/// Every method is a safe no-op until FirebaseApp is configured
/// (i.e. until GoogleService-Info.plist ships in the bundle).
@objc(CrashBridgePlugin)
public class CrashBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CrashBridgePlugin"
    public let jsName = "TDSCrash"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recordError", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "log", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setUserId", returnType: CAPPluginReturnPromise),
    ]

    private var live: Bool { FirebaseApp.app() != nil }

    @objc func recordError(_ call: CAPPluginCall) {
        if live {
            let message = call.getString("message") ?? "js-error"
            let stack = call.getString("stack") ?? ""
            let error = NSError(domain: "JavaScript", code: 0, userInfo: [
                NSLocalizedDescriptionKey: message,
                "stack": String(stack.prefix(2048)),
            ])
            Crashlytics.crashlytics().record(error: error)
        }
        call.resolve()
    }

    @objc func log(_ call: CAPPluginCall) {
        if live { Crashlytics.crashlytics().log(call.getString("message") ?? "") }
        call.resolve()
    }

    @objc func setUserId(_ call: CAPPluginCall) {
        if live { Crashlytics.crashlytics().setUserID(call.getString("id") ?? "") }
        call.resolve()
    }
}
