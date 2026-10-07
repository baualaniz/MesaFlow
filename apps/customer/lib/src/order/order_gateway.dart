import '../models/product_selection.dart';
import '../session/qr_session.dart';

enum OrderFailure {
  invalidCart,
  orderingDisabled,
  productUnavailable,
  sessionUnavailable,
  unavailable,
}

final class OrderException implements Exception {
  const OrderException(this.failure);

  final OrderFailure failure;
}

final class CreatedOrder {
  const CreatedOrder({
    required this.id,
    required this.itemCount,
    required this.totalMinor,
    required this.currency,
    required this.createdAt,
  });

  final String id;
  final int itemCount;
  final int totalMinor;
  final String currency;
  final DateTime createdAt;

  factory CreatedOrder.fromCallableData(Object? value) {
    if (value is! Map) {
      throw const OrderException(OrderFailure.unavailable);
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {
      'orderId',
      'status',
      'itemCount',
      'totalMinor',
      'currency',
      'createdAt',
    };
    final createdAt = DateTime.tryParse(data['createdAt'] as String? ?? '');
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty ||
        data['orderId'] is! String ||
        !RegExp(r'^[a-f0-9]{64}$').hasMatch(data['orderId'] as String) ||
        data['status'] != 'created' ||
        data['itemCount'] is! int ||
        (data['itemCount'] as int) < 1 ||
        data['totalMinor'] is! int ||
        (data['totalMinor'] as int) < 0 ||
        data['currency'] is! String ||
        !RegExp(r'^[A-Z]{3}$').hasMatch(data['currency'] as String) ||
        createdAt == null ||
        !createdAt.isUtc) {
      throw const OrderException(OrderFailure.unavailable);
    }
    return CreatedOrder(
      id: data['orderId']! as String,
      itemCount: data['itemCount']! as int,
      totalMinor: data['totalMinor']! as int,
      currency: data['currency']! as String,
      createdAt: createdAt,
    );
  }
}

abstract interface class OrderGateway {
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  });
}

final class UnavailableOrderGateway implements OrderGateway {
  const UnavailableOrderGateway();

  @override
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) => throw const OrderException(OrderFailure.unavailable);
}
