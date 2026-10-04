import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';

import '../cart/cart_controller.dart';
import '../contracts/domain_contracts.dart';
import '../models/product_selection.dart';
import '../order/order_gateway.dart';
import '../session/qr_session.dart';
import '../theme/mesaflow_theme.dart';
import 'feedback_panel.dart';
import 'product_card.dart';

class CartSheet extends StatefulWidget {
  const CartSheet({
    super.key,
    required this.controller,
    required this.session,
    required this.orderGateway,
    required this.onMessage,
  });

  final CartController controller;
  final QrSessionAccess session;
  final OrderGateway orderGateway;
  final ValueChanged<String> onMessage;

  @override
  State<CartSheet> createState() => _CartSheetState();
}

class _CartSheetState extends State<CartSheet> {
  bool _submitting = false;
  String? _requestId;
  String? _requestFingerprint;

  CartController get controller => widget.controller;

  String _newRequestId() {
    final random = Random.secure();
    return List.generate(
      16,
      (_) => random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ).join();
  }

  String _fingerprint(List<ProductSelection> lines) => jsonEncode(
    lines
        .map(
          (line) => {
            'productId': line.product.id,
            'quantity': line.quantity,
            'notes': line.notes,
          },
        )
        .toList(growable: false),
  );

  Future<void> _changeQuantity(ProductSelection selection, int quantity) async {
    final result = await controller.setQuantity(selection, quantity);
    _report(result);
  }

  Future<void> _remove(ProductSelection selection) async {
    final result = await controller.remove(selection);
    if (result == CartMutationResult.success) {
      widget.onMessage('${selection.product.name} eliminado del pedido');
    } else {
      _report(result);
    }
  }

