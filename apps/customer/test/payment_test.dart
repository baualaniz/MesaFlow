import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/payment/checkout_launcher.dart';
import 'package:mesaflow_customer/src/payment/payment_controller.dart';
import 'package:mesaflow_customer/src/payment/payment_gateway.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

const session = QrSessionAccess(
  establishmentId: 'mesa-flow-demo',
  establishmentName: 'Bistró MesaFlow',
  tableId: 'mesa-01',
  tableName: 'Mesa 1',
  sessionId: 'sesion-mesa-01',
);

final class _Gateway implements PaymentGateway {
  _Gateway({this.failure});

  final PaymentFailure? failure;
  int calls = 0;

  @override
  Future<PaymentPreference> create({required QrSessionAccess session}) async {
    calls += 1;
    if (failure case final failure?) throw PaymentException(failure);
    return PaymentPreference.fromCallableData({
      'intentId': 'a' * 64,
      'preferenceId': 'pref-123',
      'checkoutUrl':
          'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-123',
      'amountMinor': 1940000,
      'currency': 'ARS',
      'status': 'ready',
    });
  }
}

final class _Launcher implements CheckoutLauncher {
  _Launcher({this.opened = true});

  final bool opened;
  Uri? url;

  @override
  Future<bool> open(Uri checkoutUrl) async {
    url = checkoutUrl;
    return opened;
  }
}

void main() {
  test('valida el contrato exacto y el dominio del checkout', () {
    final preference = PaymentPreference.fromCallableData({
      'intentId': 'a' * 64,
      'preferenceId': 'pref-123',
      'checkoutUrl': 'https://sandbox.mercadopago.com/checkout/v1/redirect',
      'amountMinor': 1940000,
      'currency': 'ARS',
      'status': 'ready',
    });
    expect(preference.amountMinor, 1940000);
    expect(preference.checkoutUrl.host, 'sandbox.mercadopago.com');

    expect(
      () => PaymentPreference.fromCallableData({
        'intentId': 'a' * 64,
        'preferenceId': 'pref-123',
        'checkoutUrl': 'https://example.com/phishing',
        'amountMinor': 1940000,
        'currency': 'ARS',
        'status': 'ready',
      }),
      throwsA(isA<PaymentException>()),
    );
  });

  test('crea una preferencia y abre solo la URL validada', () async {
    final gateway = _Gateway();
    final launcher = _Launcher();
    final controller = PaymentController(
      gateway: gateway,
      launcher: launcher,
      session: session,
    );
    await controller.start();
    expect(gateway.calls, 1);
    expect(launcher.url?.host, 'sandbox.mercadopago.com');
    expect(controller.failure, isNull);
  });

  test('expone fallas del backend sin abrir el navegador', () async {
    final gateway = _Gateway(failure: PaymentFailure.balanceUnavailable);
    final launcher = _Launcher();
    final controller = PaymentController(
      gateway: gateway,
      launcher: launcher,
      session: session,
    );
    await controller.start();
    expect(controller.failure, PaymentFailure.balanceUnavailable);
    expect(launcher.url, isNull);
  });
}
