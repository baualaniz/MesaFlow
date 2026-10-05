import 'dart:async';

import 'package:mesaflow_customer/src/assistance/assistance_repository.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

final class TestAssistanceRepository implements AssistanceRepository {
  TestAssistanceRepository([this._current]);

  final _updates = StreamController<AssistanceRequestContract?>.broadcast();
  AssistanceRequestContract? _current;

  @override
  Stream<AssistanceRequestContract?> watchCurrent({
    required String establishmentId,
    required String sessionId,
  }) async* {
    yield _current;
    yield* _updates.stream;
  }

  void emit(AssistanceRequestContract? request) {
    _current = request;
    _updates.add(request);
  }

  Future<void> dispose() => _updates.close();
}

AssistanceRequestContract testAssistanceRequest({
  String type = 'waiter',
  String status = 'pending',
}) => AssistanceRequestContract.fromJson({
  'establishmentId': 'mesa-flow-demo',
  'sessionId': 'sesion-prueba',
  'tableId': 'mesa-01',
  'customerUid': 'guest-prueba',
  'type': type,
  'status': status,
  'acknowledgedBy': status == 'acknowledged' ? 'staff-prueba' : null,
  'resolvedBy': status == 'resolved' ? 'staff-prueba' : null,
  'createdAt': '2026-09-17T12:15:00.000Z',
  'updatedAt': '2026-09-17T12:15:00.000Z',
});
