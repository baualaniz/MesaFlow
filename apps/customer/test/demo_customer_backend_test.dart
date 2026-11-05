import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/demo/demo_customer_backend.dart';
import 'package:mesaflow_customer/src/models/product_selection.dart';
import 'package:mesaflow_customer/src/routing/customer_routes.dart';

void main() {
  late DemoCustomerBackend backend;

  setUp(() {
    backend = DemoCustomerBackend(autoProgressOrders: false);
  });

  tearDown(() => backend.dispose());

  test('abre la mesa y carga el menú sin Firebase', () async {
    const route = CustomerTableRoute(
      establishmentSlug: CustomerRoutes.demoEstablishmentSlug,
      tableId: CustomerRoutes.demoTableId,
    );
    final session = await backend.exchange(
      route: route,
      token: CustomerRoutes.demoQrToken,
    );
    final catalog = await backend.loadPublishedMenu(session.establishmentId);

    expect(session.tableName, 'Mesa 1');
    expect(catalog.categories, isNotEmpty);
    expect(catalog.products, isNotEmpty);
  });

  test('crea pedido, lo publica y actualiza el consumo', () async {
    final catalog = await backend.loadPublishedMenu(
      DemoCustomerBackend.session.establishmentId,
    );
    final line = ProductSelection.create(
      product: catalog.products.first,
      quantity: 2,
      notes: 'Sin cebolla',
    );
    final created = await backend.orderGateway.create(
      session: DemoCustomerBackend.session,
      requestId: 'a' * 32,
      lines: [line],
    );
    final tracked = await backend
        .watchSession(
          establishmentId: DemoCustomerBackend.session.establishmentId,
          sessionId: DemoCustomerBackend.session.sessionId,
        )
        .first;
    final consumption = await backend.get(session: DemoCustomerBackend.session);

    expect(tracked.single.id, created.id);
    expect(tracked.single.order.status, OrderStatus.created);
    expect(consumption.orderCount, 1);
    expect(consumption.itemCount, 2);
    expect(consumption.balanceMinor, created.totalMinor);
  });

  test('publica asistencia e ítems verificables para el pago remoto', () async {
    final catalog = await backend.loadPublishedMenu(
      DemoCustomerBackend.session.establishmentId,
    );
    await backend.orderGateway.create(
      session: DemoCustomerBackend.session,
      requestId: 'b' * 32,
      lines: [
        ProductSelection.create(product: catalog.products.first, quantity: 1),
      ],
    );
    final assistance = await backend.assistanceGateway.create(
      session: DemoCustomerBackend.session,
      type: AssistanceType.waiter,
    );
    expect(assistance.status, AssistanceStatus.pending);
    expect(backend.paymentItems, hasLength(1));
    expect(backend.paymentItems.single.productId, 'burger-casa');
    expect(backend.paymentItems.single.quantity, 1);
  });
}
