import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

File _fixture(String name) {
  for (final path in [
    '../../packages/contracts/fixtures/$name',
    'packages/contracts/fixtures/$name',
  ]) {
    final file = File(path);
    if (file.existsSync()) return file;
  }
  throw StateError('No se encontró el fixture $name.');
}

Map<String, Object?> _readObject(String name) {
  final decoded = jsonDecode(_fixture(name).readAsStringSync());
  return (decoded as Map).cast<String, Object?>();
}

Map<String, Object?> _object(Object? value) =>
    (value! as Map).cast<String, Object?>();

void main() {
  final spec = _readObject('contract-spec.json');
  final fixtures = _readObject('domain-fixtures.json');

  test('enums Dart coinciden con la especificación canónica', () {
    final enums = _object(spec['enums']);
    expect(roleWireValues, enums['role']);
    expect(orderStatusWireValues, enums['orderStatus']);
    expect(tableSessionStatusWireValues, enums['tableSessionStatus']);
    expect(paymentStatusWireValues, enums['paymentStatus']);
    expect(assistanceTypeWireValues, enums['assistanceType']);
    expect(assistanceStatusWireValues, enums['assistanceStatus']);
  });

  test('límites Dart coinciden con la especificación', () {
    final limits = _object(spec['limits']);
    expect(maxMinorAmount, limits['maxMinorAmount']);
    expect(maxOrderItems, limits['maxOrderItems']);
    expect(maxItemQuantity, limits['maxItemQuantity']);
    expect(maxItemNotesLength, limits['maxItemNotesLength']);
    expect(currencyFractionDigits, limits['currencyFractionDigits']);
  });

  test('dinero conserva minor units y decimal determinista', () {
    for (final raw in fixtures['moneyCases']! as List) {
      final fixture = _object(raw);
      final money = Money.fromJson({
        'amountMinor': fixture['amountMinor'],
        'currency': fixture['currency'],
      });
      expect(money.toDecimalString(), fixture['decimal']);
    }
  });

  test('dinero inválido se rechaza', () {
    final invalid = _object(fixtures['invalid']);
    for (final raw in invalid['money']! as List) {
      expect(() => Money.fromJson(_object(raw)), throwsFormatException);
    }
  });

  test('timestamps requieren UTC RFC3339 con milisegundos', () {
    for (final raw in fixtures['timestampCases']! as List) {
      expect(parseIsoTimestamp(raw).toIso8601String(), raw);
    }
    final invalid = _object(fixtures['invalid']);
    for (final raw in invalid['timestamps']! as List) {
      expect(() => parseIsoTimestamp(raw), throwsFormatException);
    }
  });

  test('producto válido no acepta campos desconocidos', () {
    final productJson = _object(fixtures['product']);
    final product = ProductContract.fromJson(productJson);
    expect(product.name, 'Burger de la casa');
    expect(product.price.amountMinor, 1290000);
    expect(
      () => ProductContract.fromJson({...productJson, 'unexpected': true}),
      throwsFormatException,
    );
  });

  test('pedido valida líneas, totales, enums y timestamp de estado', () {
    final orderJson = _object(fixtures['order']);
    final order = OrderContract.fromJson(orderJson);
    expect(order.items, hasLength(1));
    expect(order.totalMinor, 1290000);

    final badTotal = jsonDecode(jsonEncode(orderJson)) as Map;
    badTotal['totalMinor'] = 1;
    expect(
      () => OrderContract.fromJson(badTotal.cast<String, Object?>()),
      throwsFormatException,
    );

    final badStatus = jsonDecode(jsonEncode(orderJson)) as Map;
    badStatus['status'] = 'paid';
    expect(
      () => OrderContract.fromJson(badStatus.cast<String, Object?>()),
      throwsFormatException,
    );

    final noTimestamp = jsonDecode(jsonEncode(orderJson)) as Map;
    noTimestamp['statusTimestamps'] = <String, Object?>{};
    expect(
      () => OrderContract.fromJson(noTimestamp.cast<String, Object?>()),
      throwsFormatException,
    );
  });

  test('asistencia valida tipo, estado e identidades', () {
    final json = _object(fixtures['assistanceRequest']);
    final request = AssistanceRequestContract.fromJson(json);
    expect(request.type, AssistanceType.waiter);
    expect(request.status, AssistanceStatus.pending);
    expect(request.isActive, isTrue);
    expect(
      () => AssistanceRequestContract.fromJson({...json, 'type': 'kitchen'}),
      throwsFormatException,
    );
  });
}
