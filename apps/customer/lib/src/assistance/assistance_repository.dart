import '../contracts/domain_contracts.dart';

abstract interface class AssistanceRepository {
  Stream<AssistanceRequestContract?> watchCurrent({
    required String establishmentId,
    required String sessionId,
  });
}

final class EmptyAssistanceRepository implements AssistanceRepository {
  const EmptyAssistanceRepository();

  @override
  Stream<AssistanceRequestContract?> watchCurrent({
    required String establishmentId,
    required String sessionId,
  }) => Stream.value(null);
}
