enum UserRole { owner, manager, staff, kitchen }

enum OrderStatus {
  created,
  confirmed,
  preparing,
  ready,
  delivered,
  completed,
  cancelled,
}

enum TableSessionStatus { open, paymentPending, paid, closed, cancelled }

enum PaymentStatus {
  pending,
  approved,
  rejected,
  cancelled,
  refunded,
  chargedBack,
}

enum AssistanceType { waiter, bill, other }

enum AssistanceStatus { pending, acknowledged, resolved, cancelled }

const roleWireValues = ['owner', 'manager', 'staff', 'kitchen'];
const orderStatusWireValues = [
  'created',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
  'completed',
  'cancelled',
];
const tableSessionStatusWireValues = [
  'open',
  'payment_pending',
  'paid',
  'closed',
  'cancelled',
];
const paymentStatusWireValues = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
];
const assistanceTypeWireValues = ['waiter', 'bill', 'other'];
const assistanceStatusWireValues = [
  'pending',
  'acknowledged',
  'resolved',
  'cancelled',
];

const maxMinorAmount = 9000000000000;
const maxOrderItems = 50;
const maxItemQuantity = 99;
const maxItemNotesLength = 300;
const currencyFractionDigits = 2;

final _idPattern = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$');
final _currencyPattern = RegExp(r'^[A-Z]{3}$');
final _timestampPattern = RegExp(
  r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$',
);

Never _invalid(String message) => throw FormatException(message);

Map<String, Object?> _asMap(Object? value, String label) {
  if (value is! Map<String, Object?>) _invalid('$label debe ser un objeto.');
  return value;
}

void _expectKeys(
  Map<String, Object?> value,
  Set<String> expected,
  String label,
) {
  if (value.keys.toSet().difference(expected).isNotEmpty ||
      expected.difference(value.keys.toSet()).isNotEmpty) {
    _invalid('$label contiene campos ausentes o desconocidos.');
  }
}

String parseContractId(Object? value, String label) {
  if (value is! String || !_idPattern.hasMatch(value)) {
    _invalid('$label no es un identificador válido.');
  }
  return value;
}

String _string(Object? value, String label, int min, int max) {
  if (value is! String ||
      value.trim().length < min ||
      value.trim().length > max) {
    _invalid('$label debe tener entre $min y $max caracteres.');
  }
  return value.trim();
}

String parseCurrency(Object? value) {
  if (value is! String || !_currencyPattern.hasMatch(value)) {
    _invalid('currency debe ser ISO 4217 en mayúsculas.');
  }
  return value;
}

int parseMinorAmount(Object? value, [String label = 'amountMinor']) {
  if (value is! int || value < 0 || value > maxMinorAmount) {
    _invalid('$label debe ser un entero no negativo dentro del límite.');
  }
  return value;
}

DateTime parseIsoTimestamp(Object? value) {
  if (value is! String || !_timestampPattern.hasMatch(value)) {
    _invalid('timestamp debe usar UTC RFC3339 con milisegundos.');
  }
  final parsed = DateTime.tryParse(value);
  if (parsed == null || !parsed.isUtc || parsed.toIso8601String() != value) {
    _invalid('timestamp debe usar UTC RFC3339 con milisegundos.');
  }
  return parsed;
}

class Money {
  const Money({required this.amountMinor, required this.currency})
    : assert(amountMinor >= 0 && amountMinor <= maxMinorAmount),
      assert(currency.length == 3);

  factory Money.fromJson(Map<String, Object?> json) {
    _expectKeys(json, const {'amountMinor', 'currency'}, 'Money');
    return Money(
      amountMinor: parseMinorAmount(json['amountMinor']),
      currency: parseCurrency(json['currency']),
    );
  }

  final int amountMinor;
  final String currency;

  String toDecimalString() {
    final divisor = _powerOfTen(currencyFractionDigits);
    final whole = amountMinor ~/ divisor;
    final fraction = (amountMinor % divisor).toString().padLeft(
      currencyFractionDigits,
      '0',
    );
    return '$whole.$fraction';
  }

  Map<String, Object> toJson() => {
    'amountMinor': amountMinor,
    'currency': currency,
  };
}

int _powerOfTen(int exponent) {
  var result = 1;
  for (var index = 0; index < exponent; index++) {
    result *= 10;
  }
  return result;
}

