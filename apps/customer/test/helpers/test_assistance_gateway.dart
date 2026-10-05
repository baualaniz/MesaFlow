import 'package:mesaflow_customer/src/assistance/assistance_gateway.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

final class TestAssistanceGateway implements AssistanceGateway {
  TestAssistanceGateway({this.failure});

  final AssistanceFailure? failure;
  final List<AssistanceType> createdTypes = [];
  int cancelCount = 0;

  @override
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  }) async {
    createdTypes.add(type);
    if (failure case final failure?) throw AssistanceException(failure);
    return _result(type: type, status: AssistanceStatus.pending);
  }

  @override
  Future<AssistanceActionResult> cancel({
    required QrSessionAccess session,
  }) async {
    cancelCount += 1;
    if (failure case final failure?) throw AssistanceException(failure);
    return _result(
      type: AssistanceType.waiter,
      status: AssistanceStatus.cancelled,
    );
  }

  AssistanceActionResult _result({
    required AssistanceType type,
    required AssistanceStatus status,
  }) => AssistanceActionResult(
    requestId: 'sesion-prueba',
    type: type,
    status: status,
    createdAt: DateTime.utc(2026, 9, 17, 12, 15),
    updatedAt: DateTime.utc(2026, 9, 17, 12, 15),
  );
}
