import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/main.dart';

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
}
