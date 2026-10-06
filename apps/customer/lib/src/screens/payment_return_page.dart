import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../routing/customer_routes.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/feedback_panel.dart';

class PaymentReturnPage extends StatelessWidget {
  const PaymentReturnPage({
    super.key,
    required this.result,
    this.returnLocation,
  });

  final PaymentReturnResult result;
  final String? returnLocation;

  @override
  Widget build(BuildContext context) {
    final (title, message, tone, icon) = switch (result) {
      PaymentReturnResult.success => (
        'Recibimos el regreso de Mercado Pago',
        'Estamos verificando el pago de forma segura. Volvé a tu cuenta para consultar el estado actualizado.',
        MesaFlowFeedbackTone.info,
        Icons.verified_user_outlined,
      ),
      PaymentReturnResult.pending => (
        'El pago quedó pendiente',
        'Mercado Pago todavía lo está procesando. Esto no significa que el pago esté aprobado.',
        MesaFlowFeedbackTone.warning,
        Icons.schedule_rounded,
      ),
      PaymentReturnResult.failure => (
        'El pago no se completó',
        'No registramos una aprobación. Podés volver a la mesa e intentarlo nuevamente.',
        MesaFlowFeedbackTone.error,
        Icons.cancel_outlined,
      ),
    };
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(MesaFlowSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 560),
              child: Column(
                children: [
                  Icon(icon, size: 54),
                  const SizedBox(height: 18),
                  MesaFlowFeedbackPanel(
                    title: title,
                    message: message,
                    tone: tone,
                    action: FilledButton.icon(
                      key: const ValueKey('return-from-payment'),
                      onPressed: () =>
                          context.go(returnLocation ?? CustomerRoutes.entry),
                      icon: const Icon(Icons.restaurant_menu_rounded),
                      label: const Text('Volver a MesaFlow'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
