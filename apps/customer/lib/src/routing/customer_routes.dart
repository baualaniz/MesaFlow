import 'package:go_router/go_router.dart';

abstract final class CustomerRoutes {
  static const entry = '/';
  static const invalidLink = '/enlace-invalido';
  static const tablePattern = '/e/:slug/table/:tableId';
  static const paymentReturnPattern = '/payment/:result';
  static const demoEstablishmentSlug = 'mesa-flow-demo';
  static const demoTableId = 'mesa-01';
  static const demoQrToken = '6d657361666c6f772d64656d6f2d3031';

  static String table({required String slug, required String tableId}) =>
      '/${Uri(pathSegments: ['e', slug, 'table', tableId]).path}';

  static String get demoTable =>
      table(slug: demoEstablishmentSlug, tableId: demoTableId);

  static String get demoQrLocation => Uri(
    path: demoTable,
    queryParameters: const {'token': demoQrToken},
  ).toString();
}

enum PaymentReturnResult { success, pending, failure }

extension PaymentReturnResultParsing on PaymentReturnResult {
  static PaymentReturnResult? tryParse(String? value) => switch (value) {
    'success' => PaymentReturnResult.success,
    'pending' => PaymentReturnResult.pending,
    'failure' => PaymentReturnResult.failure,
    _ => null,
  };
}

String? safePaymentReturnLocation(String? value) {
  if (value == null) return null;
  final uri = Uri.tryParse(value);
  if (uri == null ||
      uri.hasScheme ||
      uri.hasAuthority ||
      uri.query.isNotEmpty ||
      uri.fragment.isNotEmpty ||
      uri.pathSegments.length != 4 ||
      uri.pathSegments[0] != 'e' ||
      uri.pathSegments[2] != 'table') {
    return null;
  }
  final route = CustomerTableRoute.tryParse({
    'slug': uri.pathSegments[1],
    'tableId': uri.pathSegments[3],
  });
  return route?.location;
}

final class CustomerTableRoute {
  const CustomerTableRoute({
    required this.establishmentSlug,
    required this.tableId,
  });

  final String establishmentSlug;
  final String tableId;

  static final RegExp _slugPattern = RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$');

  static CustomerTableRoute? tryParse(Map<String, String> parameters) {
    final slug = parameters['slug'];
    final tableId = parameters['tableId'];
    if (!_isSafeSegment(slug) || !_isSafeSegment(tableId)) return null;
    return CustomerTableRoute(establishmentSlug: slug!, tableId: tableId!);
  }

  static bool _isSafeSegment(String? value) =>
      value != null && value.length <= 64 && _slugPattern.hasMatch(value);

  String get location =>
      CustomerRoutes.table(slug: establishmentSlug, tableId: tableId);

  String get tableLabel {
    final match = RegExp(r'^mesa-(\d+)$').firstMatch(tableId);
    final number = match == null ? null : int.tryParse(match.group(1)!);
    return number == null ? tableId : 'Mesa $number';
  }

  @override
  bool operator ==(Object other) =>
      other is CustomerTableRoute &&
      other.establishmentSlug == establishmentSlug &&
      other.tableId == tableId;

  @override
  int get hashCode => Object.hash(establishmentSlug, tableId);
}

/// Valida el contexto que llega desde el enlace QR.
///
/// Esta guarda no concede acceso a datos: el canje autenticado del token QR se
/// implementa en la Etapa 20. Aquí solo se impide montar pantallas de mesa con
/// segmentos ausentes o inseguros.
abstract final class CustomerSessionRouteGuard {
  static String? redirect(GoRouterState state) =>
      CustomerTableRoute.tryParse(state.pathParameters) == null
      ? CustomerRoutes.invalidLink
      : null;

  static CustomerTableRoute requireContext(GoRouterState state) {
    final route = CustomerTableRoute.tryParse(state.pathParameters);
    if (route == null) {
      throw StateError('La ruta no contiene un contexto de mesa válido.');
    }
    return route;
  }
}
