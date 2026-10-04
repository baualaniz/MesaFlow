import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';
import '../models/menu_product.dart';
import '../models/product_selection.dart';
import '../theme/mesaflow_theme.dart';
import 'product_card.dart';

class ProductDetailSheet extends StatefulWidget {
  const ProductDetailSheet({super.key, required this.product});

  final MenuProduct product;

  @override
  State<ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<ProductDetailSheet> {
  final _notesController = TextEditingController();
  int _quantity = 1;
  String? _validationMessage;

  int get _maximumQuantity => maxQuantityForProduct(widget.product);

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  void _changeQuantity(int delta) {
    final next = _quantity + delta;
    if (next < 1 || next > _maximumQuantity) return;
    setState(() {
      _quantity = next;
      _validationMessage = null;
    });
  }

  void _confirm() {
    try {
      final selection = ProductSelection.create(
        product: widget.product,
        quantity: _quantity,
        notes: _notesController.text,
      );
      Navigator.pop(context, selection);
    } on FormatException {
      setState(() {
        _validationMessage =
            'Revisá la cantidad y la nota antes de agregar el producto.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final lineTotal = Money(
      amountMinor: widget.product.price.amountMinor * _quantity,
      currency: widget.product.price.currency,
    );
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(20, 0, 20, 24 + keyboardInset),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              key: ValueKey('product-detail-${widget.product.id}'),
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(MesaFlowRadius.lg),
                  child: AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Image.asset(
                      'assets/images/mesa-demo.png',
                      fit: BoxFit.cover,
                      alignment: widget.product.imageAlignment,
                      semanticLabel: widget.product.name,
                    ),
                  ),
                ),
                const SizedBox(height: MesaFlowSpacing.lg),
                Text(
                  widget.product.category,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: MesaFlowColors.success,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: MesaFlowSpacing.xs),
                Text(
                  widget.product.name,
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: MesaFlowSpacing.xs),
                Text(
                  widget.product.description,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: MesaFlowSpacing.sm),
                Text(
                  formatPrice(widget.product.price),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: MesaFlowColors.success,
                  ),
                ),
                const SizedBox(height: MesaFlowSpacing.lg),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Cantidad',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ),
                    IconButton.outlined(
                      key: const ValueKey('decrease-product-quantity'),
                      onPressed: _quantity > 1
                          ? () => _changeQuantity(-1)
                          : null,
                      tooltip: 'Quitar una unidad',
                      icon: const Icon(Icons.remove_rounded),
                    ),
                    SizedBox(
                      width: 52,
                      child: Text(
                        '$_quantity',
                        key: const ValueKey('product-quantity'),
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    IconButton.outlined(
                      key: const ValueKey('increase-product-quantity'),
                      onPressed: _quantity < _maximumQuantity
                          ? () => _changeQuantity(1)
                          : null,
                      tooltip: 'Agregar una unidad',
                      icon: const Icon(Icons.add_rounded),
                    ),
                  ],
                ),
                const SizedBox(height: MesaFlowSpacing.lg),
                TextField(
                  key: const ValueKey('product-notes'),
                  controller: _notesController,
                  maxLength: maxItemNotesLength,
                  maxLines: 3,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    labelText: 'Aclaraciones (opcional)',
                    hintText: 'Ej.: sin cebolla, salsa aparte',
                    alignLabelWithHint: true,
                  ),
                ),
                if (_validationMessage case final message?) ...[
                  const SizedBox(height: MesaFlowSpacing.xs),
                  Text(
                    message,
                    key: const ValueKey('product-selection-error'),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: MesaFlowColors.error,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
                const SizedBox(height: MesaFlowSpacing.md),
                FilledButton.icon(
                  key: const ValueKey('confirm-product-selection'),
                  onPressed: _confirm,
                  icon: const Icon(Icons.add_shopping_cart_rounded),
                  label: Text('Agregar $_quantity · ${formatPrice(lineTotal)}'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
