import 'package:flutter/material.dart';

import '../assistance/assistance_controller.dart';
import '../assistance/assistance_gateway.dart';
import '../contracts/domain_contracts.dart';
import '../theme/mesaflow_theme.dart';
import 'feedback_panel.dart';
import 'status_badge.dart';

class AssistanceSheet extends StatelessWidget {
  const AssistanceSheet({super.key, required this.controller});

  final AssistanceController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => SafeArea(
        child: SingleChildScrollView(
          padding: EdgeInsets.fromLTRB(
            20,
            4,
            20,
            24 + MediaQuery.viewInsetsOf(context).bottom,
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Asistencia en tu mesa',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  'Avisale al equipo qué necesitás sin levantarte.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 22),
                if (controller.loading)
                  const Padding(
                    padding: EdgeInsets.all(36),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (controller.watchError != null)
                  MesaFlowFeedbackPanel(
                    title: 'No pudimos consultar la asistencia',
                    message: 'Revisá tu conexión e intentá nuevamente.',
                    tone: MesaFlowFeedbackTone.error,
                    action: FilledButton.icon(
                      key: const ValueKey('retry-assistance'),
                      onPressed: controller.start,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Reintentar'),
                    ),
                  )
                else ...[
                  if (controller.request case final request?) ...[
                    _CurrentRequest(request: request),
                    const SizedBox(height: 18),
                  ],
                  if (controller.hasActiveRequest)
                    _ActiveActions(controller: controller)
                  else
                    _RequestOptions(controller: controller),
                ],
                if (controller.actionFailure case final failure?) ...[
                  const SizedBox(height: 16),
                  _ActionError(
                    failure: failure,
                    onClose: controller.clearActionFailure,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CurrentRequest extends StatelessWidget {
  const _CurrentRequest({required this.request});

  final AssistanceRequestContract request;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: request.isActive
            ? MesaFlowColors.softGreen
            : MesaFlowColors.lightGray.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: MesaFlowColors.white,
              child: Icon(
                _typeIcon(request.type),
                color: MesaFlowColors.charcoal,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _typeLabel(request.type),
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                      ),
                      MesaFlowStatusBadge(
                        key: const ValueKey('assistance-status'),
                        label: _statusLabel(request.status),
                        tone: _statusTone(request.status),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(_statusMessage(request.status)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveActions extends StatelessWidget {
  const _ActiveActions({required this.controller});

  final AssistanceController controller;

  @override
  Widget build(BuildContext context) {
    final canCancel = controller.request?.status == AssistanceStatus.pending;
    if (!canCancel) {
      return const Text(
        'El personal ya recibió el aviso. En breve se acercará a tu mesa.',
        textAlign: TextAlign.center,
      );
    }
    return OutlinedButton.icon(
      key: const ValueKey('cancel-assistance'),
      onPressed: controller.busy ? null : controller.cancel,
      icon: controller.busy
          ? const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.close_rounded),
      label: const Text('Cancelar solicitud'),
    );
  }
}

class _RequestOptions extends StatelessWidget {
  const _RequestOptions({required this.controller});

  final AssistanceController controller;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('¿Qué necesitás?', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        _AssistanceOption(
          key: const ValueKey('request-waiter'),
          icon: Icons.waving_hand_outlined,
          title: 'Llamar al mozo',
          subtitle: 'Para hacer una consulta o pedir algo.',
          busy: controller.busy,
          onTap: () => controller.create(AssistanceType.waiter),
        ),
        _AssistanceOption(
          key: const ValueKey('request-bill'),
          icon: Icons.request_quote_outlined,
          title: 'Pedir la cuenta',
          subtitle: 'Avisá que la mesa está lista para pagar.',
          busy: controller.busy,
          onTap: () => controller.create(AssistanceType.bill),
        ),
        _AssistanceOption(
          key: const ValueKey('request-other'),
          icon: Icons.chat_bubble_outline_rounded,
          title: 'Otra consulta',
          subtitle: 'El equipo se acercará para ayudarte.',
          busy: controller.busy,
          onTap: () => controller.create(AssistanceType.other),
        ),
      ],
    );
  }
}

class _AssistanceOption extends StatelessWidget {
  const _AssistanceOption({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.busy,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Icon(icon, color: MesaFlowColors.success),
        title: Text(title),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
        enabled: !busy,
        onTap: busy ? null : onTap,
      ),
    );
  }
}

class _ActionError extends StatelessWidget {
  const _ActionError({required this.failure, required this.onClose});

  final AssistanceFailure failure;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return MaterialBanner(
      content: Text(_failureMessage(failure)),
      leading: const Icon(Icons.error_outline_rounded),
      actions: [TextButton(onPressed: onClose, child: const Text('Cerrar'))],
    );
  }
}

String _typeLabel(AssistanceType type) => switch (type) {
  AssistanceType.waiter => 'Llamado al mozo',
  AssistanceType.bill => 'Pedido de cuenta',
  AssistanceType.other => 'Consulta al equipo',
};

IconData _typeIcon(AssistanceType type) => switch (type) {
  AssistanceType.waiter => Icons.waving_hand_outlined,
  AssistanceType.bill => Icons.request_quote_outlined,
  AssistanceType.other => Icons.chat_bubble_outline_rounded,
};

String _statusLabel(AssistanceStatus status) => switch (status) {
  AssistanceStatus.pending => 'Enviada',
  AssistanceStatus.acknowledged => 'En camino',
  AssistanceStatus.resolved => 'Atendida',
  AssistanceStatus.cancelled => 'Cancelada',
};

String _statusMessage(AssistanceStatus status) => switch (status) {
  AssistanceStatus.pending => 'El aviso fue enviado al personal.',
  AssistanceStatus.acknowledged => 'Alguien del equipo ya está en camino.',
  AssistanceStatus.resolved => 'La solicitud anterior ya fue atendida.',
  AssistanceStatus.cancelled => 'La solicitud anterior fue cancelada.',
};

MesaFlowBadgeTone _statusTone(AssistanceStatus status) => switch (status) {
  AssistanceStatus.pending => MesaFlowBadgeTone.warning,
  AssistanceStatus.acknowledged => MesaFlowBadgeTone.info,
  AssistanceStatus.resolved => MesaFlowBadgeTone.success,
  AssistanceStatus.cancelled => MesaFlowBadgeTone.error,
};

String _failureMessage(AssistanceFailure failure) => switch (failure) {
  AssistanceFailure.disabled =>
    'Este establecimiento no tiene habilitada la asistencia desde la mesa.',
  AssistanceFailure.rateLimited =>
    'Esperá un minuto antes de enviar una nueva solicitud.',
  AssistanceFailure.requestInProgress =>
    'El personal ya está atendiendo la solicitud y no puede cancelarse.',
  AssistanceFailure.requestUnavailable =>
    'La solicitud ya no está disponible. Actualizá e intentá nuevamente.',
  AssistanceFailure.sessionUnavailable =>
    'La sesión de esta mesa ya no está activa.',
  AssistanceFailure.unavailable =>
    'No pudimos enviar la solicitud. Revisá tu conexión e intentá nuevamente.',
};
