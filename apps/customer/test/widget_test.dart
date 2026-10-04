import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/main.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';

import 'helpers/test_qr_session_gateway.dart';
import 'helpers/test_menu_repository.dart';

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
}
