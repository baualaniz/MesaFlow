import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/cart/cart_controller.dart';
import 'package:mesaflow_customer/src/cart/cart_store.dart';
import 'package:mesaflow_customer/src/contracts/domain_contracts.dart';
import 'package:mesaflow_customer/src/data/demo_menu.dart';
import 'package:mesaflow_customer/src/menu/menu_repository.dart';
import 'package:mesaflow_customer/src/models/menu_product.dart';
import 'package:mesaflow_customer/src/models/product_selection.dart';

import 'helpers/test_cart_store.dart';

void main() {
  final scope = CartScope(
    establishmentId: 'mesa-flow-demo',
    sessionId: 'sesion-01',
  );
  final catalog = MenuCatalog(
    categories: demoCategories,
    products: demoProducts,
  );

  test('persiste y restaura el carrito dentro de la misma sesión', () async {
    final store = TestCartStore();
    final first = CartController(store: store, scope: scope);
    await first.restore(catalog);

    final result = await first.add(
      ProductSelection.create(
        product: demoProducts.first,
        quantity: 2,
        notes: 'Sin cebolla',
      ),
    );
    final reopened = CartController(store: store, scope: scope);
    await reopened.restore(catalog);

    expect(result, CartMutationResult.success);
    expect(reopened.itemCount, 2);
    expect(reopened.lines.single.notes, 'Sin cebolla');
    expect(reopened.totalMinor, 2580000);
  });

  test('aísla los carritos de sesiones distintas', () async {
    final store = TestCartStore();
    final first = CartController(store: store, scope: scope);
    await first.add(
      ProductSelection.create(product: demoProducts.first, quantity: 1),
    );
    final other = CartController(
      store: store,
      scope: CartScope(
        establishmentId: 'mesa-flow-demo',
        sessionId: 'sesion-02',
      ),
    );
    await other.restore(catalog);

    expect(first.itemCount, 1);
    expect(other.lines, isEmpty);
  });

  test(
    'rehidrata con el precio vigente y descarta productos ausentes',
    () async {
      final store = TestCartStore();
      await store.write(scope, [
        CartDraftItem(productId: 'burger-casa', quantity: 2),
        CartDraftItem(productId: 'producto-eliminado', quantity: 1),
      ]);
      const updatedBurger = MenuProduct(
        id: 'burger-casa',
        name: 'Burger de la casa',
        description: 'Precio actualizado.',
        categoryId: 'principales',
        category: 'Principales',
        price: Money(amountMinor: 1500000, currency: 'ARS'),
        imageAlignment: Alignment.center,
      );
      final controller = CartController(store: store, scope: scope);

      await controller.restore(
        MenuCatalog(
          categories: demoCategories,
          products: const [updatedBurger],
        ),
      );

      expect(controller.lines, hasLength(1));
      expect(controller.totalMinor, 3000000);
      expect(await store.read(scope), hasLength(1));
    },
  );

  test('edita cantidades, elimina líneas y vacía el carrito', () async {
    final store = TestCartStore();
    final controller = CartController(store: store, scope: scope);
    final burger = ProductSelection.create(
      product: demoProducts.first,
      quantity: 1,
    );
    final dessert = ProductSelection.create(
      product: demoProducts.last,
      quantity: 1,
    );
    await controller.add(burger);
    await controller.add(dessert);

    expect(
      await controller.setQuantity(controller.lines.first, 3),
      CartMutationResult.success,
    );
    expect(controller.itemCount, 4);
    expect(
      await controller.remove(controller.lines.last),
      CartMutationResult.success,
    );
    expect(controller.lines, hasLength(1));
    expect(await controller.clear(), CartMutationResult.success);
    expect(controller.lines, isEmpty);
    expect(await store.read(scope), isEmpty);
  });

  test('una falla al persistir no modifica el estado visible', () async {
    final store = TestCartStore()..failWrites = true;
    final controller = CartController(store: store, scope: scope);

    final result = await controller.add(
      ProductSelection.create(product: demoProducts.first, quantity: 1),
    );

    expect(result, CartMutationResult.persistenceError);
    expect(controller.lines, isEmpty);
  });
}
