import 'package:mesaflow_customer/src/consumption/consumption_gateway.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

final class TestConsumptionGateway implements ConsumptionGateway {
  TestConsumptionGateway({this.failure, ConsumptionSummary? summary})
    : summary = summary ?? testConsumptionSummary();

  final ConsumptionFailure? failure;
  final ConsumptionSummary summary;
  int calls = 0;

  @override
  Future<ConsumptionSummary> get({required QrSessionAccess session}) async {
    calls += 1;
    if (failure case final failure?) throw ConsumptionException(failure);
    return summary;
  }
}

ConsumptionSummary testConsumptionSummary() => ConsumptionSummary(
  sessionId: 'sesion-prueba',
  tableId: 'mesa-01',
  sessionStatus: TableSessionStatus.open,
  currency: 'ARS',
  orderCount: 2,
  itemCount: 3,
  subtotalMinor: 2560000,
  paidMinor: 620000,
  balanceMinor: 1940000,
  calculatedAt: DateTime.utc(2026, 9, 17, 12, 15),
);
