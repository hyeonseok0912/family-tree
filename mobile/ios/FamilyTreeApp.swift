import SwiftUI
import WebKit

@main
struct FamilyTreeApp: App {
    var body: some Scene { WindowGroup { FamilyTreeWeb() } }
}

struct FamilyTreeWeb: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> FamilyTreeController { FamilyTreeController() }
    func updateUIViewController(_ controller: FamilyTreeController, context: Context) {}
}

final class FamilyTreeController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    // Set this to the same HTTPS address configured for Android and the hosted website.
    private let site = URL(string: "https://milseongson.onrender.com")!
    private var web: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.userContentController.add(WeakScriptHandler(self), name: "familyTreeExport")
        web = WKWebView(frame: .zero, configuration: configuration)
        web.navigationDelegate = self; web.uiDelegate = self
        web.allowsBackForwardNavigationGestures = true
        let browser = UIButton(type: .system)
        browser.setTitle("브라우저에서 열기", for: .normal)
        browser.addTarget(self, action: #selector(openBrowser), for: .touchUpInside)
        let layout = UIStackView(arrangedSubviews: [browser, web])
        layout.axis = .vertical; layout.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(layout)
        NSLayoutConstraint.activate([layout.leadingAnchor.constraint(equalTo: view.leadingAnchor), layout.trailingAnchor.constraint(equalTo: view.trailingAnchor), layout.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor), layout.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor), browser.heightAnchor.constraint(equalToConstant: 44)])
        web.load(URLRequest(url: site))
    }
    private func trusted(_ url: URL) -> Bool { url.scheme == "https" && url.host == site.host && url.port == site.port }
    @objc private func openBrowser() { UIApplication.shared.open(site) }
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { decisionHandler(.cancel); return }
        // Google Charts resources may load in frames; only top-level navigation changes the app's site.
        if action.targetFrame?.isMainFrame == false { decisionHandler(.allow); return }
        if trusted(url) { decisionHandler(.allow) }
        else { if ["https", "mailto", "tel"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }; decisionHandler(.cancel) }
    }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { connectionError(error) }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { connectionError(error) }
    private func connectionError(_ error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled, presentedViewController == nil else { return }
        let alert = UIAlertController(title: "인터넷 연결 확인", message: "연결 후 다시 시도해주세요.", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "다시 연결", style: .default) { _ in self.web.load(URLRequest(url: self.site)) })
        alert.addAction(UIAlertAction(title: "닫기", style: .cancel))
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler() }); present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(true) })
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(false) }); present(alert, animated: true)
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.isMainFrame, let origin = message.frameInfo.request.url, trusted(origin),
              let body = message.body as? [String: String], let name = body["filename"], let dataURL = body["dataUrl"],
              name.range(of: "^[A-Za-z0-9_-]+\\.(png|pdf)$", options: .regularExpression) != nil, dataURL.count < 40_000_000,
              (name.hasSuffix(".png") && dataURL.hasPrefix("data:image/png;base64,")) || (name.hasSuffix(".pdf") && dataURL.hasPrefix("data:application/pdf;")),
              let range = dataURL.range(of: "base64,"), let data = Data(base64Encoded: String(dataURL[range.upperBound...])) else { return }
        do {
            let file = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            try data.write(to: file, options: .atomic)
            let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            share.popoverPresentationController?.sourceView = view
            share.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            present(share, animated: true)
        } catch { connectionError(error) }
    }
    deinit { web?.configuration.userContentController.removeScriptMessageHandler(forName: "familyTreeExport") }
}

private final class WeakScriptHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(_ delegate: WKScriptMessageHandler) { self.delegate = delegate; super.init() }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) { delegate?.userContentController(userContentController, didReceive: message) }
}
