import 'package:cloud_firestore/cloud_firestore.dart';

import '../contracts/domain_contracts.dart';
import 'assistance_repository.dart';

final class FirestoreAssistanceRepository implements AssistanceRepository {
  FirestoreAssistanceRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  @override
  Stream<AssistanceRequestContract?> watchCurrent({
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
        .collection('assistanceRequests')
        .doc(safeSessionId)
        .snapshots()
        .map((snapshot) {
          final data = snapshot.data();
          if (!snapshot.exists || data == null) return null;
          return assistanceRequestFromFirestore(
            data,
            establishmentId: safeEstablishmentId,
            sessionId: safeSessionId,
          );
        });
  }
}

AssistanceRequestContract assistanceRequestFromFirestore(
  Map<String, Object?> data, {
  required String establishmentId,
  required String sessionId,
}) {
  final json = Map<String, Object?>.from(data);
  json['createdAt'] = _timestampToIso(json['createdAt'], 'createdAt');
  json['updatedAt'] = _timestampToIso(json['updatedAt'], 'updatedAt');
  final request = AssistanceRequestContract.fromJson(json);
  if (request.establishmentId != establishmentId ||
      request.sessionId != sessionId) {
    throw const FormatException(
      'La solicitud no pertenece a la sesión esperada.',
    );
  }
  return request;
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
