import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/main.dart';
import 'package:mesaflow_customer/src/theme/mesaflow_theme.dart';
import 'package:mesaflow_customer/src/widgets/feedback_panel.dart';
import 'package:mesaflow_customer/src/widgets/status_badge.dart';

import 'helpers/test_qr_session_gateway.dart';
import 'helpers/test_menu_repository.dart';
import 'helpers/test_order_tracking_repository.dart';

void main() {
  test('el tema usa tipografías, radios y estados semánticos de MesaFlow', () {
    final theme = MesaFlowTheme.light;
    expect(theme.textTheme.displaySmall?.fontFamily, 'Poppins');
    expect(theme.textTheme.bodyLarge?.fontFamily, 'Inter');
    expect(theme.colorScheme.error, MesaFlowColors.error);
    expect(
      theme.filledButtonTheme.style?.minimumSize?.resolve({}),
      const Size(48, 52),
    );
    expect(theme.inputDecorationTheme.errorBorder, isNotNull);
    expect(MesaFlowSpacing.lg, 24);
    expect(MesaFlowRadius.lg, 24);
  });

  testWidgets('badges y paneles de feedback caben en una pantalla angosta', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 720));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(
      MaterialApp(
        theme: MesaFlowTheme.light,
        home: const Scaffold(
          body: SafeArea(
            child: Padding(
              padding: EdgeInsets.all(MesaFlowSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MesaFlowStatusBadge(
                    label: 'Pedido listo',
                    tone: MesaFlowBadgeTone.success,
                    icon: Icons.check_rounded,
                  ),
                  SizedBox(height: MesaFlowSpacing.md),
                  MesaFlowFeedbackPanel(
                    title: 'No pudimos cargar el menú',
                    message: 'Revisá tu conexión e intentá nuevamente.',
                    tone: MesaFlowFeedbackTone.error,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );

    expect(find.text('Pedido listo'), findsOneWidget);
    expect(find.text('No pudimos cargar el menú'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('el menú no desborda en móvil ni escritorio', (tester) async {
    for (final size in [const Size(390, 844), const Size(1280, 900)]) {
      await tester.binding.setSurfaceSize(size);
      await tester.pumpWidget(
        const MesaFlowApp(
          qrSessionGateway: TestQrSessionGateway.active,
          menuRepository: TestMenuRepository.published,
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Burger de la casa'), findsOneWidget);
      expect(find.text('Buscar en el menú'), findsOneWidget);
      expect(
        tester.takeException(),
        isNull,
        reason: 'Falló en ${size.width}px',
      );
    }
    await tester.binding.setSurfaceSize(null);
  });

  testWidgets('el seguimiento de pedidos no desborda en pantalla móvil', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(320, 720));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final tracking = TestOrderTrackingRepository([
      testTrackedOrder(
        status: 'preparing',
        statusTimestamps: const {
          'created': '2026-09-17T12:15:00.000Z',
          'preparing': '2026-09-17T12:17:00.000Z',
        },
      ),
    ]);
    addTearDown(tracking.dispose);

    await tester.pumpWidget(
      MesaFlowApp(
        qrSessionGateway: TestQrSessionGateway.active,
        menuRepository: TestMenuRepository.published,
        orderTrackingRepository: tracking,
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('open-order-tracking')));
    await tester.pumpAndSettle();

    expect(find.text('En preparación'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
