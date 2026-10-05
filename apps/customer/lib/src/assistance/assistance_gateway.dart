import '../contracts/domain_contracts.dart';
import '../session/qr_session.dart';

enum AssistanceFailure {
  disabled,
  rateLimited,
  requestInProgress,
  requestUnavailable,
  sessionUnavailable,
  unavailable,
}

final class AssistanceException implements Exception {
  const AssistanceException(this.failure);

  final AssistanceFailure failure;
}

final class AssistanceActionResult {
  const AssistanceActionResult({
    required this.requestId,
    required this.type,
    required this.status,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AssistanceActionResult.fromCallableData(Object? value) {
    if (value is! Map) {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {'requestId', 'type', 'status', 'createdAt', 'updatedAt'};
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty) {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
    final typeIndex = assistanceTypeWireValues.indexOf(data['type']);
    final statusIndex = assistanceStatusWireValues.indexOf(data['status']);
    DateTime createdAt;
    DateTime updatedAt;
    try {
      parseContractId(data['requestId'], 'requestId');
      createdAt = parseIsoTimestamp(data['createdAt']);
      updatedAt = parseIsoTimestamp(data['updatedAt']);
    } on FormatException {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
    if (typeIndex < 0 || statusIndex < 0) {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
    return AssistanceActionResult(
      requestId: data['requestId']! as String,
      type: AssistanceType.values[typeIndex],
      status: AssistanceStatus.values[statusIndex],
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  final String requestId;
  final AssistanceType type;
  final AssistanceStatus status;
  final DateTime createdAt;
  final DateTime updatedAt;
}

abstract interface class AssistanceGateway {
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  });

  Future<AssistanceActionResult> cancel({required QrSessionAccess session});
}

final class UnavailableAssistanceGateway implements AssistanceGateway {
  const UnavailableAssistanceGateway();

  @override
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  }) => throw const AssistanceException(AssistanceFailure.unavailable);

  @override
  Future<AssistanceActionResult> cancel({required QrSessionAccess session}) =>
      throw const AssistanceException(AssistanceFailure.unavailable);
}
