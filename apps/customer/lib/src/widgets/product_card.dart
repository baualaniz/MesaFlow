import 'package:flutter/material.dart';

import '../models/menu_product.dart';
import '../theme/mesaflow_theme.dart';

class ProductCard extends StatelessWidget {
  const ProductCard({
    super.key,
    required this.product,
    required this.onAdd,
    required this.onOpen,
  });

  final MenuProduct product;
  final VoidCallback onAdd;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onOpen,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/mesa-demo.png',
                    fit: BoxFit.cover,
                    alignment: product.imageAlignment,
                    semanticLabel: product.name,
                  ),
                  if (product.badge case final badge?)
                    Positioned(
                      left: 14,
                      top: 14,
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          color: MesaFlowColors.ivory.withValues(alpha: 0.92),
                          borderRadius: BorderRadius.circular(99),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 7,
                          ),
                          child: Text(
                            badge,
                            style: Theme.of(context).textTheme.labelMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 12, 16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          product.description,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: MesaFlowColors.charcoal.withValues(
                                  alpha: 0.72,
                                ),
                                height: 1.35,
                              ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          formatPrice(product.priceInCents),
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(
                                color: MesaFlowColors.success,
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  IconButton.filled(
                    key: ValueKey('add-${product.id}'),
                    onPressed: onAdd,
                    tooltip: 'Agregar ${product.name}',
                    style: IconButton.styleFrom(
                      backgroundColor: MesaFlowColors.charcoal,
                      foregroundColor: MesaFlowColors.white,
                    ),
                    icon: const Icon(Icons.add_rounded),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String formatPrice(int cents) {
  final pesos = cents ~/ 100;
  final digits = pesos.toString();
  final parts = <String>[];
  for (var end = digits.length; end > 0; end -= 3) {
    parts.insert(0, digits.substring((end - 3).clamp(0, end), end));
  }
  return '\$ ${parts.join('.')}';
}
