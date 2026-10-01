import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/routing/customer_routes.dart';
import 'package:mesaflow_customer/src/screens/menu_page.dart';
import 'package:mesaflow_customer/src/screens/session_gate_page.dart';
import 'package:mesaflow_customer/src/session/qr_session.dart';
import 'package:mesaflow_customer/src/theme/mesaflow_theme.dart';

import 'helpers/test_qr_session_gateway.dart';
import 'helpers/test_menu_repository.dart';

const route = CustomerTableRoute(
  establishmentSlug: 'mesa-flow-demo',
  tableId: 'mesa-01',
);

void main() {
  testWidgets('un token válido abre el menú y solicita limpiar la URL', (
    tester,
  ) async {
    var consumed = false;
    await tester.pumpWidget(
      MaterialApp(
        theme: MesaFlowTheme.light,
        home: SessionGatePage(
          tableRoute: route,
          token: CustomerRoutes.demoQrToken,
          gateway: TestQrSessionGateway.active,
          menuRepository: TestMenuRepository.published,
          onTokenConsumed: () => consumed = true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(MenuPage), findsOneWidget);
    expect(consumed, isTrue);
  });

  testWidgets('sin participación previa solicita escanear el QR', (
    tester,
  ) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: MesaFlowTheme.light,
        home: SessionGatePage(
          tableRoute: route,
          gateway: const TestQrSessionGateway(
            failure: QrSessionFailure.accessRequired,
          ),
          menuRepository: TestMenuRepository.published,
          onTokenConsumed: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Escaneá el QR de esta mesa'), findsOneWidget);
    expect(find.byType(MenuPage), findsNothing);
  });

  testWidgets('un token rotado muestra un error recuperable', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: MesaFlowTheme.light,
        home: SessionGatePage(
          tableRoute: route,
          token: 'token-que-cumple-el-largo-minimo',
          gateway: const TestQrSessionGateway(
            failure: QrSessionFailure.invalidQr,
          ),
          menuRepository: TestMenuRepository.published,
          onTokenConsumed: () {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Este QR ya no es válido'), findsOneWidget);
    expect(find.byType(MenuPage), findsNothing);
  });
}
