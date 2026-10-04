import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/order/order_gateway.dart';

void main() {
  test('valida una respuesta exacta de pedido creado', () {
    final order = CreatedOrder.fromCallableData({
      'orderId': 'a' * 64,
      'status': 'created',
      'itemCount': 3,
      'totalMinor': 3200000,
      'currency': 'ARS',
      'createdAt': '2026-09-17T12:15:00.000Z',
    });

    expect(order.id, 'a' * 64);
    expect(order.itemCount, 3);
    expect(order.totalMinor, 3200000);
    expect(order.createdAt.isUtc, isTrue);
  });

  test('rechaza respuestas incompletas, adicionales o fuera de contrato', () {
    final invalid = [
      null,
      {
        'orderId': 'corto',
        'status': 'created',
        'itemCount': 1,
        'totalMinor': 1,
        'currency': 'ARS',
        'createdAt': '2026-09-17T12:15:00.000Z',
      },
      {
        'orderId': 'a' * 64,
        'status': 'confirmed',
        'itemCount': 1,
        'totalMinor': 1,
        'currency': 'ARS',
        'createdAt': '2026-09-17T12:15:00.000Z',
      },
      {
        'orderId': 'a' * 64,
        'status': 'created',
        'itemCount': 1,
        'totalMinor': 1,
        'currency': 'ARS',
        'createdAt': '2026-09-17T12:15:00.000Z',
        'priceAcceptedFromClient': true,
      },
    ];

    for (final value in invalid) {
      expect(
        () => CreatedOrder.fromCallableData(value),
        throwsA(isA<OrderException>()),
      );
    }
  });
}
