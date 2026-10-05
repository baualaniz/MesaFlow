import '../contracts/domain_contracts.dart';

final class TrackedOrder {
  const TrackedOrder({required this.id, required this.order});

  final String id;
  final OrderContract order;
}

abstract interface class OrderTrackingRepository {
  Stream<List<TrackedOrder>> watchSession({
    required String establishmentId,
    required String sessionId,
  });
}

final class EmptyOrderTrackingRepository implements OrderTrackingRepository {
  const EmptyOrderTrackingRepository();

  @override
  Stream<List<TrackedOrder>> watchSession({
    required String establishmentId,
    required String sessionId,
  }) => Stream.value(const []);
}
