import 'package:mesaflow_customer/src/data/demo_menu.dart';
import 'package:mesaflow_customer/src/menu/menu_repository.dart';

final class TestMenuRepository implements MenuRepository {
  const TestMenuRepository({this.failure, this.empty = false});

  static const published = TestMenuRepository();

  final Object? failure;
  final bool empty;

  @override
  Future<MenuCatalog> loadPublishedMenu(String establishmentId) async {
    final failure = this.failure;
    if (failure != null) throw failure;
    if (empty) return MenuCatalog(categories: const [], products: const []);
    return MenuCatalog(categories: demoCategories, products: demoProducts);
  }
}
