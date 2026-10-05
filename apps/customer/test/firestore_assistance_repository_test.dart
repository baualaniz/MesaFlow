import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/assistance/firestore_assistance_repository.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

void main() {
  final timestamp = DateTime.utc(2026, 9, 17, 12, 15);

  Map<String, Object?> data() => {
    'establishmentId': 'mesa-flow-demo',
    'sessionId': 'sesion-prueba',
    'tableId': 'mesa-01',
    'customerUid': 'guest-prueba',
    'type': 'waiter',
    'status': 'acknowledged',
    'acknowledgedBy': 'staff-prueba',
    'resolvedBy': null,
    'createdAt': Timestamp.fromDate(timestamp),
    'updatedAt': Timestamp.fromDate(timestamp),
  };

  test('convierte timestamps y valida la solicitud de la sesión', () {
    final request = assistanceRequestFromFirestore(
      data(),
      establishmentId: 'mesa-flow-demo',
      sessionId: 'sesion-prueba',
    );
    expect(request.type, AssistanceType.waiter);
    expect(request.status, AssistanceStatus.acknowledged);
    expect(request.updatedAt, timestamp);
  });

  test('rechaza timestamps nativos ausentes y otra sesión', () {
    expect(
      () => assistanceRequestFromFirestore(
        data()..['createdAt'] = timestamp,
        establishmentId: 'mesa-flow-demo',
        sessionId: 'sesion-prueba',
      ),
      throwsFormatException,
    );
    expect(
      () => assistanceRequestFromFirestore(
        data(),
        establishmentId: 'mesa-flow-demo',
        sessionId: 'otra-sesion',
      ),
      throwsFormatException,
    );
  });
}
