import 'dart:async';

import '../assistance/assistance_gateway.dart';
import '../assistance/assistance_repository.dart';
import '../consumption/consumption_gateway.dart';
import '../contracts/domain_contracts.dart';
import '../data/demo_menu.dart';
import '../menu/menu_repository.dart';
import '../models/product_selection.dart';
import '../order/order_gateway.dart';
import '../order/order_tracking_repository.dart';
import '../routing/customer_routes.dart';
import '../session/qr_session.dart';

/// Backend local y autocontenido para la presentación académica.
///
/// Conserva los mismos contratos que Firebase, pero no realiza operaciones de
/// red ni representa una acreditación real de Mercado Pago.
final class DemoCustomerBackend
    implements
        QrSessionGateway,
        MenuRepository,
        OrderTrackingRepository,
        AssistanceRepository,
        ConsumptionGateway {
  DemoCustomerBackend({this.autoProgressOrders = true});

  final bool autoProgressOrders;
  final _orderUpdates = StreamController<List<TrackedOrder>>.broadcast();
  final _assistanceUpdates =
      StreamController<AssistanceRequestContract?>.broadcast();
  final List<Timer> _timers = [];
  final List<TrackedOrder> _orders = [];
  AssistanceRequestContract? _assistance;
  final int _paidMinor = 0;
  int _assistanceSequence = 0;

  static const session = QrSessionAccess(
    establishmentId: 'mesa-flow-demo',
    establishmentName: 'Bistró MesaFlow',
    tableId: 'mesa-01',
    tableName: 'Mesa 1',
    sessionId: 'sesion-demo-android',
  );

  @override
  Future<QrSessionAccess> exchange({
    required CustomerTableRoute route,
    required String token,
  }) async {
    if (!_isDemoRoute(route) || token != CustomerRoutes.demoQrToken) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    return session;
  }

  @override
  Future<QrSessionAccess> restore(CustomerTableRoute route) async {
    if (!_isDemoRoute(route)) {
      throw const QrSessionException(QrSessionFailure.accessRequired);
    }
    return session;
  }

  bool _isDemoRoute(CustomerTableRoute route) =>
      route.establishmentSlug == CustomerRoutes.demoEstablishmentSlug &&
      route.tableId == CustomerRoutes.demoTableId;

  @override
  Future<MenuCatalog> loadPublishedMenu(String establishmentId) async {
    if (establishmentId != session.establishmentId) {
      throw StateError('El establecimiento no pertenece a la demo.');
    }
    return MenuCatalog(categories: demoCategories, products: demoProducts);
  }

  OrderGateway get orderGateway => DemoOrderGateway(this);
  AssistanceGateway get assistanceGateway => DemoAssistanceGateway(this);
  List<DemoPaymentItem> get paymentItems {
    final quantities = <String, int>{};
    for (final tracked in _orders) {
      for (final item in tracked.order.items) {
        quantities.update(
          item.productId,
          (quantity) => quantity + item.quantity,
          ifAbsent: () => item.quantity,
        );
      }
    }
    return quantities.entries
        .map(
          (entry) =>
              DemoPaymentItem(productId: entry.key, quantity: entry.value),
        )
        .toList(growable: false);
  }

  Future<CreatedOrder> createOrder({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) async {
    if (session.sessionId != DemoCustomerBackend.session.sessionId ||
        lines.isEmpty) {
      throw const OrderException(OrderFailure.invalidCart);
    }
    final existing = _orders.where((order) => order.id.startsWith(requestId));
    if (existing.isNotEmpty) {
      final order = existing.first.order;
      return CreatedOrder(
        id: existing.first.id,
        itemCount: order.items.fold(0, (sum, item) => sum + item.quantity),
        totalMinor: order.totalMinor,
        currency: order.currency,
        createdAt: order.createdAt,
      );
    }

    final createdAt = DateTime.now().toUtc();
    final id = requestId.padRight(64, '0').substring(0, 64);
    final items = lines
        .map(
          (line) => OrderItemContract(
            productId: line.product.id,
            name: line.product.name,
            unitPriceMinor: line.product.price.amountMinor,
            quantity: line.quantity,
            lineTotalMinor: line.lineTotal.amountMinor,
            notes: line.notes,
          ),
        )
        .toList(growable: false);
    final total = items.fold<int>(0, (sum, item) => sum + item.lineTotalMinor);
    final order = OrderContract(
      establishmentId: session.establishmentId,
      sessionId: session.sessionId,
      tableId: session.tableId,
      customerUid: 'cliente-demo',
      status: OrderStatus.created,
      items: items,
      subtotalMinor: total,
      totalMinor: total,
      currency: lines.first.product.price.currency,
      notes: null,
      statusTimestamps: {OrderStatus.created: createdAt},
      createdAt: createdAt,
      updatedAt: createdAt,
    );
    _orders.add(TrackedOrder(id: id, order: order));
    _emitOrders();
    if (autoProgressOrders) _scheduleProgress(id);
    return CreatedOrder(
      id: id,
      itemCount: items.fold(0, (sum, item) => sum + item.quantity),
      totalMinor: total,
      currency: order.currency,
      createdAt: createdAt,
    );
  }

  void _scheduleProgress(String id) {
    const steps = <(Duration, OrderStatus)>[
      (Duration(seconds: 2), OrderStatus.confirmed),
      (Duration(seconds: 5), OrderStatus.preparing),
      (Duration(seconds: 9), OrderStatus.ready),
      (Duration(seconds: 13), OrderStatus.delivered),
      (Duration(seconds: 17), OrderStatus.completed),
    ];
    for (final (delay, status) in steps) {
      _timers.add(Timer(delay, () => _advanceOrder(id, status)));
    }
  }

  void _advanceOrder(String id, OrderStatus status) {
    final index = _orders.indexWhere((order) => order.id == id);
    if (index < 0) return;
    final current = _orders[index].order;
    final now = DateTime.now().toUtc();
    _orders[index] = TrackedOrder(
      id: id,
      order: OrderContract(
        establishmentId: current.establishmentId,
        sessionId: current.sessionId,
        tableId: current.tableId,
        customerUid: current.customerUid,
        status: status,
        items: current.items,
        subtotalMinor: current.subtotalMinor,
        totalMinor: current.totalMinor,
        currency: current.currency,
        notes: current.notes,
        statusTimestamps: {...current.statusTimestamps, status: now},
        createdAt: current.createdAt,
        updatedAt: now,
      ),
    );
    _emitOrders();
  }

  void _emitOrders() => _orderUpdates.add(List.unmodifiable(_orders));

  @override
  Stream<List<TrackedOrder>> watchSession({
    required String establishmentId,
    required String sessionId,
  }) async* {
    yield List.unmodifiable(_orders);
    yield* _orderUpdates.stream;
  }

  @override
  Stream<AssistanceRequestContract?> watchCurrent({
    required String establishmentId,
    required String sessionId,
  }) async* {
    yield _assistance;
    yield* _assistanceUpdates.stream;
  }

  Future<AssistanceActionResult> createAssistance({
    required QrSessionAccess session,
    required AssistanceType type,
  }) async {
    if (_assistance?.isActive ?? false) {
      throw const AssistanceException(AssistanceFailure.requestInProgress);
    }
    final now = DateTime.now().toUtc();
    final requestId = 'asistencia-demo-${++_assistanceSequence}';
    _assistance = AssistanceRequestContract(
      establishmentId: session.establishmentId,
      sessionId: session.sessionId,
      tableId: session.tableId,
      customerUid: 'cliente-demo',
      type: type,
      status: AssistanceStatus.pending,
      acknowledgedBy: null,
      resolvedBy: null,
      createdAt: now,
      updatedAt: now,
    );
    _assistanceUpdates.add(_assistance);
    return AssistanceActionResult(
      requestId: requestId,
      type: type,
      status: AssistanceStatus.pending,
      createdAt: now,
      updatedAt: now,
    );
  }

  Future<AssistanceActionResult> cancel({
    required QrSessionAccess session,
  }) async {
    final current = _assistance;
    if (current == null || !current.isActive) {
      throw const AssistanceException(AssistanceFailure.requestUnavailable);
    }
    final now = DateTime.now().toUtc();
    _assistance = AssistanceRequestContract(
      establishmentId: current.establishmentId,
      sessionId: current.sessionId,
      tableId: current.tableId,
      customerUid: current.customerUid,
      type: current.type,
      status: AssistanceStatus.cancelled,
      acknowledgedBy: null,
      resolvedBy: null,
      createdAt: current.createdAt,
      updatedAt: now,
    );
    _assistanceUpdates.add(_assistance);
    return AssistanceActionResult(
      requestId: 'asistencia-demo-$_assistanceSequence',
      type: current.type,
      status: AssistanceStatus.cancelled,
      createdAt: current.createdAt,
      updatedAt: now,
    );
  }

  int get _subtotalMinor =>
      _orders.fold(0, (sum, order) => sum + order.order.totalMinor);

  int get _balanceMinor {
    final balance = _subtotalMinor - _paidMinor;
    return balance < 0 ? 0 : balance;
  }

  @override
  Future<ConsumptionSummary> get({required QrSessionAccess session}) async =>
      ConsumptionSummary(
        sessionId: session.sessionId,
        tableId: session.tableId,
        sessionStatus: _balanceMinor == 0 && _orders.isNotEmpty
            ? TableSessionStatus.paid
            : TableSessionStatus.open,
        currency: 'ARS',
        orderCount: _orders.length,
        itemCount: _orders.fold(
          0,
          (sum, order) =>
              sum +
              order.order.items.fold(0, (items, item) => items + item.quantity),
        ),
        subtotalMinor: _subtotalMinor,
        paidMinor: _paidMinor,
        balanceMinor: _balanceMinor,
        calculatedAt: DateTime.now().toUtc(),
      );

  Future<void> dispose() async {
    for (final timer in _timers) {
      timer.cancel();
    }
    await _orderUpdates.close();
    await _assistanceUpdates.close();
  }
}

final class DemoOrderGateway implements OrderGateway {
  const DemoOrderGateway(this.backend);

  final DemoCustomerBackend backend;

  @override
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) =>
      backend.createOrder(session: session, requestId: requestId, lines: lines);
}

final class DemoAssistanceGateway implements AssistanceGateway {
  const DemoAssistanceGateway(this.backend);

  final DemoCustomerBackend backend;

  @override
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  }) => backend.createAssistance(session: session, type: type);

  @override
  Future<AssistanceActionResult> cancel({required QrSessionAccess session}) =>
      backend.cancel(session: session);
}

final class DemoPaymentItem {
  const DemoPaymentItem({required this.productId, required this.quantity});

  final String productId;
  final int quantity;
}
