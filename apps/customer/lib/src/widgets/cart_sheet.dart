import 'package:flutter/material.dart';

import '../cart/cart_controller.dart';
import '../contracts/domain_contracts.dart';
import '../models/product_selection.dart';
import '../theme/mesaflow_theme.dart';
import 'feedback_panel.dart';
import 'product_card.dart';

class CartSheet extends StatelessWidget {
  const CartSheet({
    super.key,
    required this.controller,
    required this.onMessage,
  });

  final CartController controller;
  final ValueChanged<String> onMessage;

  Future<void> _changeQuantity(ProductSelection selection, int quantity) async {
    final result = await controller.setQuantity(selection, quantity);
    _report(result);
  }

  Future<void> _remove(ProductSelection selection) async {
    final result = await controller.remove(selection);
    if (result == CartMutationResult.success) {
      onMessage('${selection.product.name} eliminado del pedido');
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
      onMessage('Pedido vaciado');
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
    if (message != null) onMessage(message);
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
                      if (controller.saving)
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
                                      onPressed:
                                          !controller.saving &&
                                              selection.quantity > 1
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
                                          !controller.saving &&
                                              selection.quantity < maximum
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
                                      onPressed: controller.saving
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
                      onPressed: controller.saving
                          ? null
                          : () => _confirmClear(context),
                      icon: const Icon(Icons.delete_sweep_outlined),
                      label: const Text('Vaciar pedido'),
                    ),
                    const SizedBox(height: 8),
                    FilledButton(
                      onPressed: controller.saving
                          ? null
                          : () => Navigator.pop(context),
                      child: const Text('Seguir eligiendo'),
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
