import 'package:flutter/foundation.dart';
import 'package:url_launcher/url_launcher.dart';

abstract interface class CheckoutLauncher {
  Future<bool> open(Uri checkoutUrl);
}

final class ExternalCheckoutLauncher implements CheckoutLauncher {
  const ExternalCheckoutLauncher();

  @override
  Future<bool> open(Uri checkoutUrl) {
    if (kIsWeb) {
      return launchUrl(checkoutUrl, webOnlyWindowName: '_self');
    }
    return launchUrl(checkoutUrl, mode: LaunchMode.externalApplication);
  }
}
