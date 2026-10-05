import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/order/firestore_order_tracking_repository.dart';

void main() {
  final createdAt = DateTime.utc(2026, 9, 17, 12, 15);

  Map<String, Object?> orderData() => {
    'establishmentId': 'mesa-flow-demo',
    'sessionId': 'sesion-prueba',
    'tableId': 'mesa-01',
    'customerUid': 'guest-prueba',
    'status': 'confirmed',
    'items': [
      {
        'productId': 'burger-casa',
        'name': 'Burger de la casa',
        'unitPriceMinor': 1290000,
        'quantity': 2,
        'lineTotalMinor': 2580000,
        'notes': null,
      },
    ],
    'subtotalMinor': 2580000,
    'totalMinor': 2580000,
    'currency': 'ARS',
    'notes': null,
    'statusTimestamps': {
      'created': Timestamp.fromDate(createdAt),
      'confirmed': Timestamp.fromDate(
        createdAt.add(const Duration(minutes: 1)),
      ),
    },
    'createdAt': Timestamp.fromDate(createdAt),
    'updatedAt': Timestamp.fromDate(createdAt.add(const Duration(minutes: 1))),
  };

  test('convierte timestamps y valida el pedido de la sesión', () {
    final tracked = trackedOrderFromFirestore(
      'pedido-prueba',
      orderData(),
      establishmentId: 'mesa-flow-demo',
      sessionId: 'sesion-prueba',
    );

    expect(tracked.id, 'pedido-prueba');
    expect(tracked.order.status, OrderStatus.confirmed);
    expect(tracked.order.totalMinor, 2580000);
    expect(
      tracked.order.statusTimestamps[OrderStatus.confirmed],
      createdAt.add(const Duration(minutes: 1)),
    );
  });

  test('normaliza la precisión de Firestore al contrato en milisegundos', () {
    final timestampWithMicroseconds = Timestamp.fromMicrosecondsSinceEpoch(
      createdAt.microsecondsSinceEpoch + 456,
    );
    final data = orderData()
      ..['createdAt'] = timestampWithMicroseconds
      ..['updatedAt'] = timestampWithMicroseconds
      ..['statusTimestamps'] = {'created': timestampWithMicroseconds}
      ..['status'] = 'created';

    final tracked = trackedOrderFromFirestore(
      'pedido-prueba',
      data,
      establishmentId: 'mesa-flow-demo',
      sessionId: 'sesion-prueba',
    );

    expect(tracked.order.createdAt.microsecond, 0);
    expect(tracked.order.updatedAt.microsecond, 0);
  });

  test('rechaza timestamps nativos ausentes y pedidos de otra sesión', () {
    final invalidTimestamp = orderData()..['createdAt'] = createdAt;
    expect(
      () => trackedOrderFromFirestore(
        'pedido-prueba',
        invalidTimestamp,
        establishmentId: 'mesa-flow-demo',
        sessionId: 'sesion-prueba',
      ),
      throwsFormatException,
    );

    expect(
      () => trackedOrderFromFirestore(
        'pedido-prueba',
        orderData(),
        establishmentId: 'mesa-flow-demo',
        sessionId: 'otra-sesion',
      ),
      throwsFormatException,
    );
  });
}
