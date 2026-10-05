import 'package:cloud_functions/cloud_functions.dart';

import '../contracts/domain_contracts.dart';
import '../session/qr_session.dart';
import 'assistance_gateway.dart';

final class FirebaseAssistanceGateway implements AssistanceGateway {
  FirebaseAssistanceGateway({FirebaseFunctions? functions})
    : _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: 'southamerica-east1');

  final FirebaseFunctions _functions;

  Map<String, String> _context(QrSessionAccess session) => {
    'establishmentId': session.establishmentId,
    'sessionId': session.sessionId,
    'tableId': session.tableId,
  };

  @override
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  }) => _call('createAssistanceRequest', {
    ..._context(session),
    'type': assistanceTypeWireValues[type.index],
  });

  @override
  Future<AssistanceActionResult> cancel({required QrSessionAccess session}) =>
      _call('cancelAssistanceRequest', _context(session));

  Future<AssistanceActionResult> _call(
    String callable,
    Map<String, String> data,
  ) async {
    try {
      final result = await _functions.httpsCallable(callable).call(data);
      return AssistanceActionResult.fromCallableData(result.data);
    } on FirebaseFunctionsException catch (error) {
      final details = error.details;
      final reason = details is Map ? details['reason'] : null;
      throw AssistanceException(switch (reason) {
        'assistance-disabled' => AssistanceFailure.disabled,
        'rate-limited' => AssistanceFailure.rateLimited,
        'request-in-progress' => AssistanceFailure.requestInProgress,
        'request-unavailable' => AssistanceFailure.requestUnavailable,
        'session-unavailable' => AssistanceFailure.sessionUnavailable,
        _ => switch (error.code) {
          'permission-denied' ||
          'unauthenticated' => AssistanceFailure.sessionUnavailable,
          _ => AssistanceFailure.unavailable,
        },
      });
    } on AssistanceException {
      rethrow;
    } catch (_) {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
  }
}
