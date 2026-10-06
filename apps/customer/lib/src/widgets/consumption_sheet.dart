import 'package:flutter/material.dart';

import '../assistance/assistance_controller.dart';
import '../assistance/assistance_gateway.dart';
import '../consumption/consumption_controller.dart';
import '../consumption/consumption_gateway.dart';
import '../contracts/domain_contracts.dart';
import '../payment/payment_controller.dart';
import '../payment/payment_gateway.dart';
import '../theme/mesaflow_theme.dart';
import 'feedback_panel.dart';
import 'product_card.dart';

class ConsumptionSheet extends StatelessWidget {
  const ConsumptionSheet({
    super.key,
    required this.controller,
    required this.assistanceController,
    required this.paymentController,
  });

  final ConsumptionController controller;
  final AssistanceController assistanceController;
  final PaymentController paymentController;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([
        controller,
        assistanceController,
        paymentController,
      ]),
      builder: (context, _) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 620),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Tu cuenta',
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 6),
                Text(
                  'Resumen actualizado de los pedidos de esta mesa.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: 22),
                if (controller.loading && controller.summary == null)
                  const Padding(
                    padding: EdgeInsets.all(36),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (controller.failure case final failure?)
                  _LoadFailure(failure: failure, onRetry: controller.load)
                else if (controller.summary case final summary?) ...[
                  _SummaryCard(summary: summary),
                  const SizedBox(height: 18),
                  if (summary.balanceMinor > 0) ...[
                    FilledButton.icon(
                      key: const ValueKey('start-mercado-pago'),
                      onPressed: paymentController.busy
                          ? null
                          : paymentController.start,
                      icon: paymentController.busy
                          ? const SizedBox.square(
                              dimension: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.open_in_new_rounded),
                      label: const Text('Pagar con Mercado Pago'),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'El checkout se abre en Mercado Pago. El regreso a MesaFlow no confirma la acreditación.',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    if (paymentController.failure case final failure?) ...[
                      const SizedBox(height: 12),
                      MaterialBanner(
                        content: Text(_paymentFailureMessage(failure)),
                        leading: const Icon(Icons.error_outline_rounded),
                        actions: [
                          TextButton(
                            onPressed: paymentController.clearFailure,
                            child: const Text('Cerrar'),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 18),
                  ],
                  _BillAction(controller: assistanceController),
                  if (assistanceController.actionFailure
                      case final failure?) ...[
                    const SizedBox(height: 12),
                    MaterialBanner(
                      content: Text(_assistanceFailureMessage(failure)),
                      leading: const Icon(Icons.error_outline_rounded),
                      actions: [
                        TextButton(
                          onPressed: assistanceController.clearActionFailure,
                          child: const Text('Cerrar'),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 10),
                  TextButton.icon(
                    key: const ValueKey('refresh-consumption'),
                    onPressed: controller.loading ? null : controller.load,
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Actualizar consumo'),
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

String _paymentFailureMessage(PaymentFailure failure) => switch (failure) {
  PaymentFailure.balanceUnavailable =>
    'La mesa ya no tiene saldo pendiente para pagar.',
  PaymentFailure.inProgress =>
    'El pago se está preparando. Esperá unos segundos e intentá nuevamente.',
  PaymentFailure.sessionUnavailable =>
    'La sesión de esta mesa ya no permite iniciar pagos.',
  PaymentFailure.providerUnavailable =>
    'Mercado Pago no está disponible en este momento.',
  PaymentFailure.unavailable =>
    'No pudimos abrir el checkout. Revisá tu conexión e intentá nuevamente.',
};

String _assistanceFailureMessage(AssistanceFailure failure) =>
    switch (failure) {
      AssistanceFailure.disabled =>
        'Este establecimiento no tiene habilitado el pedido de cuenta.',
      AssistanceFailure.rateLimited =>
        'Esperá un minuto antes de volver a pedir la cuenta.',
      AssistanceFailure.requestInProgress =>
        'El personal ya está atendiendo una solicitud de la mesa.',
      AssistanceFailure.requestUnavailable =>
        'La solicitud cambió. Actualizá e intentá nuevamente.',
      AssistanceFailure.sessionUnavailable =>
        'La sesión de esta mesa ya no está activa.',
      AssistanceFailure.unavailable =>
        'No pudimos pedir la cuenta. Revisá tu conexión e intentá nuevamente.',
    };

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.summary});

  final ConsumptionSummary summary;

  String _price(int amount) =>
      formatPrice(Money(amountMinor: amount, currency: summary.currency));

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: MesaFlowColors.softGreen,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Saldo pendiente',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(
              _price(summary.balanceMinor),
              key: const ValueKey('consumption-balance'),
              style: Theme.of(context).textTheme.displaySmall,
            ),
            const SizedBox(height: 20),
            _AmountRow(label: 'Consumo', value: _price(summary.subtotalMinor)),
            const SizedBox(height: 10),
            _AmountRow(label: 'Pagado', value: _price(summary.paidMinor)),
            const Divider(height: 28),
            Text(
              '${summary.orderCount} ${summary.orderCount == 1 ? 'pedido' : 'pedidos'} · '
              '${summary.itemCount} ${summary.itemCount == 1 ? 'producto' : 'productos'}',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  const _AmountRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(child: Text(label)),
        Text(value, style: Theme.of(context).textTheme.titleMedium),
      ],
    );
  }
}

class _BillAction extends StatelessWidget {
  const _BillAction({required this.controller});

  final AssistanceController controller;

  @override
  Widget build(BuildContext context) {
    final request = controller.request;
    if (request?.isActive ?? false) {
      if (request!.type == AssistanceType.bill) {
        return const MesaFlowFeedbackPanel(
          title: 'Cuenta solicitada',
          message: 'El personal ya recibió el aviso y se acercará a la mesa.',
          tone: MesaFlowFeedbackTone.success,
        );
      }
      return const MesaFlowFeedbackPanel(
        title: 'Hay otra solicitud activa',
        message:
            'Esperá a que el personal la atienda antes de pedir la cuenta.',
        tone: MesaFlowFeedbackTone.info,
      );
    }
    return FilledButton.icon(
      key: const ValueKey('request-bill-from-consumption'),
      onPressed: controller.busy
          ? null
          : () => controller.create(AssistanceType.bill),
      icon: controller.busy
          ? const SizedBox.square(
              dimension: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.request_quote_outlined),
      label: const Text('Pedir la cuenta'),
    );
  }
}

class _LoadFailure extends StatelessWidget {
  const _LoadFailure({required this.failure, required this.onRetry});

  final ConsumptionFailure failure;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final (title, message) = switch (failure) {
      ConsumptionFailure.inconsistent => (
        'No pudimos verificar el saldo',
        'El personal debe revisar el consumo antes de mostrar la cuenta.',
      ),
      ConsumptionFailure.sessionUnavailable => (
        'La sesión ya no está disponible',
        'Consultá al personal para revisar o cerrar la cuenta.',
      ),
      ConsumptionFailure.unavailable => (
        'No pudimos cargar tu cuenta',
        'Revisá tu conexión e intentá nuevamente.',
      ),
    };
    return MesaFlowFeedbackPanel(
      title: title,
      message: message,
      tone: MesaFlowFeedbackTone.error,
      action: FilledButton.icon(
        key: const ValueKey('retry-consumption'),
        onPressed: onRetry,
        icon: const Icon(Icons.refresh_rounded),
        label: const Text('Reintentar'),
      ),
    );
  }
}
