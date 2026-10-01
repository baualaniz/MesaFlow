import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/app_environment.dart';
import '../routing/customer_routes.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/feedback_panel.dart';

class EntryPage extends StatelessWidget {
  const EntryPage({super.key, required this.environment});

  final AppEnvironment environment;

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
                  Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(
                      color: MesaFlowColors.charcoal,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.restaurant_rounded,
                      color: MesaFlowColors.white,
                      size: 34,
                    ),
                  ),
                  const SizedBox(height: MesaFlowSpacing.lg),
                  Text(
                    'Abrí el menú desde tu mesa',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: MesaFlowSpacing.md),
                  Text(
                    'Escaneá el código QR disponible en la mesa para ingresar al menú correcto.',
                    textAlign: TextAlign.center,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: MesaFlowSpacing.xl),
                  const MesaFlowFeedbackPanel(
                    title: 'Tu enlace protege el contexto de la mesa',
                    message:
                        'No escribas una dirección manualmente. Si el QR no funciona, pedí ayuda al personal.',
                    tone: MesaFlowFeedbackTone.info,
                  ),
                  if (environment == AppEnvironment.emulator) ...[
                    const SizedBox(height: MesaFlowSpacing.lg),
                    FilledButton.icon(
                      key: const ValueKey('open-demo-table'),
                      onPressed: () => context.go(CustomerRoutes.demoTable),
                      icon: const Icon(Icons.play_arrow_rounded),
                      label: const Text('Abrir mesa de demostración'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
