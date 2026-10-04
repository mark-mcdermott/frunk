import Capacitor
import UIKit

/// The app's bridge, so plugins that live in this target (rather than in a package)
/// can register themselves. `Main.storyboard` names this class.
class AppViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VinScannerPlugin())
    }
}
