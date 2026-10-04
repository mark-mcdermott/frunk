import AVFoundation
import Capacitor
import UIKit
import VisionKit

/// Reads a VIN with the camera: `VinScanner.scan()` in `src/lib/vin-scanner.ts`.
///
/// Apple's live data scanner (VisionKit, the engine behind Live Text) reads text and
/// barcodes in one view, on the device. A VIN is on the windshield plate as stamped
/// text, and since the 2000s on the door-jamb sticker as a barcode too, so both are
/// watched for. `VinText` keeps only a candidate whose check digit holds, and the first
/// one ends the scan. iOS 16 and a recent iPhone are required; elsewhere `isAvailable`
/// says no and the app shows no scan button.
@objc(VinScannerPlugin)
public class VinScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VinScannerPlugin"
    public let jsName = "VinScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    /// The scanner's delegate holds no strong reference from VisionKit, so it lives here.
    private var session: AnyObject?

    @objc func isAvailable(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.resolve(["available": false])
            return
        }
        // VisionKit's scanner is main-actor bound; plugin calls arrive on Capacitor's queue.
        Task { @MainActor in
            call.resolve(["available": DataScannerViewController.isSupported])
        }
    }

    /// Resolves `{ vin }` with a checked VIN, or `{}` when the owner cancels.
    @objc func scan(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.reject("This device cannot scan", "UNSUPPORTED")
            return
        }
        Task { @MainActor in
            guard DataScannerViewController.isSupported else {
                call.reject("This device cannot scan", "UNSUPPORTED")
                return
            }
            guard await AVCaptureDevice.requestAccess(for: .video) else {
                call.reject("Camera access is off for Frunk", "DENIED")
                return
            }
            self.present(call)
        }
    }

    @available(iOS 16.0, *)
    @MainActor
    private func present(_ call: CAPPluginCall) {
        guard let host = bridge?.viewController else {
            call.reject("Nothing to present the scanner from")
            return
        }
        let scan = VinScanSession { [weak self] vin in
            call.resolve(vin.map { ["vin": $0] } ?? [:])
            self?.session = nil
        }
        session = scan
        host.present(scan.makeController(), animated: true) {
            scan.start()
        }
    }
}

/// One trip to the camera: the scanner, its frame of guidance, and the single answer.
@available(iOS 16.0, *)
@MainActor
private final class VinScanSession: NSObject, DataScannerViewControllerDelegate {
    private let finish: (String?) -> Void
    private var scanner: DataScannerViewController?
    private var finished = false

    init(finish: @escaping (String?) -> Void) {
        self.finish = finish
    }

    func makeController() -> UIViewController {
        let scanner = DataScannerViewController(
            recognizedDataTypes: [
                .text(),
                .barcode(symbologies: [.code39, .code39FullASCII, .code128, .pdf417, .qr, .dataMatrix])
            ],
            qualityLevel: .accurate,
            recognizesMultipleItems: true,
            isHighFrameRateTrackingEnabled: false,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = self
        scanner.title = "Scan the VIN"
        scanner.navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { [weak self] _ in self?.end(with: nil) }
        )
        self.scanner = scanner

        let hint = UILabel()
        hint.text = "On the windshield, the driver’s door frame, or your registration card"
        hint.font = .preferredFont(forTextStyle: .footnote)
        hint.textColor = .white
        hint.textAlignment = .center
        hint.numberOfLines = 0
        hint.translatesAutoresizingMaskIntoConstraints = false
        scanner.overlayContainerView.addSubview(hint)
        NSLayoutConstraint.activate([
            hint.leadingAnchor.constraint(equalTo: scanner.overlayContainerView.layoutMarginsGuide.leadingAnchor),
            hint.trailingAnchor.constraint(equalTo: scanner.overlayContainerView.layoutMarginsGuide.trailingAnchor),
            hint.bottomAnchor.constraint(equalTo: scanner.overlayContainerView.safeAreaLayoutGuide.bottomAnchor, constant: -24)
        ])

        let navigation = UINavigationController(rootViewController: scanner)
        navigation.modalPresentationStyle = .fullScreen
        navigation.navigationBar.barStyle = .black
        navigation.navigationBar.tintColor = .white
        return navigation
    }

    func start() {
        do {
            try scanner?.startScanning()
        } catch {
            end(with: nil)
        }
    }

    func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
        look(at: allItems)
    }

    func dataScanner(_ dataScanner: DataScannerViewController, didUpdate updatedItems: [RecognizedItem], allItems: [RecognizedItem]) {
        look(at: allItems)
    }

    func dataScanner(_ dataScanner: DataScannerViewController, becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
        end(with: nil)
    }

    private func look(at items: [RecognizedItem]) {
        for item in items {
            let text: String?
            switch item {
            case .text(let line): text = line.transcript
            case .barcode(let code): text = code.payloadStringValue
            @unknown default: text = nil
            }
            if let text, let vin = VinText.firstVin(in: text) {
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                end(with: vin)
                return
            }
        }
    }

    private func end(with vin: String?) {
        guard !finished else { return }
        finished = true
        scanner?.stopScanning()
        scanner?.navigationController?.dismiss(animated: true)
        finish(vin)
    }
}
