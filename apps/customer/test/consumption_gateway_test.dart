import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/consumption/consumption_gateway.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

void main() {
  final valid = <String, Object?>{
    'sessionId': 'sesion-prueba',
    'tableId': 'mesa-01',
    'sessionStatus': 'open',
    'currency': 'ARS',
    'orderCount': 2,
    'itemCount': 3,
    'subtotalMinor': 2560000,
    'paidMinor': 620000,
    'balanceMinor': 1940000,
    'calculatedAt': '2026-09-17T12:15:00.000Z',
  };

  test('interpreta un resumen de consumo exacto', () {
    final summary = ConsumptionSummary.fromCallableData(valid);
    expect(summary.sessionStatus, TableSessionStatus.open);
    expect(summary.orderCount, 2);
    expect(summary.itemCount, 3);
    expect(summary.balanceMinor, 1940000);
  });

  test('rechaza totales incoherentes, campos extra y estados desconocidos', () {
    for (final response in [
      {...valid, 'balanceMinor': 1},
      {...valid, 'unexpected': true},
      {...valid, 'sessionStatus': 'unknown'},
    ]) {
      expect(
        () => ConsumptionSummary.fromCallableData(response),
        throwsA(isA<ConsumptionException>()),
      );
    }
  });
}
