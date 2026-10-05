import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/main.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/order/order_gateway.dart';

import 'helpers/test_cart_store.dart';
import 'helpers/test_menu_repository.dart';
import 'helpers/test_order_gateway.dart';
import 'helpers/test_order_tracking_repository.dart';
import 'helpers/test_qr_session_gateway.dart';

void main() {
  testWidgets('muestra el menú demo y agrega un producto', (tester) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Casa Jacarandá'), findsOneWidget);
    expect(find.text('Burger de la casa'), findsOneWidget);
    expect(find.text('Ver pedido'), findsNothing);

    final addButton = find.byKey(const ValueKey('add-burger-casa'));
    await tester.ensureVisible(addButton);
    await tester.pumpAndSettle();
    await tester.tap(addButton);
    await tester.pump();

    expect(find.text('Ver pedido'), findsOneWidget);
    expect(find.text('\$ 12.900'), findsWidgets);
  });

  testWidgets('filtra productos con la búsqueda', (tester) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(EditableText), 'chocolate');
    await tester.pump();

    expect(find.text('Torta de chocolate'), findsOneWidget);
    expect(find.text('Burger de la casa'), findsNothing);
  });

  testWidgets('filtra productos con la categoría publicada', (tester) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Vegetariano'));
    await tester.pump();

    expect(find.text('Bowl de estación'), findsOneWidget);
    expect(find.text('Burger de la casa'), findsNothing);
  });

  testWidgets('detalle agrega cantidad y nota con total validado', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();

    final burger = find.text('Burger de la casa');
    await tester.ensureVisible(burger);
    await tester.pumpAndSettle();
    await tester.tap(burger);
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('product-detail-burger-casa')),
      findsOneWidget,
    );
    final increase = find.byKey(const ValueKey('increase-product-quantity'));
    await tester.ensureVisible(increase);
    await tester.pumpAndSettle();
    await tester.tap(increase);
    final notes = find.byKey(const ValueKey('product-notes'));
    await tester.ensureVisible(notes);
    await tester.pumpAndSettle();
    await tester.enterText(notes, 'Sin cebolla');
    tester.testTextInput.hide();
    await tester.pumpAndSettle();
    final confirm = find.byKey(const ValueKey('confirm-product-selection'));
    await tester.ensureVisible(confirm);
    await tester.pumpAndSettle();
    await tester.tap(confirm);
    await tester.pumpAndSettle();

    expect(find.text('Ver pedido'), findsOneWidget);
    expect(find.text('\$ 25.800'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('open-cart')));
    await tester.pumpAndSettle();

    expect(find.text('Sin cebolla'), findsOneWidget);
    expect(find.text('2'), findsWidgets);
  });

  testWidgets('detalle no permite bajar de una unidad ni exceder la nota', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();
    final burger = find.text('Burger de la casa');
    await tester.ensureVisible(burger);
    await tester.pumpAndSettle();
    await tester.tap(burger);
    await tester.pumpAndSettle();

    final decrease = tester.widget<IconButton>(
      find.byKey(const ValueKey('decrease-product-quantity')),
    );
    expect(decrease.onPressed, isNull);

    await tester.enterText(
      find.byKey(const ValueKey('product-notes')),
      'x' * (maxItemNotesLength + 25),
    );
    final editable = tester.widget<EditableText>(
      find.descendant(
        of: find.byKey(const ValueKey('product-notes')),
        matching: find.byType(EditableText),
      ),
    );
    expect(editable.controller.text.length, maxItemNotesLength);
  });

  testWidgets('permite editar y eliminar una línea desde el pedido', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
      ),
    );
    await tester.pumpAndSettle();
    final addButton = find.byKey(const ValueKey('add-burger-casa'));
    await tester.ensureVisible(addButton);
    await tester.pumpAndSettle();
    await tester.tap(addButton);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-cart')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('cart-increase-burger-casa-0')));
    await tester.pumpAndSettle();
    expect(find.text('\$ 25.800'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('cart-decrease-burger-casa-0')));
    await tester.pumpAndSettle();
    expect(find.text('\$ 12.900'), findsWidgets);
    await tester.tap(find.byKey(const ValueKey('cart-remove-burger-casa-0')));
    await tester.pumpAndSettle();

    expect(find.text('Tu pedido está vacío'), findsOneWidget);
  });

  testWidgets('restaura el pedido luego de recrear la aplicación', (
    tester,
  ) async {
    final store = TestCartStore();
    Widget buildApp() => MesaFlowApp(
      environment: AppEnvironment.development,
      initialLocation: '/e/mesa-flow-demo/table/mesa-01',
      qrSessionGateway: TestQrSessionGateway.active,
      menuRepository: TestMenuRepository.published,
      cartStore: store,
    );

    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    final addButton = find.byKey(const ValueKey('add-burger-casa'));
    await tester.ensureVisible(addButton);
    await tester.pumpAndSettle();
    await tester.tap(addButton);
    await tester.pumpAndSettle();
    expect(find.text('Ver pedido'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();

    expect(find.text('Ver pedido'), findsOneWidget);
    expect(find.text('\$ 12.900'), findsWidgets);
  });

  testWidgets('envía el borrador, vacía el carrito y confirma el pedido', (
    tester,
  ) async {
    final store = TestCartStore();
    final orders = TestOrderGateway();
    await tester.pumpWidget(
      MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
        cartStore: store,
        orderGateway: orders,
      ),
    );
    await tester.pumpAndSettle();
    final addButton = find.byKey(const ValueKey('add-burger-casa'));
    await tester.ensureVisible(addButton);
    await tester.pumpAndSettle();
    await tester.tap(addButton);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-cart')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('submit-order')));
    await tester.pumpAndSettle();

    expect(orders.requestIds, hasLength(1));
    expect(orders.requestIds.single, matches(RegExp(r'^[a-f0-9]{32}$')));
    expect(orders.submittedLines.single.single.product.id, 'burger-casa');
    expect(find.byKey(const ValueKey('order-confirmation')), findsOneWidget);
    expect(find.text('Pedido enviado'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('order-confirmation')),
        matching: find.text('\$ 12.900'),
      ),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('close-order-confirmation')));
    await tester.pumpAndSettle();

    expect(find.text('Ver pedido'), findsNothing);
  });

  testWidgets('un reintento conserva el identificador y no duplica el pedido', (
    tester,
  ) async {
    final orders = TestOrderGateway(
      failure: OrderFailure.unavailable,
      failuresRemaining: 1,
    );
    await tester.pumpWidget(
      MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
        orderGateway: orders,
      ),
    );
    await tester.pumpAndSettle();
    final addButton = find.byKey(const ValueKey('add-burger-casa'));
    await tester.ensureVisible(addButton);
    await tester.pumpAndSettle();
    await tester.tap(addButton);
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-cart')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('submit-order')));
    await tester.pumpAndSettle();
    expect(orders.requestIds, hasLength(1));
    expect(find.text('Enviar pedido'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('submit-order')));
    await tester.pumpAndSettle();

    expect(orders.requestIds, hasLength(2));
    expect(orders.requestIds.first, orders.requestIds.last);
    expect(find.byKey(const ValueKey('order-confirmation')), findsOneWidget);
  });

  testWidgets('recupera pedidos y refleja cambios de estado en tiempo real', (
    tester,
  ) async {
    final tracking = TestOrderTrackingRepository([testTrackedOrder()]);
    Widget buildApp() => MesaFlowApp(
      environment: AppEnvironment.development,
      initialLocation: '/e/mesa-flow-demo/table/mesa-01',
      qrSessionGateway: TestQrSessionGateway.active,
      menuRepository: TestMenuRepository.published,
      orderTrackingRepository: tracking,
    );

    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-order-tracking')));
    await tester.pumpAndSettle();
    expect(find.text('Tus pedidos'), findsOneWidget);
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('order-status-pedido-prueba')),
        matching: find.text('Pedido recibido'),
      ),
      findsOneWidget,
    );

    tracking.emit([
      testTrackedOrder(
        status: 'preparing',
        statusTimestamps: {
          'created': '2026-09-17T12:15:00.000Z',
          'confirmed': '2026-09-17T12:16:00.000Z',
          'preparing': '2026-09-17T12:18:00.000Z',
        },
      ),
    ]);
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('order-status-pedido-prueba')),
        matching: find.text('En preparación'),
      ),
      findsOneWidget,
    );

    await tester.pumpWidget(const SizedBox.shrink());
    await tester.pumpAndSettle();
    await tester.pumpWidget(buildApp());
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-order-tracking')));
    await tester.pumpAndSettle();
    expect(
      find.descendant(
        of: find.byKey(const ValueKey('order-status-pedido-prueba')),
        matching: find.text('En preparación'),
      ),
      findsOneWidget,
    );
    await tracking.dispose();
  });

  testWidgets('permite reintentar si se interrumpe el seguimiento', (
    tester,
  ) async {
    final tracking = TestOrderTrackingRepository();
    addTearDown(tracking.dispose);
    await tester.pumpWidget(
      MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/e/mesa-flow-demo/table/mesa-01',
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
        orderTrackingRepository: tracking,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-order-tracking')));
    await tester.pumpAndSettle();
    expect(find.text('Todavía no hay pedidos'), findsOneWidget);

    tracking.emitError(Exception('conexión interrumpida'));
    await tester.pumpAndSettle();
    expect(find.text('No pudimos cargar tus pedidos'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('retry-order-tracking')));
    await tester.pumpAndSettle();
    expect(find.text('Todavía no hay pedidos'), findsOneWidget);
  });
}