  Future<void> _confirmClear(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('¿Vaciar el pedido?'),
        content: const Text(
          'Se eliminarán todos los productos guardados para esta sesión.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            key: const ValueKey('confirm-clear-cart'),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Vaciar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final result = await controller.clear();
    if (result == CartMutationResult.success) {
      widget.onMessage('Pedido vaciado');
    } else {
      _report(result);
    }
  }

  void _report(CartMutationResult result) {
    final message = switch (result) {
      CartMutationResult.success => null,
      CartMutationResult.quantityLimit =>
        'La cantidad supera el máximo permitido para este producto.',
      CartMutationResult.itemLimit =>
        'El pedido alcanzó el máximo de $maxOrderItems líneas.',
      CartMutationResult.busy => 'Esperá a que termine el cambio anterior.',
      CartMutationResult.persistenceError =>
        'No pudimos guardar el cambio. Intentá nuevamente.',
    };
    if (message != null) widget.onMessage(message);
  }

  Future<void> _submit() async {
    if (_submitting || controller.saving || controller.lines.isEmpty) return;
    final lines = controller.lines;
    final fingerprint = _fingerprint(lines);
    if (_requestFingerprint != fingerprint) {
      _requestFingerprint = fingerprint;
      _requestId = _newRequestId();
    }
    setState(() => _submitting = true);
    try {
      final order = await widget.orderGateway.create(
        session: widget.session,
        requestId: _requestId!,
        lines: lines,
      );
      final clearResult = await controller.clear();
      if (!mounted) return;
      if (clearResult != CartMutationResult.success) {
        widget.onMessage(
          'El pedido fue recibido. Tocá enviar otra vez para terminar de limpiar el carrito.',
        );
        setState(() => _submitting = false);
        return;
      }
      Navigator.pop(context, order);
    } on OrderException catch (error) {
      if (!mounted) return;
      widget.onMessage(switch (error.failure) {
        OrderFailure.invalidCart =>
          'Revisá el pedido: contiene datos que no son válidos.',
        OrderFailure.productUnavailable =>
          'Un producto cambió o dejó de estar disponible. Actualizá el menú.',
        OrderFailure.sessionUnavailable =>
          'La sesión de esta mesa ya no admite pedidos.',
        OrderFailure.unavailable =>
          'No pudimos enviar el pedido. Intentá nuevamente.',
      });
      setState(() => _submitting = false);
    } catch (_) {
      if (!mounted) return;
      widget.onMessage('No pudimos enviar el pedido. Intentá nuevamente.');
      setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final height = MediaQuery.sizeOf(context).height * 0.82;
    return SafeArea(
      child: SizedBox(
        height: height,
        child: AnimatedBuilder(
          animation: controller,
          builder: (context, _) {
            final lines = controller.lines;
            final busy = controller.saving || _submitting;
            return Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Tu pedido',
                          style: Theme.of(context).textTheme.headlineMedium,
                        ),
                      ),
                      if (busy)
                        const SizedBox.square(
                          dimension: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                    ],
                  ),
                  const Divider(),
                  if (lines.isEmpty)
                    const Expanded(
                      child: Center(
                        child: MesaFlowFeedbackPanel(
                          title: 'Tu pedido está vacío',
                          message: 'Cerrá este resumen y elegí algo del menú.',
                          tone: MesaFlowFeedbackTone.neutral,
                        ),
                      ),
                    )
                  else
                    Expanded(
                      child: ListView.separated(
                        itemCount: lines.length,
                        separatorBuilder: (_, _) => const Divider(),
                        itemBuilder: (context, index) {
                          final selection = lines[index];
                          final lineKey = '${selection.product.id}-$index';
                          final maximum = maxQuantityForProduct(
                            selection.product,
                          );
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            selection.product.name,
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleMedium,
                                          ),
                                          if (selection.notes
                                              case final notes?) ...[
                                            const SizedBox(height: 4),
                                            Text(
                                              notes,
                                              style: Theme.of(
                                                context,
                                              ).textTheme.bodySmall,
                                            ),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      formatPrice(selection.lineTotal),
                                      style: Theme.of(
                                        context,
                                      ).textTheme.titleMedium,
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    IconButton.outlined(
                                      key: ValueKey('cart-decrease-$lineKey'),
                                      onPressed: !busy && selection.quantity > 1
                                          ? () => _changeQuantity(
                                              selection,
                                              selection.quantity - 1,
                                            )
                                          : null,
                                      tooltip: 'Quitar una unidad',
                                      icon: const Icon(Icons.remove_rounded),
                                    ),
                                    SizedBox(
                                      width: 44,
                                      child: Text(
                                        '${selection.quantity}',
                                        key: ValueKey('cart-quantity-$lineKey'),
                                        textAlign: TextAlign.center,
                                        style: Theme.of(
                                          context,
                                        ).textTheme.titleMedium,
                                      ),
                                    ),
                                    IconButton.outlined(
                                      key: ValueKey('cart-increase-$lineKey'),
                                      onPressed:
                                          !busy && selection.quantity < maximum
                                          ? () => _changeQuantity(
                                              selection,
                                              selection.quantity + 1,
                                            )
                                          : null,
                                      tooltip: 'Agregar una unidad',
                                      icon: const Icon(Icons.add_rounded),
                                    ),
                                    const Spacer(),
                                    IconButton(
                                      key: ValueKey('cart-remove-$lineKey'),
                                      onPressed: busy
                                          ? null
                                          : () => _remove(selection),
                                      tooltip: 'Eliminar producto',
                                      color: MesaFlowColors.error,
                                      icon: const Icon(Icons.delete_outline),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  if (lines.isNotEmpty) ...[
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          formatPrice(
                            Money(
                              amountMinor: controller.totalMinor,
                              currency: lines.first.product.price.currency,
                            ),
                          ),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      key: const ValueKey('clear-cart'),
                      onPressed: busy ? null : () => _confirmClear(context),
                      icon: const Icon(Icons.delete_sweep_outlined),
                      label: const Text('Vaciar pedido'),
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      key: const ValueKey('submit-order'),
                      onPressed: busy ? null : _submit,
                      child: Text(
                        _submitting ? 'Enviando pedido…' : 'Enviar pedido',
                      ),
                    ),
                  ],
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
