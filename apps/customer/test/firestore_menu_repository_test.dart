import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/menu/firestore_menu_repository.dart';

void main() {
  final timestamp = Timestamp.fromDate(
    DateTime.parse('2026-09-17T12:00:00.000Z'),
  );

  Map<String, Object?> category({
    String establishmentId = 'mesa-flow-demo',
    bool active = true,
  }) => {
    'establishmentId': establishmentId,
    'name': 'Principales',
    'description': 'Clásicos de la casa',
    'sortOrder': 2,
    'active': active,
    'createdAt': timestamp,
    'updatedAt': timestamp,
  };

  Map<String, Object?> product({
    String establishmentId = 'mesa-flow-demo',
    bool active = true,
    bool available = true,
  }) => {
    'establishmentId': establishmentId,
    'categoryId': 'principales',
    'name': 'Burger de la casa',
    'description': 'Carne, cheddar y vegetales.',
    'priceMinor': 1290000,
    'currency': 'ARS',
    'imagePath': 'menu.burger-casa',
    'available': available,
    'active': active,
    'sortOrder': 1,
    'createdAt': timestamp,
    'updatedAt': timestamp,
  };

  test('adapta categoría y producto publicables de Firestore', () {
    final parsedCategory = menuCategoryFromFirestore(
      'principales',
      category(),
      establishmentId: 'mesa-flow-demo',
    );
    final parsedProduct = menuProductFromFirestore(
      'burger-casa',
      product(),
      establishmentId: 'mesa-flow-demo',
      categoryName: parsedCategory.name,
    );

    expect(parsedCategory.name, 'Principales');
    expect(parsedProduct.categoryId, parsedCategory.id);
    expect(parsedProduct.category, parsedCategory.name);
    expect(parsedProduct.price.amountMinor, 1290000);
    expect(parsedProduct.badge, 'Favorito');
  });

  test('rechaza datos cruzados, inactivos o no disponibles', () {
    expect(
      () => menuCategoryFromFirestore(
        'principales',
        category(establishmentId: 'otro-local'),
        establishmentId: 'mesa-flow-demo',
      ),
      throwsFormatException,
    );
    expect(
      () => menuProductFromFirestore(
        'burger-casa',
        product(active: false),
        establishmentId: 'mesa-flow-demo',
        categoryName: 'Principales',
      ),
      throwsFormatException,
    );
    expect(
      () => menuProductFromFirestore(
        'burger-casa',
        product(available: false),
        establishmentId: 'mesa-flow-demo',
        categoryName: 'Principales',
      ),
      throwsFormatException,
    );
  });

  test('rechaza campos desconocidos y timestamps que no son nativos', () {
    expect(
      () => menuCategoryFromFirestore('principales', {
        ...category(),
        'unexpected': true,
      }, establishmentId: 'mesa-flow-demo'),
      throwsFormatException,
    );
    expect(
      () => menuProductFromFirestore(
        'burger-casa',
        {...product(), 'createdAt': '2026-09-17T12:00:00.000Z'},
        establishmentId: 'mesa-flow-demo',
        categoryName: 'Principales',
      ),
      throwsFormatException,
    );
  });
}
