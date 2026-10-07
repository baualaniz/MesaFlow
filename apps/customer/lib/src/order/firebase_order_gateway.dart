import 'package:cloud_functions/cloud_functions.dart';

import '../models/product_selection.dart';
import '../session/qr_session.dart';
import 'order_gateway.dart';

final class FirebaseOrderGateway implements OrderGateway {
  FirebaseOrderGateway({FirebaseFunctions? functions})
    : _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: 'southamerica-east1');

  final FirebaseFunctions _functions;

  @override
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) async {
    try {
      final result = await _functions.httpsCallable('createOrder').call({
        'establishmentId': session.establishmentId,
        'sessionId': session.sessionId,
        'tableId': session.tableId,
        'requestId': requestId,
        'items': lines
            .map(
              (line) => {
                'productId': line.product.id,
                'quantity': line.quantity,
                'notes': line.notes,
              },
            )
            .toList(growable: false),
      });
      return CreatedOrder.fromCallableData(result.data);
    } on FirebaseFunctionsException catch (error) {
      final details = error.details;
      final reason = details is Map ? details['reason'] : null;
      throw OrderException(switch (reason) {
        'invalid-cart' => OrderFailure.invalidCart,
        'ordering-disabled' => OrderFailure.orderingDisabled,
        'product-unavailable' => OrderFailure.productUnavailable,
        'session-unavailable' => OrderFailure.sessionUnavailable,
        _ => switch (error.code) {
          'invalid-argument' => OrderFailure.invalidCart,
          'failed-precondition' => OrderFailure.productUnavailable,
          'permission-denied' ||
          'unauthenticated' => OrderFailure.sessionUnavailable,
          _ => OrderFailure.unavailable,
        },
      });
    } on OrderException {
      rethrow;
    } catch (_) {
      throw const OrderException(OrderFailure.unavailable);
    }
  }
}
