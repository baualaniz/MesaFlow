import 'package:cloud_functions/cloud_functions.dart';

import '../session/qr_session.dart';
import 'consumption_gateway.dart';

final class FirebaseConsumptionGateway implements ConsumptionGateway {
  FirebaseConsumptionGateway({FirebaseFunctions? functions})
    : _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: 'southamerica-east1');

  final FirebaseFunctions _functions;

  @override
  Future<ConsumptionSummary> get({required QrSessionAccess session}) async {
    try {
      final result = await _functions
          .httpsCallable('getSessionConsumption')
          .call({
            'establishmentId': session.establishmentId,
            'sessionId': session.sessionId,
            'tableId': session.tableId,
          });
      final summary = ConsumptionSummary.fromCallableData(result.data);
      if (summary.sessionId != session.sessionId ||
          summary.tableId != session.tableId) {
        throw const ConsumptionException(ConsumptionFailure.unavailable);
      }
      return summary;
    } on FirebaseFunctionsException catch (error) {
      final details = error.details;
      final reason = details is Map ? details['reason'] : null;
      throw ConsumptionException(switch (reason) {
        'consumption-inconsistent' => ConsumptionFailure.inconsistent,
        'session-unavailable' => ConsumptionFailure.sessionUnavailable,
        _ => switch (error.code) {
          'permission-denied' ||
          'unauthenticated' => ConsumptionFailure.sessionUnavailable,
          _ => ConsumptionFailure.unavailable,
        },
      });
    } on ConsumptionException {
      rethrow;
    } catch (_) {
      throw const ConsumptionException(ConsumptionFailure.unavailable);
    }
  }
}
