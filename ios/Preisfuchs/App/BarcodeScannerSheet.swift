import AVFoundation
import PreisfuchsData
import SwiftUI
import Vision
import VisionKit

struct BarcodeScannerSheet: View {
    @Binding var gtin: String
    @Environment(\.dismiss) private var dismiss
    @State private var isReady = false
    @State private var message: String?

    var body: some View {
        NavigationStack {
            Group {
                if isReady, message == nil {
                    BarcodeScannerView { value in
                        guard PriceReportValidation.isValidGTIN(value) else {
                            isReady = false
                            message = "Der Barcode ist keine gültige GTIN-13. Bitte gib die 13 Ziffern manuell ein."
                            return
                        }
                        gtin = value
                        dismiss()
                    } onFailure: {
                        isReady = false
                        message = "Der Scanner ist gerade nicht verfügbar. Bitte gib die 13 Ziffern manuell ein."
                    }
                    .ignoresSafeArea(edges: .bottom)
                } else if let message {
                    ContentUnavailableView {
                        Label("Barcode-Scan nicht verfügbar", systemImage: "barcode")
                    } description: {
                        Text(message)
                    } actions: {
                        Button("Manuell eingeben") { dismiss() }
                    }
                } else {
                    ProgressView("Kamera vorbereiten …")
                }
            }
            .navigationTitle("Barcode scannen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Abbrechen") { dismiss() } }
            }
        }
        .task { await prepareCamera() }
    }

    @MainActor
    private func prepareCamera() async {
        guard DataScannerViewController.isSupported else {
            message = "Dieses Gerät unterstützt den Scanner nicht. Bitte gib den Barcode manuell ein."
            return
        }
        let allowed: Bool
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized: allowed = true
        case .notDetermined: allowed = await AVCaptureDevice.requestAccess(for: .video)
        default: allowed = false
        }
        guard !Task.isCancelled else { return }
        guard allowed else {
            message = "Kein Kamerazugriff. Du kannst ihn in den iOS-Einstellungen erlauben oder den Barcode manuell eingeben."
            return
        }
        guard DataScannerViewController.isAvailable else {
            message = "Die Kamera ist gerade nicht verfügbar. Bitte gib den Barcode manuell ein."
            return
        }
        isReady = true
    }
}

@MainActor
private struct BarcodeScannerView: UIViewControllerRepresentable {
    let onBarcode: (String) -> Void
    let onFailure: () -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onBarcode: onBarcode, onFailure: onFailure) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let controller = DataScannerViewController(
            recognizedDataTypes: [.barcode(symbologies: [.ean13])],
            qualityLevel: .balanced,
            recognizesMultipleItems: false,
            isHighFrameRateTrackingEnabled: false,
            isPinchToZoomEnabled: true,
            isGuidanceEnabled: true,
            isHighlightingEnabled: true
        )
        controller.delegate = context.coordinator
        return controller
    }

    func updateUIViewController(_ controller: DataScannerViewController, context: Context) {
        // Start after the representable has mounted, without publishing state during an update.
        context.coordinator.start(controller)
    }

    static func dismantleUIViewController(_ controller: DataScannerViewController, coordinator: Coordinator) {
        coordinator.startTask?.cancel()
        controller.stopScanning()
    }

    @MainActor
    final class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let onBarcode: (String) -> Void
        let onFailure: () -> Void
        var startTask: Task<Void, Never>?
        private var didFinish = false

        init(onBarcode: @escaping (String) -> Void, onFailure: @escaping () -> Void) {
            self.onBarcode = onBarcode
            self.onFailure = onFailure
        }

        func start(_ controller: DataScannerViewController) {
            guard startTask == nil else { return }
            startTask = Task { @MainActor [weak self, weak controller] in
                await Task.yield()
                guard !Task.isCancelled, let self, let controller else { return }
                do { try controller.startScanning() }
                catch { self.onFailure() }
            }
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            for item in addedItems { accept(item, scanner: dataScanner) }
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            accept(item, scanner: dataScanner)
        }

        func dataScanner(_ dataScanner: DataScannerViewController,
                         becameUnavailableWithError error: DataScannerViewController.ScanningUnavailable) {
            guard !didFinish else { return }
            didFinish = true
            dataScanner.stopScanning()
            onFailure()
        }

        private func accept(_ item: RecognizedItem, scanner: DataScannerViewController) {
            guard !didFinish, case .barcode(let barcode) = item, let value = barcode.payloadStringValue else { return }
            didFinish = true
            scanner.stopScanning()
            onBarcode(value)
        }
    }
}
