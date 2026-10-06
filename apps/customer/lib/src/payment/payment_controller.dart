import 'package:flutter/foundation.dart';

import '../session/qr_session.dart';
import 'checkout_launcher.dart';
import 'payment_gateway.dart';

final class PaymentController extends ChangeNotifier {
  PaymentController({
    required PaymentGateway gateway,
    required CheckoutLauncher launcher,
    required this.session,
  }) : _gateway = gateway,
       _launcher = launcher;

  final PaymentGateway _gateway;
  final CheckoutLauncher _launcher;
  final QrSessionAccess session;
  bool _busy = false;
  PaymentFailure? _failure;

  bool get busy => _busy;
  PaymentFailure? get failure => _failure;

  Future<void> start() async {
    if (_busy) return;
    _busy = true;
    _failure = null;
    notifyListeners();
    try {
      final preference = await _gateway.create(session: session);
      if (!await _launcher.open(preference.checkoutUrl)) {
        throw const PaymentException(PaymentFailure.unavailable);
      }
    } on PaymentException catch (error) {
      _failure = error.failure;
    } catch (_) {
      _failure = PaymentFailure.unavailable;
    } finally {
      _busy = false;
      notifyListeners();
    }
  }

  void clearFailure() {
    _failure = null;
    notifyListeners();
  }
}
