import 'dart:convert';

import '../contracts/domain_contracts.dart';

class CartScope {
  factory CartScope({
    required String establishmentId,
    required String sessionId,
  }) => CartScope._(
    establishmentId: parseContractId(establishmentId, 'establishmentId'),
    sessionId: parseContractId(sessionId, 'sessionId'),
  );

  const CartScope._({required this.establishmentId, required this.sessionId});

  final String establishmentId;
  final String sessionId;
}

class CartDraftItem {
  factory CartDraftItem({
    required String productId,
    required int quantity,
    String? notes,
  }) {
    final safeProductId = parseContractId(productId, 'productId');
    if (quantity < 1 || quantity > maxItemQuantity) {
      throw const FormatException('quantity está fuera del límite permitido.');
    }
    final normalizedNotes = notes?.trim();
    if (normalizedNotes != null &&
        normalizedNotes.isNotEmpty &&
        normalizedNotes.length > maxItemNotesLength) {
      throw const FormatException('notes supera el límite permitido.');
    }
    return CartDraftItem._(
      productId: safeProductId,
      quantity: quantity,
      notes: normalizedNotes == null || normalizedNotes.isEmpty
          ? null
          : normalizedNotes,
    );
  }

  factory CartDraftItem.fromJson(Object? value) {
    if (value is! Map) {
      throw const FormatException('Cada línea del carrito debe ser un objeto.');
    }
    final data = value.map((key, item) => MapEntry(key.toString(), item));
    const fields = {'productId', 'quantity', 'notes'};
    if (data.keys.toSet().difference(fields).isNotEmpty ||
        fields.difference(data.keys.toSet()).isNotEmpty ||
        data['productId'] is! String ||
        data['quantity'] is! int ||
        (data['notes'] != null && data['notes'] is! String)) {
      throw const FormatException(
        'La línea persistida no respeta el contrato.',
      );
    }
    return CartDraftItem(
      productId: data['productId']! as String,
      quantity: data['quantity']! as int,
      notes: data['notes'] as String?,
    );
  }

  const CartDraftItem._({
    required this.productId,
    required this.quantity,
    required this.notes,
  });

  final String productId;
  final int quantity;
  final String? notes;

  Map<String, Object?> toJson() => {
    'productId': productId,
    'quantity': quantity,
    'notes': notes,
  };
}

abstract interface class CartStore {
  Future<List<CartDraftItem>> read(CartScope scope);

  Future<void> write(CartScope scope, List<CartDraftItem> items);

  Future<void> clear(CartScope scope);
}

final class EphemeralCartStore implements CartStore {
  const EphemeralCartStore();

  @override
  Future<List<CartDraftItem>> read(CartScope scope) async => const [];

  @override
  Future<void> write(CartScope scope, List<CartDraftItem> items) async {}

  @override
  Future<void> clear(CartScope scope) async {}
}

String encodeCartDocument(CartScope scope, List<CartDraftItem> items) {
  if (items.length > maxOrderItems) {
    throw const FormatException('El carrito supera el máximo de líneas.');
  }
  return jsonEncode({
    'schemaVersion': 1,
    'establishmentId': scope.establishmentId,
    'sessionId': scope.sessionId,
    'items': items.map((item) => item.toJson()).toList(growable: false),
  });
}

List<CartDraftItem> decodeCartDocument(String raw, CartScope scope) {
  final Object? decoded;
  try {
    decoded = jsonDecode(raw);
  } on FormatException {
    throw const FormatException(
      'El carrito persistido no contiene JSON válido.',
    );
  }
  if (decoded is! Map) {
    throw const FormatException('El carrito persistido debe ser un objeto.');
  }
  final data = decoded.map((key, value) => MapEntry(key.toString(), value));
  const fields = {'schemaVersion', 'establishmentId', 'sessionId', 'items'};
  final rawItems = data['items'];
  if (data.keys.toSet().difference(fields).isNotEmpty ||
      fields.difference(data.keys.toSet()).isNotEmpty ||
      data['schemaVersion'] != 1 ||
      data['establishmentId'] != scope.establishmentId ||
      data['sessionId'] != scope.sessionId ||
      rawItems is! List ||
      rawItems.length > maxOrderItems) {
    throw const FormatException('El carrito persistido no respeta su sesión.');
  }
  return rawItems.map(CartDraftItem.fromJson).toList(growable: false);
}
