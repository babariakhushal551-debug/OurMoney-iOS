import SwiftUI
import WebKit

@main
struct OurMoneyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        OurMoneyWebView()
            .ignoresSafeArea(.all)
            .background(Color(uiColor: .systemBackground).ignoresSafeArea())
    }
}

struct OurMoneyWebView: UIViewRepresentable {
    // Primary: the app hosted on Firebase (required for Google sign-in).
    // Fallback: assets bundled inside the app.
    static let hostedURL = URL(string: "https://ourmoney-647b2.web.app")!

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView,
                     didFail navigation: WKNavigation!,
                     withError error: Error) {
            loadLocal(webView)
        }

        func webView(_ webView: WKWebView,
                     didFailProvisionalNavigation navigation: WKNavigation!,
                     withError error: Error) {
            loadLocal(webView)
        }

        private func loadLocal(_ webView: WKWebView) {
            guard let index = Bundle.main.url(forResource: "index",
                                              withExtension: "html",
                                              subdirectory: "webapp") else { return }
            webView.loadFileURL(index,
                                allowingReadAccessTo: index.deletingLastPathComponent())
        }
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
        configuration.websiteDataStore = .default()

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        webView.isOpaque = false

        // Try the hosted app first; on failure the coordinator falls back
        // to the bundled copy of the web build.
        webView.load(URLRequest(url: Self.hostedURL))
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
