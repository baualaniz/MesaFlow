import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

void main() {
  test('valida la respuesta exacta del callable', () {
    final access = QrSessionAccess.fromCallableData({
      'establishmentId': 'mesa-flow-demo',
      'establishmentName': 'Bistró MesaFlow',
      'tableId': 'mesa-01',
      'tableName': 'Mesa 1',
      'sessionId': 'sesion-mesa-01',
    });

    expect(access.establishmentId, 'mesa-flow-demo');
    expect(access.tableId, 'mesa-01');
    expect(access.sessionId, 'sesion-mesa-01');
  });

  test('rechaza respuestas incompletas, vacías o con campos adicionales', () {
    final invalidResponses = [
      null,
      <String, Object?>{},
      {
        'establishmentId': 'mesa-flow-demo',
        'establishmentName': 'Bistró MesaFlow',
        'tableId': 'mesa-01',
        'tableName': 'Mesa 1',
        'sessionId': '',
      },
      {
        'establishmentId': 'mesa-flow-demo',
        'establishmentName': 'Bistró MesaFlow',
        'tableId': 'mesa-01',
        'tableName': 'Mesa 1',
        'sessionId': 'sesion-mesa-01',
        'token': 'nunca-debe-volver',
      },
    ];

    for (final response in invalidResponses) {
      expect(
        () => QrSessionAccess.fromCallableData(response),
        throwsA(isA<QrSessionException>()),
      );
    }
  });
}
