import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/assistance/assistance_gateway.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

void main() {
  test('valida una respuesta exacta de asistencia', () {
    final result = AssistanceActionResult.fromCallableData({
      'requestId': 'sesion-prueba',
      'type': 'bill',
      'status': 'pending',
      'createdAt': '2026-09-17T12:15:00.000Z',
      'updatedAt': '2026-09-17T12:15:00.000Z',
    });
    expect(result.type, AssistanceType.bill);
    expect(result.status, AssistanceStatus.pending);
  });

  test('rechaza respuestas incompletas o fuera de contrato', () {
    final invalid = [
      null,
      {
        'requestId': 'sesion-prueba',
        'type': 'kitchen',
        'status': 'pending',
        'createdAt': '2026-09-17T12:15:00.000Z',
        'updatedAt': '2026-09-17T12:15:00.000Z',
      },
      {
        'requestId': 'sesion-prueba',
        'type': 'waiter',
        'status': 'pending',
        'createdAt': '2026-09-17T12:15:00.000Z',
        'updatedAt': '2026-09-17T12:15:00.000Z',
        'unexpected': true,
      },
    ];
    for (final value in invalid) {
      expect(
        () => AssistanceActionResult.fromCallableData(value),
        throwsA(isA<AssistanceException>()),
      );
    }
  });
}
