import '../contracts/domain_contracts.dart';
import '../session/qr_session.dart';

enum ConsumptionFailure { inconsistent, sessionUnavailable, unavailable }

final class ConsumptionException implements Exception {
  const ConsumptionException(this.failure);

  final ConsumptionFailure failure;
}

final class ConsumptionSummary {
  const ConsumptionSummary({
    required this.sessionId,
    required this.tableId,
    required this.sessionStatus,
    required this.currency,
    required this.orderCount,
    required this.itemCount,
    required this.subtotalMinor,
    required this.paidMinor,
    required this.balanceMinor,
    required this.calculatedAt,
  });

  factory ConsumptionSummary.fromCallableData(Object? value) {
    if (value is! Map) {
      throw const ConsumptionException(ConsumptionFailure.unavailable);
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {
      'sessionId',
      'tableId',
      'sessionStatus',
      'currency',
      'orderCount',
      'itemCount',
      'subtotalMinor',
      'paidMinor',
      'balanceMinor',
      'calculatedAt',
    };
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty) {
      throw const ConsumptionException(ConsumptionFailure.unavailable);
    }
    try {
      final statusIndex = tableSessionStatusWireValues.indexOf(
        data['sessionStatus'],
      );
      if (statusIndex < 0) throw const FormatException();
      final orderCount = data['orderCount'];
      final itemCount = data['itemCount'];
      if (orderCount is! int ||
          orderCount < 0 ||
          itemCount is! int ||
          itemCount < 0) {
        throw const FormatException();
      }
      final subtotal = parseMinorAmount(data['subtotalMinor'], 'subtotalMinor');
      final paid = parseMinorAmount(data['paidMinor'], 'paidMinor');
      final balance = parseMinorAmount(data['balanceMinor'], 'balanceMinor');
      if (subtotal - paid != balance) throw const FormatException();
      return ConsumptionSummary(
        sessionId: parseContractId(data['sessionId'], 'sessionId'),
        tableId: parseContractId(data['tableId'], 'tableId'),
        sessionStatus: TableSessionStatus.values[statusIndex],
        currency: parseCurrency(data['currency']),
        orderCount: orderCount,
        itemCount: itemCount,
        subtotalMinor: subtotal,
        paidMinor: paid,
        balanceMinor: balance,
        calculatedAt: parseIsoTimestamp(data['calculatedAt']),
      );
    } on FormatException {
      throw const ConsumptionException(ConsumptionFailure.unavailable);
    }
  }

  final String sessionId;
  final String tableId;
  final TableSessionStatus sessionStatus;
  final String currency;
  final int orderCount;
  final int itemCount;
  final int subtotalMinor;
  final int paidMinor;
  final int balanceMinor;
  final DateTime calculatedAt;
}

abstract interface class ConsumptionGateway {
  Future<ConsumptionSummary> get({required QrSessionAccess session});
}

final class UnavailableConsumptionGateway implements ConsumptionGateway {
  const UnavailableConsumptionGateway();

  @override
  Future<ConsumptionSummary> get({required QrSessionAccess session}) =>
      throw const ConsumptionException(ConsumptionFailure.unavailable);
}
