import '../contracts/domain_contracts.dart';
import 'menu_product.dart';

class ProductSelection {
  factory ProductSelection.create({
    required MenuProduct product,
    required int quantity,
    String? notes,
  }) {
    final normalizedNotes = notes?.trim();
    final lineTotalMinor = product.price.amountMinor * quantity;
    final validated = OrderItemContract.fromJson({
      'productId': product.id,
      'name': product.name,
      'unitPriceMinor': product.price.amountMinor,
      'quantity': quantity,
      'lineTotalMinor': lineTotalMinor,
      'notes': normalizedNotes == null || normalizedNotes.isEmpty
          ? null
          : normalizedNotes,
    });
    return ProductSelection._(
      product: product,
      quantity: validated.quantity,
      notes: validated.notes,
      lineTotal: Money(
        amountMinor: validated.lineTotalMinor,
        currency: product.price.currency,
      ),
    );
  }

  const ProductSelection._({
    required this.product,
    required this.quantity,
    required this.notes,
    required this.lineTotal,
  });

  final MenuProduct product;
  final int quantity;
  final String? notes;
  final Money lineTotal;
}

int maxQuantityForProduct(MenuProduct product) {
  final unitPrice = product.price.amountMinor;
  if (unitPrice == 0) return maxItemQuantity;
  final maximumForAmount = maxMinorAmount ~/ unitPrice;
  return maximumForAmount < maxItemQuantity
      ? maximumForAmount
      : maxItemQuantity;
}
