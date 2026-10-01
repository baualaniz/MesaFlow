import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/main.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/data/demo_menu.dart';
import 'package:mesaflow_customer/src/menu/menu_repository.dart';

import 'helpers/test_menu_repository.dart';
import 'helpers/test_qr_session_gateway.dart';

void main() {
  testWidgets('muestra carga y luego publica el catálogo', (tester) async {
    final repository = _ControlledMenuRepository();
    await tester.pumpWidget(
      MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/e/mesa-flow-demo/table/mesa-01',
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: repository,
      ),
    );
    await tester.pump();

    expect(find.bySemanticsLabel('Cargando el menú'), findsOneWidget);
    repository.completePublished();
    await tester.pumpAndSettle();

    expect(find.text('Burger de la casa'), findsOneWidget);
  });

  testWidgets('muestra catálogo vacío sin confundirlo con una búsqueda', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/e/mesa-flow-demo/table/mesa-01',
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository(empty: true),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('El menú todavía no está publicado'), findsOneWidget);
    expect(find.text('No encontramos productos'), findsNothing);
  });

  testWidgets('permite reintentar una lectura fallida', (tester) async {
    final repository = _RetryMenuRepository();
    await tester.pumpWidget(
      MesaFlowApp(
        environment: AppEnvironment.development,
        initialLocation: '/e/mesa-flow-demo/table/mesa-01',
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: repository,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No pudimos cargar el menú'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('retry-menu')));
    await tester.pumpAndSettle();

    expect(repository.calls, 2);
    expect(find.text('Burger de la casa'), findsOneWidget);
  });
}

final class _ControlledMenuRepository implements MenuRepository {
  final _completer = Completer<MenuCatalog>();

  void completePublished() {
    _completer.complete(
      MenuCatalog(categories: demoCategories, products: demoProducts),
    );
  }

  @override
  Future<MenuCatalog> loadPublishedMenu(String establishmentId) =>
      _completer.future;
}

final class _RetryMenuRepository implements MenuRepository {
  int calls = 0;

  @override
  Future<MenuCatalog> loadPublishedMenu(String establishmentId) async {
    calls += 1;
    if (calls == 1) throw StateError('sin conexión');
    return MenuCatalog(categories: demoCategories, products: demoProducts);
  }
}
