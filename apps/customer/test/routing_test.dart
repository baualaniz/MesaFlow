import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mesaflow_customer/main.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/screens/menu_page.dart';

import 'helpers/test_qr_session_gateway.dart';

void main() {
  testWidgets('una entrada directa conserva establecimiento y mesa', (
    tester,
  ) async {
    const location = '/e/casa-jacaranda/table/mesa-12';
    await tester.pumpWidget(
      const MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: location,
        qrSessionGateway: TestQrSessionGateway.active,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(MenuPage), findsOneWidget);
    expect(find.text('Mesa 12'), findsOneWidget);
    expect(find.text('Burger de la casa'), findsOneWidget);

    final context = tester.element(find.byType(MenuPage));
    expect(
      GoRouter.of(context).routeInformationProvider.value.uri.path,
      location,
    );
  });

  testWidgets('la raíz cloud solicita escanear el QR', (tester) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/',
        qrSessionGateway: TestQrSessionGateway.active,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Abrí el menú desde tu mesa'), findsOneWidget);
    expect(find.byType(MenuPage), findsNothing);
    expect(find.byKey(const ValueKey('open-demo-table')), findsNothing);
  });

  testWidgets('el ambiente local abre la mesa demo desde la raíz', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        initialLocation: '/',
        qrSessionGateway: TestQrSessionGateway.active,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(MenuPage), findsOneWidget);
    expect(find.text('Mesa 1'), findsOneWidget);
    final context = tester.element(find.byType(MenuPage));
    final uri = GoRouter.of(context).routeInformationProvider.value.uri;
    expect(uri.path, '/e/mesa-flow-demo/table/mesa-01');
    expect(uri.query, isEmpty, reason: 'El token QR debe desaparecer de la URL');
  });

  testWidgets('un contexto inválido no monta el menú', (tester) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/e/Casa-Jacaranda/table/mesa-01',
        qrSessionGateway: TestQrSessionGateway.active,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Este enlace no es válido'), findsOneWidget);
    expect(find.byType(MenuPage), findsNothing);
  });

  testWidgets('una ruta desconocida muestra recuperación segura', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/ruta-que-no-existe',
        qrSessionGateway: TestQrSessionGateway.active,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Este enlace no es válido'), findsOneWidget);
    expect(find.text('Volver al inicio'), findsOneWidget);
  });
}
