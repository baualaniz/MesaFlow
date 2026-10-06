import '../contracts/domain_contracts.dart';
import '../session/qr_session.dart';

enum PaymentFailure {
  balanceUnavailable,
  inProgress,
  sessionUnavailable,
  providerUnavailable,
  unavailable,
}

final class PaymentException implements Exception {
  const PaymentException(this.failure);

  final PaymentFailure failure;
}

final class PaymentPreference {
  const PaymentPreference({
    required this.intentId,
    required this.preferenceId,
    required this.checkoutUrl,
    required this.amountMinor,
    required this.currency,
  });

  factory PaymentPreference.fromCallableData(Object? value) {
    if (value is! Map) {
      throw const PaymentException(PaymentFailure.unavailable);
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {
      'intentId',
      'preferenceId',
      'checkoutUrl',
      'amountMinor',
      'currency',
      'status',
    };
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty ||
        data['status'] != 'ready') {
      throw const PaymentException(PaymentFailure.unavailable);
    }
    try {
      final checkoutUrl = Uri.parse(data['checkoutUrl'] as String);
      if (checkoutUrl.scheme != 'https' ||
          !(checkoutUrl.host == 'mercadopago.com' ||
              checkoutUrl.host.endsWith('.mercadopago.com'))) {
        throw const FormatException();
      }
      return PaymentPreference(
        intentId: parseContractId(data['intentId'], 'intentId'),
        preferenceId: parseContractId(data['preferenceId'], 'preferenceId'),
        checkoutUrl: checkoutUrl,
        amountMinor: parseMinorAmount(data['amountMinor'], 'amountMinor'),
        currency: parseCurrency(data['currency']),
      );
    } on Object {
      throw const PaymentException(PaymentFailure.unavailable);
    }
  }

  final String intentId;
  final String preferenceId;
  final Uri checkoutUrl;
  final int amountMinor;
  final String currency;
}

abstract interface class PaymentGateway {
  Future<PaymentPreference> create({required QrSessionAccess session});
}

final class UnavailablePaymentGateway implements PaymentGateway {
  const UnavailablePaymentGateway();

  @override
  Future<PaymentPreference> create({required QrSessionAccess session}) =>
      throw const PaymentException(PaymentFailure.unavailable);
}
