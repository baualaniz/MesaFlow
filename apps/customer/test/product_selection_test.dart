import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/data/demo_menu.dart';
import 'package:mesaflow_customer/src/models/menu_product.dart';
import 'package:mesaflow_customer/src/models/product_selection.dart';

void main() {
  final product = demoProducts.first;

  test('normaliza la nota y calcula el total con enteros', () {
    final selection = ProductSelection.create(
      product: product,
      quantity: 2,
      notes: '  Sin cebolla  ',
    );

    expect(selection.quantity, 2);
    expect(selection.notes, 'Sin cebolla');
    expect(selection.lineTotal.amountMinor, 2580000);
    expect(selection.lineTotal.currency, 'ARS');
  });

  test('rechaza cantidades y notas fuera del contrato', () {
    expect(
      () => ProductSelection.create(product: product, quantity: 0),
      throwsFormatException,
    );
    expect(
      () => ProductSelection.create(
        product: product,
        quantity: maxItemQuantity + 1,
      ),
      throwsFormatException,
    );
    expect(
      () => ProductSelection.create(
        product: product,
        quantity: 1,
        notes: 'x' * (maxItemNotesLength + 1),
      ),
      throwsFormatException,
    );
  });

  test('limita cantidad cuando el total superaría el máximo monetario', () {
    const expensive = MenuProduct(
      id: 'producto-limite',
      name: 'Producto límite',
      description: 'Valida el máximo de dinero.',
      categoryId: 'principales',
      category: 'Principales',
      price: Money(amountMinor: maxMinorAmount, currency: 'ARS'),
      imageAlignment: Alignment.center,
    );

    expect(maxQuantityForProduct(expensive), 1);
    expect(
      () => ProductSelection.create(product: expensive, quantity: 2),
      throwsFormatException,
    );
  });
}
