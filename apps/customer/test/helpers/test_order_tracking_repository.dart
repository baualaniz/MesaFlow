import 'dart:async';

import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/order/order_tracking_repository.dart';

final class TestOrderTrackingRepository implements OrderTrackingRepository {
  TestOrderTrackingRepository([List<TrackedOrder> initial = const []])
    : _current = List.unmodifiable(initial);

  final _updates = StreamController<List<TrackedOrder>>.broadcast();
  List<TrackedOrder> _current;

  @override
  Stream<List<TrackedOrder>> watchSession({
    required String establishmentId,
    required String sessionId,
  }) async* {
    yield _current;
    yield* _updates.stream;
  }

  void emit(List<TrackedOrder> orders) {
    _current = List.unmodifiable(orders);
    _updates.add(_current);
  }

  void emitError(Object error) => _updates.addError(error);

  Future<void> dispose() => _updates.close();
}

TrackedOrder testTrackedOrder({
  String id = 'pedido-prueba',
  String status = 'created',
  Map<String, String>? statusTimestamps,
}) {
  final timestamps =
      statusTimestamps ?? {'created': '2026-09-17T12:15:00.000Z'};
  return TrackedOrder(
    id: id,
    order: OrderContract.fromJson({
      'establishmentId': 'mesa-flow-demo',
      'sessionId': 'sesion-prueba',
      'tableId': 'mesa-01',
      'customerUid': 'guest-prueba',
      'status': status,
      'items': [
        {
          'productId': 'burger-casa',
          'name': 'Burger de la casa',
          'unitPriceMinor': 1290000,
          'quantity': 1,
          'lineTotalMinor': 1290000,
          'notes': 'Sin cebolla',
        },
      ],
      'subtotalMinor': 1290000,
      'totalMinor': 1290000,
      'currency': 'ARS',
      'notes': null,
      'statusTimestamps': timestamps,
      'createdAt': '2026-09-17T12:15:00.000Z',
      'updatedAt': timestamps[status] ?? '2026-09-17T12:15:00.000Z',
    }),
  );
}
