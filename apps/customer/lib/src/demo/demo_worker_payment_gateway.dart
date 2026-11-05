import 'dart:convert';

import 'package:http/http.dart' as http;

import '../payment/payment_gateway.dart';
import '../session/qr_session.dart';
import 'demo_customer_backend.dart';

PaymentGateway createDemoPaymentGateway({
  required DemoCustomerBackend backend,
  http.Client? client,
}) {
  const rawEndpoint = String.fromEnvironment('MESAFLOW_DEMO_PAYMENT_API_URL');
  final endpoint = Uri.tryParse(rawEndpoint);
  if (endpoint == null ||
      endpoint.scheme != 'https' ||
      !endpoint.host.endsWith('.workers.dev') ||
      endpoint.path != '/preferences') {
    return const UnavailablePaymentGateway();
  }
  return DemoWorkerPaymentGateway(
    endpoint: endpoint,
    itemsProvider: () => backend.paymentItems,
    client: client,
  );
}

final class DemoWorkerPaymentGateway implements PaymentGateway {
  DemoWorkerPaymentGateway({
    required this.endpoint,
    required this.itemsProvider,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final Uri endpoint;
  final List<DemoPaymentItem> Function() itemsProvider;
  final http.Client _client;

  @override
  Future<PaymentPreference> create({required QrSessionAccess session}) async {
    final items = itemsProvider();
    if (items.isEmpty) {
      throw const PaymentException(PaymentFailure.balanceUnavailable);
    }
    try {
      final response = await _client
          .post(
            endpoint,
            headers: const {
              'Content-Type': 'application/json',
              'X-MesaFlow-Client': 'demo-v1',
            },
            body: jsonEncode({
              'sessionId': session.sessionId,
              'tableId': session.tableId,
              'items': items
                  .map(
                    (item) => {
                      'productId': item.productId,
                      'quantity': item.quantity,
                    },
                  )
                  .toList(growable: false),
            }),
          )
          .timeout(const Duration(seconds: 15));
      if (response.statusCode != 200) {
        throw const PaymentException(PaymentFailure.providerUnavailable);
      }
      return PaymentPreference.fromCallableData(
        jsonDecode(utf8.decode(response.bodyBytes)),
      );
    } on PaymentException {
      rethrow;
    } on Object {
      throw const PaymentException(PaymentFailure.unavailable);
    }
  }
}
