import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';
import '../order/order_tracking_controller.dart';
import '../order/order_tracking_repository.dart';
import '../theme/mesaflow_theme.dart';
import 'feedback_panel.dart';
import 'product_card.dart';
import 'status_badge.dart';

const _progressStatuses = [
  OrderStatus.created,
  OrderStatus.confirmed,
  OrderStatus.preparing,
  OrderStatus.ready,
  OrderStatus.delivered,
  OrderStatus.completed,
];

class OrderTrackingSheet extends StatelessWidget {
  const OrderTrackingSheet({super.key, required this.controller});

  final OrderTrackingController controller;

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.88;
    return SafeArea(
      child: SizedBox(
        height: height,
        child: AnimatedBuilder(
          animation: controller,
          builder: (context, _) {
            if (controller.loading && controller.orders.isEmpty) {
              return Center(
                child: Semantics(
                  label: 'Cargando seguimiento de pedidos',
                  child: const CircularProgressIndicator(),
                ),
              );
            }
            if (controller.error != null && controller.orders.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(MesaFlowSpacing.lg),
                  child: MesaFlowFeedbackPanel(
                    title: 'No pudimos cargar tus pedidos',
                    message: 'Revisá tu conexión e intentá nuevamente.',
                    tone: MesaFlowFeedbackTone.error,
                    action: FilledButton.icon(
                      key: const ValueKey('retry-order-tracking'),
                      onPressed: controller.start,
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text('Reintentar'),
                    ),
                  ),
                ),
              );
            }
            if (controller.orders.isEmpty) {
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(MesaFlowSpacing.lg),
                  child: MesaFlowFeedbackPanel(
                    title: 'Todavía no hay pedidos',
                    message:
                        'Cuando envíes uno, vas a poder seguirlo desde acá.',
                    tone: MesaFlowFeedbackTone.info,
                  ),
                ),
              );
            }
            final orders = controller.orders.reversed.toList(growable: false);
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Tus pedidos',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      MesaFlowStatusBadge(
                        label: '${orders.length}',
                        tone: MesaFlowBadgeTone.info,
                        icon: Icons.receipt_long_outlined,
                      ),
                    ],
                  ),
                ),
                if (controller.error != null)
                  const Padding(
                    padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
                    child: MesaFlowFeedbackPanel(
                      title: 'Mostrando la última actualización',
                      message: 'La conexión en tiempo real se interrumpió.',
                      tone: MesaFlowFeedbackTone.warning,
                    ),
                  ),
                Expanded(
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    itemCount: orders.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 14),
                    itemBuilder: (context, index) => _OrderCard(
                      trackedOrder: orders[index],
                      initiallyExpanded: index == 0,
                    ),
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.trackedOrder,
    required this.initiallyExpanded,
  });

  final TrackedOrder trackedOrder;
  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) {
    final order = trackedOrder.order;
    final status = order.status;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: ExpansionTile(
        key: ValueKey('tracked-order-${trackedOrder.id}'),
        initiallyExpanded: initiallyExpanded,
        tilePadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
        childrenPadding: const EdgeInsets.fromLTRB(18, 0, 18, 18),
        title: Row(
          children: [
            Expanded(
              child: Text(
                'Pedido ${_shortReference(trackedOrder.id)}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
            MesaFlowStatusBadge(
              key: ValueKey('order-status-${trackedOrder.id}'),
              label: _statusLabel(status),
              tone: _statusTone(status),
            ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            '${_formatTime(order.createdAt)} · '
            '${formatPrice(Money(amountMinor: order.totalMinor, currency: order.currency))}',
          ),
        ),
        children: [
          const Divider(),
          for (final item in order.items)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 5),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(width: 30, child: Text('${item.quantity}×')),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.name),
                        if (item.notes case final notes?)
                          Text(
                            notes,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                      ],
                    ),
                  ),
                  Text(
                    formatPrice(
                      Money(
                        amountMinor: item.lineTotalMinor,
                        currency: order.currency,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 14),
          _OrderTimeline(order: order),
        ],
      ),
    );
  }
}

class _OrderTimeline extends StatelessWidget {
  const _OrderTimeline({required this.order});

  final OrderContract order;

  @override
  Widget build(BuildContext context) {
    final visibleStatuses = order.status == OrderStatus.cancelled
        ? [
            ..._progressStatuses.where(
              (status) => order.statusTimestamps.containsKey(status),
            ),
            OrderStatus.cancelled,
          ]
        : _progressStatuses;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Seguimiento', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 10),
        for (var index = 0; index < visibleStatuses.length; index++)
          _TimelineStep(
            status: visibleStatuses[index],
            timestamp: order.statusTimestamps[visibleStatuses[index]],
            current: order.status == visibleStatuses[index],
            showLine: index < visibleStatuses.length - 1,
          ),
      ],
    );
  }
}

class _TimelineStep extends StatelessWidget {
  const _TimelineStep({
    required this.status,
    required this.timestamp,
    required this.current,
    required this.showLine,
  });

  final OrderStatus status;
  final DateTime? timestamp;
  final bool current;
  final bool showLine;

  @override
  Widget build(BuildContext context) {
    final reached = timestamp != null;
    final color = status == OrderStatus.cancelled
        ? MesaFlowColors.error
        : reached
        ? MesaFlowColors.success
        : MesaFlowColors.lightGray;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 28,
            child: Column(
              children: [
                Icon(
                  current
                      ? Icons.radio_button_checked_rounded
                      : reached
                      ? Icons.check_circle_rounded
                      : Icons.radio_button_unchecked_rounded,
                  size: 20,
                  color: color,
                ),
                if (showLine)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: color.withValues(alpha: 0.4),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _statusLabel(status),
                      style: current
                          ? Theme.of(context).textTheme.titleMedium
                          : Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  if (timestamp != null)
                    Text(
                      _formatTime(timestamp!),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

String _shortReference(String id) =>
    id.substring(0, id.length < 8 ? id.length : 8).toUpperCase();

String _formatTime(DateTime value) =>
    '${value.toLocal().hour.toString().padLeft(2, '0')}:'
    '${value.toLocal().minute.toString().padLeft(2, '0')}';

String _statusLabel(OrderStatus status) => switch (status) {
  OrderStatus.created => 'Pedido recibido',
  OrderStatus.confirmed => 'Confirmado',
  OrderStatus.preparing => 'En preparación',
  OrderStatus.ready => 'Listo para entregar',
  OrderStatus.delivered => 'Entregado',
  OrderStatus.completed => 'Completado',
  OrderStatus.cancelled => 'Cancelado',
};

MesaFlowBadgeTone _statusTone(OrderStatus status) => switch (status) {
  OrderStatus.created || OrderStatus.confirmed => MesaFlowBadgeTone.info,
  OrderStatus.preparing || OrderStatus.ready => MesaFlowBadgeTone.warning,
  OrderStatus.delivered || OrderStatus.completed => MesaFlowBadgeTone.success,
  OrderStatus.cancelled => MesaFlowBadgeTone.error,
};
