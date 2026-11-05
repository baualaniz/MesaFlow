import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mesaflow_customer/src/demo/demo_customer_backend.dart';
import 'package:mesaflow_customer/src/demo/demo_worker_payment_gateway.dart';
import 'package:mesaflow_customer/src/payment/payment_gateway.dart';

void main() {
  final endpoint = Uri.parse(
    'https://mesaflow-payment-demo.example.workers.dev/preferences',
  );

  test('envía solo IDs y cantidades y valida la preferencia remota', () async {
    late Map<String, Object?> requestBody;
    final client = MockClient((request) async {
      requestBody = (jsonDecode(request.body) as Map).map(
        (key, value) => MapEntry(key.toString(), value),
      );
      return http.Response(
        jsonEncode({
          'intentId': 'a' * 64,
          'preferenceId': 'pref-worker-123',
          'checkoutUrl':
              'https://sandbox.mercadopago.com/checkout/v1/redirect?pref_id=pref-worker-123',
          'amountMinor': 1290000,
          'currency': 'ARS',
          'status': 'ready',
        }),
        200,
        headers: {'content-type': 'application/json'},
      );
    });
    final gateway = DemoWorkerPaymentGateway(
      endpoint: endpoint,
      itemsProvider: () => const [
        DemoPaymentItem(productId: 'burger-casa', quantity: 1),
      ],
      client: client,
    );

    final preference = await gateway.create(
      session: DemoCustomerBackend.session,
    );

    expect(preference.preferenceId, 'pref-worker-123');
    expect(
      requestBody.keys,
      unorderedEquals(['sessionId', 'tableId', 'items']),
    );
    final items = requestBody['items']! as List;
    expect(items.single, {'productId': 'burger-casa', 'quantity': 1});
    expect(jsonEncode(requestBody), isNot(contains('price')));
  });

  test('rechaza pago sin consumo antes de consultar el backend', () async {
    var called = false;
    final gateway = DemoWorkerPaymentGateway(
      endpoint: endpoint,
      itemsProvider: () => const [],
      client: MockClient((request) async {
        called = true;
        return http.Response('{}', 200);
      }),
    );

    await expectLater(
      gateway.create(session: DemoCustomerBackend.session),
      throwsA(
        isA<PaymentException>().having(
          (error) => error.failure,
          'failure',
          PaymentFailure.balanceUnavailable,
        ),
      ),
    );
    expect(called, isFalse);
  });

  test('convierte una falla remota en proveedor no disponible', () async {
    final gateway = DemoWorkerPaymentGateway(
      endpoint: endpoint,
      itemsProvider: () => const [
        DemoPaymentItem(productId: 'burger-casa', quantity: 1),
      ],
      client: MockClient((request) async => http.Response('{}', 503)),
    );

    await expectLater(
      gateway.create(session: DemoCustomerBackend.session),
      throwsA(
        isA<PaymentException>().having(
          (error) => error.failure,
          'failure',
          PaymentFailure.providerUnavailable,
        ),
      ),
    );
  });
}
