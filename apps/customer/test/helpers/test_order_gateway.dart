import 'package:mesaflow_customer/src/models/product_selection.dart';
import 'package:mesaflow_customer/src/order/order_gateway.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';

final class TestOrderGateway implements OrderGateway {
  TestOrderGateway({this.failure, this.failuresRemaining = 0});

  final OrderFailure? failure;
  int failuresRemaining;
  final List<String> requestIds = [];
  final List<List<ProductSelection>> submittedLines = [];

  @override
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) async {
    requestIds.add(requestId);
    submittedLines.add(List.unmodifiable(lines));
    if (failure != null && failuresRemaining > 0) {
      failuresRemaining -= 1;
      throw OrderException(failure!);
    }
    return CreatedOrder(
      id: 'a' * 64,
      itemCount: lines.fold(0, (sum, line) => sum + line.quantity),
      totalMinor: lines.fold(
        0,
        (sum, line) => sum + line.lineTotal.amountMinor,
      ),
      currency: lines.first.product.price.currency,
      createdAt: DateTime.utc(2026, 9, 17, 12, 15),
    );
  }
}
