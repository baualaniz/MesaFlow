import 'package:cloud_functions/cloud_functions.dart';

import '../session/qr_session.dart';
import 'payment_gateway.dart';

final class FirebasePaymentGateway implements PaymentGateway {
  FirebasePaymentGateway({FirebaseFunctions? functions})
    : _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: 'southamerica-east1');

  final FirebaseFunctions _functions;

  @override
  Future<PaymentPreference> create({required QrSessionAccess session}) async {
    try {
      final result = await _functions
          .httpsCallable('createPaymentPreference')
          .call({
            'establishmentId': session.establishmentId,
            'sessionId': session.sessionId,
            'tableId': session.tableId,
          });
      return PaymentPreference.fromCallableData(result.data);
    } on FirebaseFunctionsException catch (error) {
      final details = error.details;
      final reason = details is Map ? details['reason'] : null;
      throw PaymentException(switch (reason) {
        'balance-unavailable' => PaymentFailure.balanceUnavailable,
        'preference-in-progress' => PaymentFailure.inProgress,
        'provider-unavailable' => PaymentFailure.providerUnavailable,
        'session-unavailable' => PaymentFailure.sessionUnavailable,
        _ => switch (error.code) {
          'permission-denied' ||
          'unauthenticated' => PaymentFailure.sessionUnavailable,
          _ => PaymentFailure.unavailable,
        },
      });
    } on PaymentException {
      rethrow;
    } catch (_) {
      throw const PaymentException(PaymentFailure.unavailable);
    }
  }
}
