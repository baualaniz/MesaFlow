import '../routing/customer_routes.dart';

enum QrSessionFailure { accessRequired, alreadyUsed, invalidQr, unavailable }

final class QrSessionException implements Exception {
  const QrSessionException(this.failure);

  final QrSessionFailure failure;
}

final class QrSessionAccess {
  const QrSessionAccess({
    required this.establishmentId,
    required this.establishmentName,
    required this.tableId,
    required this.tableName,
    required this.sessionId,
  });

  final String establishmentId;
  final String establishmentName;
  final String tableId;
  final String tableName;
  final String sessionId;

  static QrSessionAccess fromCallableData(Object? value) {
    if (value is! Map) {
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {
      'establishmentId',
      'establishmentName',
      'tableId',
      'tableName',
      'sessionId',
    };
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty ||
        fields.any(
          (field) => data[field] is! String || (data[field] as String).isEmpty,
        )) {
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
    return QrSessionAccess(
      establishmentId: data['establishmentId']! as String,
      establishmentName: data['establishmentName']! as String,
      tableId: data['tableId']! as String,
      tableName: data['tableName']! as String,
      sessionId: data['sessionId']! as String,
    );
  }
}

abstract interface class QrSessionGateway {
  Future<QrSessionAccess> exchange({
    required CustomerTableRoute route,
    required String token,
  });

  Future<QrSessionAccess> restore(CustomerTableRoute route);
}
