import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';
import '../models/menu_product.dart';
import 'menu_repository.dart';

final class FirestoreMenuRepository implements MenuRepository {
  FirestoreMenuRepository({FirebaseFirestore? firestore})
    : _firestore = firestore ?? FirebaseFirestore.instance;

  final FirebaseFirestore _firestore;

  @override
  Future<MenuCatalog> loadPublishedMenu(String establishmentId) async {
    final safeEstablishmentId = parseContractId(
      establishmentId,
      'establishmentId',
    );
    final root = _firestore
        .collection('establishments')
        .doc(safeEstablishmentId);
    final categorySnapshot = await root
        .collection('categories')
        .where('active', isEqualTo: true)
        .orderBy('sortOrder')
        .get();

    final categories = categorySnapshot.docs
        .map(
          (document) => menuCategoryFromFirestore(
            document.id,
            document.data(),
            establishmentId: safeEstablishmentId,
          ),
        )
        .toList(growable: false);

    final productGroups = await Future.wait(
      categories.map(
        (category) => root
            .collection('products')
            .where('categoryId', isEqualTo: category.id)
            .where('active', isEqualTo: true)
            .where('available', isEqualTo: true)
            .orderBy('sortOrder')
            .get(),
      ),
    );
    final categoriesById = {
      for (final category in categories) category.id: category,
    };
    final products = <MenuProduct>[];
    for (var index = 0; index < productGroups.length; index++) {
      final expectedCategory = categories[index];
      for (final document in productGroups[index].docs) {
        final product = menuProductFromFirestore(
          document.id,
          document.data(),
          establishmentId: safeEstablishmentId,
          categoryName: expectedCategory.name,
        );
        if (product.categoryId != expectedCategory.id ||
            !categoriesById.containsKey(product.categoryId)) {
          throw const FormatException(
            'El producto no pertenece a una categoría publicada.',
          );
        }
        products.add(product);
      }
    }
    return MenuCatalog(categories: categories, products: products);
  }
}

MenuCategory menuCategoryFromFirestore(
  String documentId,
  Map<String, Object?> data, {
  required String establishmentId,
}) {
  const fields = {
    'establishmentId',
    'name',
    'description',
    'sortOrder',
    'active',
    'createdAt',
    'updatedAt',
  };
  _expectExactFields(data, fields, 'Category');
  final id = parseContractId(documentId, 'categoryId');
  if (data['establishmentId'] != establishmentId || data['active'] != true) {
    throw const FormatException('La categoría no es publicable en este local.');
  }
  final name = _trimmedString(data['name'], 'name', 2, 120);
  final description = _trimmedString(
    data['description'],
    'description',
    0,
    500,
  );
  final sortOrder = data['sortOrder'];
  if (sortOrder is! int || sortOrder < 0) {
    throw const FormatException('sortOrder debe ser un entero no negativo.');
  }
  _expectTimestamp(data['createdAt'], 'createdAt');
  _expectTimestamp(data['updatedAt'], 'updatedAt');
  return MenuCategory(
    id: id,
    name: name,
    description: description,
    sortOrder: sortOrder,
  );
}

MenuProduct menuProductFromFirestore(
  String documentId,
  Map<String, Object?> data, {
  required String establishmentId,
  required String categoryName,
}) {
  final createdAt = _expectTimestamp(data['createdAt'], 'createdAt');
  final updatedAt = _expectTimestamp(data['updatedAt'], 'updatedAt');
  final json = Map<String, Object?>.from(data)
    ..['createdAt'] = createdAt.toUtc().toIso8601String()
    ..['updatedAt'] = updatedAt.toUtc().toIso8601String();
  final contract = ProductContract.fromJson(json);
  if (contract.establishmentId != establishmentId ||
      !contract.active ||
      !contract.available) {
    throw const FormatException('El producto no es publicable en este local.');
  }
  return MenuProduct(
    id: parseContractId(documentId, 'productId'),
    name: contract.name,
    description: contract.description,
    categoryId: contract.categoryId,
    category: categoryName,
    price: contract.price,
    imageAlignment: _imageAlignment(contract.imagePath),
    badge: _badge(contract.imagePath, contract.categoryId),
  );
}

void _expectExactFields(
  Map<String, Object?> data,
  Set<String> expected,
  String label,
) {
  if (data.keys.toSet().difference(expected).isNotEmpty ||
      expected.difference(data.keys.toSet()).isNotEmpty) {
    throw FormatException('$label contiene campos ausentes o desconocidos.');
  }
}

String _trimmedString(Object? value, String label, int min, int max) {
  if (value is! String ||
      value.trim().length < min ||
      value.trim().length > max) {
    throw FormatException('$label debe tener entre $min y $max caracteres.');
  }
  return value.trim();
}

DateTime _expectTimestamp(Object? value, String label) {
  if (value is! Timestamp) {
    throw FormatException('$label debe ser un Timestamp de Firestore.');
  }
  return value.toDate();
}

Alignment _imageAlignment(String? imagePath) => switch (imagePath) {
  'menu.burger-casa' => Alignment.topLeft,
  'menu.ravioles-espinaca' => Alignment.topRight,
  'menu.bowl-estacion' => Alignment.bottomLeft,
  'menu.torta-chocolate' => Alignment.bottomRight,
  _ => Alignment.center,
};

String? _badge(String? imagePath, String categoryId) {
  if (categoryId == 'vegetariano') return 'Veggie';
  if (imagePath == 'menu.burger-casa') return 'Favorito';
  return null;
}
