import 'package:cloud_firestore/cloud_firestore.dart';

import '../contracts/domain_contracts.dart';
import 'order_tracking_repository.dart';

final class FirestoreOrderTrackingRepository
    implements OrderTrackingRepository {
  FirestoreOrderTrackingRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  @override
  Stream<List<TrackedOrder>> watchSession({
    required String establishmentId,
    required String sessionId,
  }) {
    final safeEstablishmentId = parseContractId(
      establishmentId,
      'establishmentId',
    );
    final safeSessionId = parseContractId(sessionId, 'sessionId');
    return _firestore
        .collection('establishments')
        .doc(safeEstablishmentId)
        .collection('orders')
        .where('sessionId', isEqualTo: safeSessionId)
        .orderBy('createdAt')
        .snapshots()
        .map(
          (snapshot) => List.unmodifiable(
            snapshot.docs.map(
              (document) => trackedOrderFromFirestore(
                document.id,
                document.data(),
                establishmentId: safeEstablishmentId,
                sessionId: safeSessionId,
              ),
            ),
          ),
        );
  }
}

TrackedOrder trackedOrderFromFirestore(
  String documentId,
  Map<String, Object?> data, {
  required String establishmentId,
  required String sessionId,
}) {
  final json = Map<String, Object?>.from(data);
  json['createdAt'] = _timestampToIso(json['createdAt'], 'createdAt');
  json['updatedAt'] = _timestampToIso(json['updatedAt'], 'updatedAt');
  final rawStatusTimestamps = json['statusTimestamps'];
  if (rawStatusTimestamps is! Map) {
    throw const FormatException('statusTimestamps debe ser un objeto.');
  }
  json['statusTimestamps'] = rawStatusTimestamps.map((key, value) {
    if (key is! String) {
      throw const FormatException('El estado debe ser texto.');
    }
    return MapEntry(key, _timestampToIso(value, 'statusTimestamps.$key'));
  });
  final order = OrderContract.fromJson(json);
  if (order.establishmentId != establishmentId ||
      order.sessionId != sessionId) {
    throw const FormatException('El pedido no pertenece a la sesión esperada.');
  }
  return TrackedOrder(id: parseContractId(documentId, 'orderId'), order: order);
}

String _timestampToIso(Object? value, String label) {
  if (value is! Timestamp) {
    throw FormatException('$label debe ser un Timestamp de Firestore.');
  }
  final timestamp = value.toDate().toUtc();
  return DateTime.fromMillisecondsSinceEpoch(
    timestamp.millisecondsSinceEpoch,
    isUtc: true,
  ).toIso8601String();
}
