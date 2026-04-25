import SwiftUI
import WebKit
import CoreLocation

struct WebAppContainer: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "geo")

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = controller
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true

        let script = WKUserScript(
            source: Self.geolocationBridgeScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: false
        )
        controller.addUserScript(script)

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.isInspectable = true
        context.coordinator.attach(to: webView)

        if let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") {
            let folderURL = indexURL.deletingLastPathComponent()
            webView.loadFileURL(indexURL, allowingReadAccessTo: folderURL)
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    private static let geolocationBridgeScript = """
    (function() {
      if (window.__alyamamaGeoBridgeReady) return;
      window.__alyamamaGeoBridgeReady = true;
      window.__alyamamaGeoCallbacks = {};
      let counter = 0;

      function nextId() {
        counter += 1;
        return "geo-" + counter;
      }

      function normalizeError(error) {
        return {
          code: error && typeof error.code === "number" ? error.code : 1,
          message: error && error.message ? error.message : "تعذر تحديد الموقع."
        };
      }

      window.__alyamamaGeoResolve = function(callbackId, payload) {
        const callback = window.__alyamamaGeoCallbacks[callbackId];
        if (!callback) return;
        callback.success({
          coords: {
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracy: payload.accuracy
          },
          timestamp: Date.now()
        });
        delete window.__alyamamaGeoCallbacks[callbackId];
      };

      window.__alyamamaGeoReject = function(callbackId, payload) {
        const callback = window.__alyamamaGeoCallbacks[callbackId];
        if (!callback) return;
        callback.error(normalizeError(payload));
        delete window.__alyamamaGeoCallbacks[callbackId];
      };

      navigator.geolocation.getCurrentPosition = function(success, error, options) {
        const callbackId = nextId();
        window.__alyamamaGeoCallbacks[callbackId] = {
          success: typeof success === "function" ? success : function() {},
          error: typeof error === "function" ? error : function() {}
        };

        window.webkit.messageHandlers.geo.postMessage({
          type: "getCurrentPosition",
          callbackId: callbackId,
          options: options || {}
        });
      };
    })();
    """
}

final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler, CLLocationManagerDelegate {
    private weak var webView: WKWebView?
    private let locationManager = CLLocationManager()
    private var pendingCallbackId: String?

    override init() {
        super.init()
        locationManager.delegate = self
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }

    func attach(to webView: WKWebView) {
        self.webView = webView
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "geo",
              let body = message.body as? [String: Any],
              let type = body["type"] as? String,
              type == "getCurrentPosition",
              let callbackId = body["callbackId"] as? String else {
            return
        }

        pendingCallbackId = callbackId
        requestLocation()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if url.isFileURL {
            decisionHandler(.allow)
            return
        }

        UIApplication.shared.open(url)
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo) async {
        guard let controller = topViewController() else { return }

        let alert = UIAlertController(title: "ALYAMAMA", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "حسناً", style: .default))
        controller.present(alert, animated: true)
    }

    private func requestLocation() {
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestWhenInUseAuthorization()
        case .authorizedAlways, .authorizedWhenInUse:
            locationManager.requestLocation()
        default:
            rejectLocation(code: 1, message: "صلاحية الموقع غير مفعلة.")
        }
    }

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedAlways || manager.authorizationStatus == .authorizedWhenInUse {
            manager.requestLocation()
        } else if manager.authorizationStatus == .denied || manager.authorizationStatus == .restricted {
            rejectLocation(code: 1, message: "صلاحية الموقع غير مفعلة.")
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last, let callbackId = pendingCallbackId else { return }
        pendingCallbackId = nil

        let js = """
        window.__alyamamaGeoResolve('\(callbackId)', {
          latitude: \(location.coordinate.latitude),
          longitude: \(location.coordinate.longitude),
          accuracy: \(location.horizontalAccuracy)
        });
        """

        webView?.evaluateJavaScript(js)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        rejectLocation(code: 2, message: error.localizedDescription)
    }

    private func rejectLocation(code: Int, message: String) {
        guard let callbackId = pendingCallbackId else { return }
        pendingCallbackId = nil

        let safeMessage = message
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")

        let js = """
        window.__alyamamaGeoReject('\(callbackId)', {
          code: \(code),
          message: '\(safeMessage)'
        });
        """

        webView?.evaluateJavaScript(js)
    }

    private func topViewController() -> UIViewController? {
        guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
              let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
            return nil
        }

        var current = root
        while let presented = current.presentedViewController {
            current = presented
        }
        return current
    }
}