class ProductContract {
  const ProductContract({
    required this.establishmentId,
    required this.categoryId,
    required this.name,
    required this.description,
    required this.price,
    required this.imagePath,
    required this.available,
    required this.active,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ProductContract.fromJson(Map<String, Object?> json) {
    _expectKeys(json, _productFields, 'Product');
    if (json['available'] is! bool || json['active'] is! bool) {
      _invalid('available y active deben ser booleanos.');
    }
    final sortOrder = json['sortOrder'];
    if (sortOrder is! int || sortOrder < 0) {
      _invalid('sortOrder debe ser un entero no negativo.');
    }
    final imagePath = json['imagePath'];
    if (imagePath != null && imagePath is! String) {
      _invalid('imagePath debe ser texto o null.');
    }
    return ProductContract(
      establishmentId: parseContractId(
        json['establishmentId'],
        'establishmentId',
      ),
      categoryId: parseContractId(json['categoryId'], 'categoryId'),
      name: _string(json['name'], 'name', 2, 120),
      description: _string(json['description'], 'description', 0, 500),
      price: Money(
        amountMinor: parseMinorAmount(json['priceMinor'], 'priceMinor'),
        currency: parseCurrency(json['currency']),
      ),
      imagePath: imagePath as String?,
      available: json['available']! as bool,
      active: json['active']! as bool,
      sortOrder: sortOrder,
      createdAt: parseIsoTimestamp(json['createdAt']),
      updatedAt: parseIsoTimestamp(json['updatedAt']),
    );
  }

  final String establishmentId;
  final String categoryId;
  final String name;
  final String description;
  final Money price;
  final String? imagePath;
  final bool available;
  final bool active;
  final int sortOrder;
  final DateTime createdAt;
  final DateTime updatedAt;
}

const _productFields = {
  'establishmentId',
  'categoryId',
  'name',
  'description',
  'priceMinor',
  'currency',
  'imagePath',
  'available',
  'active',
  'sortOrder',
  'createdAt',
  'updatedAt',
};

class OrderItemContract {
  const OrderItemContract({
    required this.productId,
    required this.name,
    required this.unitPriceMinor,
    required this.quantity,
    required this.lineTotalMinor,
    required this.notes,
  });

  factory OrderItemContract.fromJson(Map<String, Object?> json) {
    _expectKeys(json, _orderItemFields, 'OrderItem');
    final unitPrice = parseMinorAmount(
      json['unitPriceMinor'],
      'unitPriceMinor',
    );
    final quantity = json['quantity'];
    if (quantity is! int || quantity < 1 || quantity > maxItemQuantity) {
      _invalid('quantity está fuera del límite permitido.');
    }
    final lineTotal = parseMinorAmount(
      json['lineTotalMinor'],
      'lineTotalMinor',
    );
    if (lineTotal != unitPrice * quantity) {
      _invalid('lineTotalMinor no coincide con precio por cantidad.');
    }
    final notes = json['notes'];
    return OrderItemContract(
      productId: parseContractId(json['productId'], 'productId'),
      name: _string(json['name'], 'name', 2, 120),
      unitPriceMinor: unitPrice,
      quantity: quantity,
      lineTotalMinor: lineTotal,
      notes: notes == null
          ? null
          : _string(notes, 'notes', 1, maxItemNotesLength),
    );
  }

  final String productId;
  final String name;
  final int unitPriceMinor;
  final int quantity;
  final int lineTotalMinor;
  final String? notes;
}

const _orderItemFields = {
  'productId',
  'name',
  'unitPriceMinor',
  'quantity',
  'lineTotalMinor',
  'notes',
};

class OrderContract {
  const OrderContract({
    required this.establishmentId,
    required this.sessionId,
    required this.tableId,
    required this.customerUid,
    required this.status,
    required this.items,
    required this.subtotalMinor,
    required this.totalMinor,
    required this.currency,
    required this.notes,
    required this.statusTimestamps,
    required this.createdAt,
    required this.updatedAt,
  });

  factory OrderContract.fromJson(Map<String, Object?> json) {
    _expectKeys(json, _orderFields, 'Order');
    final rawItems = json['items'];
    if (rawItems is! List<Object?> ||
        rawItems.isEmpty ||
        rawItems.length > maxOrderItems) {
      _invalid('items debe contener entre 1 y $maxOrderItems líneas.');
    }
    final items = rawItems
        .map((item) => OrderItemContract.fromJson(_asMap(item, 'OrderItem')))
        .toList(growable: false);
    final subtotal = parseMinorAmount(json['subtotalMinor'], 'subtotalMinor');
    final total = parseMinorAmount(json['totalMinor'], 'totalMinor');
    final calculated = items.fold<int>(
      0,
      (sum, item) => sum + item.lineTotalMinor,
    );
    if (calculated != subtotal || total != subtotal) {
      _invalid('Los totales del pedido no coinciden con sus líneas.');
    }
    final status = _parseOrderStatus(json['status']);
    final rawTimestamps = _asMap(json['statusTimestamps'], 'statusTimestamps');
    final timestamps = <OrderStatus, DateTime>{};
    for (final entry in rawTimestamps.entries) {
      timestamps[_parseOrderStatus(entry.key)] = parseIsoTimestamp(entry.value);
    }
    if (!timestamps.containsKey(status)) {
      _invalid('Falta el timestamp del estado actual.');
    }
    final notes = json['notes'];
    return OrderContract(
      establishmentId: parseContractId(
        json['establishmentId'],
        'establishmentId',
      ),
      sessionId: parseContractId(json['sessionId'], 'sessionId'),
      tableId: parseContractId(json['tableId'], 'tableId'),
      customerUid: parseContractId(json['customerUid'], 'customerUid'),
      status: status,
      items: items,
      subtotalMinor: subtotal,
      totalMinor: total,
      currency: parseCurrency(json['currency']),
      notes: notes == null ? null : _string(notes, 'notes', 1, 500),
      statusTimestamps: Map.unmodifiable(timestamps),
      createdAt: parseIsoTimestamp(json['createdAt']),
      updatedAt: parseIsoTimestamp(json['updatedAt']),
    );
  }

  final String establishmentId;
  final String sessionId;
  final String tableId;
  final String customerUid;
  final OrderStatus status;
  final List<OrderItemContract> items;
  final int subtotalMinor;
  final int totalMinor;
  final String currency;
  final String? notes;
  final Map<OrderStatus, DateTime> statusTimestamps;
  final DateTime createdAt;
  final DateTime updatedAt;
}

const _orderFields = {
  'establishmentId',
  'sessionId',
  'tableId',
  'customerUid',
  'status',
  'items',
  'subtotalMinor',
  'totalMinor',
  'currency',
  'notes',
  'statusTimestamps',
  'createdAt',
  'updatedAt',
};

OrderStatus _parseOrderStatus(Object? value) {
  if (value is! String) _invalid('status no pertenece al enum permitido.');
  final index = orderStatusWireValues.indexOf(value);
  if (index < 0) _invalid('status no pertenece al enum permitido.');
  return OrderStatus.values[index];
}

class AssistanceRequestContract {
  const AssistanceRequestContract({
    required this.establishmentId,
    required this.sessionId,
    required this.tableId,
    required this.customerUid,
    required this.type,
    required this.status,
    required this.acknowledgedBy,
    required this.resolvedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AssistanceRequestContract.fromJson(Map<String, Object?> json) {
    _expectKeys(json, _assistanceRequestFields, 'AssistanceRequest');
    final acknowledgedBy = json['acknowledgedBy'];
    final resolvedBy = json['resolvedBy'];
    return AssistanceRequestContract(
      establishmentId: parseContractId(
        json['establishmentId'],
        'establishmentId',
      ),
      sessionId: parseContractId(json['sessionId'], 'sessionId'),
      tableId: parseContractId(json['tableId'], 'tableId'),
      customerUid: parseContractId(json['customerUid'], 'customerUid'),
      type: _parseAssistanceType(json['type']),
      status: _parseAssistanceStatus(json['status']),
      acknowledgedBy: acknowledgedBy == null
          ? null
          : parseContractId(acknowledgedBy, 'acknowledgedBy'),
      resolvedBy: resolvedBy == null
          ? null
          : parseContractId(resolvedBy, 'resolvedBy'),
      createdAt: parseIsoTimestamp(json['createdAt']),
      updatedAt: parseIsoTimestamp(json['updatedAt']),
    );
  }

  final String establishmentId;
  final String sessionId;
  final String tableId;
  final String customerUid;
  final AssistanceType type;
  final AssistanceStatus status;
  final String? acknowledgedBy;
  final String? resolvedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  bool get isActive =>
      status == AssistanceStatus.pending ||
      status == AssistanceStatus.acknowledged;
}

const _assistanceRequestFields = {
  'establishmentId',
  'sessionId',
  'tableId',
  'customerUid',
  'type',
  'status',
  'acknowledgedBy',
  'resolvedBy',
  'createdAt',
  'updatedAt',
};

AssistanceType _parseAssistanceType(Object? value) {
  if (value is! String) _invalid('type no pertenece al enum permitido.');
  final index = assistanceTypeWireValues.indexOf(value);
  if (index < 0) _invalid('type no pertenece al enum permitido.');
  return AssistanceType.values[index];
}

AssistanceStatus _parseAssistanceStatus(Object? value) {
  if (value is! String) _invalid('status no pertenece al enum permitido.');
  final index = assistanceStatusWireValues.indexOf(value);
  if (index < 0) _invalid('status no pertenece al enum permitido.');
  return AssistanceStatus.values[index];
}
