import 'package:mesaflow_customer/src/routing/customer_routes.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

final class TestQrSessionGateway implements QrSessionGateway {
  const TestQrSessionGateway({this.failure});

  static const active = TestQrSessionGateway();

  final QrSessionFailure? failure;

  QrSessionAccess _result(CustomerTableRoute route) {
    final failure = this.failure;
    if (failure != null) throw QrSessionException(failure);
    return QrSessionAccess(
      establishmentId: route.establishmentSlug,
      establishmentName: 'Casa Jacarandá',
      tableId: route.tableId,
      tableName: route.tableLabel,
      sessionId: 'sesion-prueba',
    );
  }

  @override
  Future<QrSessionAccess> exchange({
    required CustomerTableRoute route,
    required String token,
  }) async => _result(route);

  @override
  Future<QrSessionAccess> restore(CustomerTableRoute route) async =>
      _result(route);
}
