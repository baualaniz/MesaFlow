import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../routing/customer_routes.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/feedback_panel.dart';

class InvalidLinkPage extends StatelessWidget {
  const InvalidLinkPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(MesaFlowSpacing.lg),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 640),
              child: Column(
                children: [
                  const MesaFlowFeedbackPanel(
                    title: 'Este enlace no es válido',
                    message:
                        'Volvé a escanear el código QR de la mesa. El enlace puede estar incompleto o haber cambiado.',
                    tone: MesaFlowFeedbackTone.warning,
                  ),
                  const SizedBox(height: MesaFlowSpacing.lg),
                  OutlinedButton.icon(
                    onPressed: () => context.go(CustomerRoutes.entry),
                    icon: const Icon(Icons.home_outlined),
                    label: const Text('Volver al inicio'),
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
