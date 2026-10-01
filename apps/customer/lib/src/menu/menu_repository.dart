import '../models/menu_product.dart';

class MenuCatalog {
  MenuCatalog({
    required List<MenuCategory> categories,
    required List<MenuProduct> products,
  }) : categories = List.unmodifiable(categories),
       products = List.unmodifiable(products);

  final List<MenuCategory> categories;
  final List<MenuProduct> products;
}

abstract interface class MenuRepository {
  Future<MenuCatalog> loadPublishedMenu(String establishmentId);
}
