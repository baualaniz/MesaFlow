import 'package:mesaflow_customer/src/cart/cart_store.dart';

final class TestCartStore implements CartStore {
  final Map<String, List<CartDraftItem>> _documents = {};
  bool failReads = false;
  bool failWrites = false;

  String _key(CartScope scope) => '${scope.establishmentId}/${scope.sessionId}';

  @override
  Future<List<CartDraftItem>> read(CartScope scope) async {
    if (failReads) throw StateError('lectura fallida');
    return List.unmodifiable(_documents[_key(scope)] ?? const []);
  }

  @override
  Future<void> write(CartScope scope, List<CartDraftItem> items) async {
    if (failWrites) throw StateError('escritura fallida');
    _documents[_key(scope)] = List.unmodifiable(items);
  }

  @override
  Future<void> clear(CartScope scope) async {
    if (failWrites) throw StateError('escritura fallida');
    _documents.remove(_key(scope));
  }
}
