import 'package:shared_preferences/shared_preferences.dart';

import 'cart_store.dart';

final class SharedPreferencesCartStore implements CartStore {
  SharedPreferencesCartStore({SharedPreferencesAsync? preferences})
    : _preferences = preferences ?? SharedPreferencesAsync();

  final SharedPreferencesAsync _preferences;

  String _key(CartScope scope) =>
      'mesaflow.cart.v1.${scope.establishmentId}.${scope.sessionId}';

  @override
  Future<List<CartDraftItem>> read(CartScope scope) async {
    final raw = await _preferences.getString(_key(scope));
    if (raw == null) return const [];
    return decodeCartDocument(raw, scope);
  }

  @override
  Future<void> write(CartScope scope, List<CartDraftItem> items) async {
    if (items.isEmpty) return clear(scope);
    await _preferences.setString(_key(scope), encodeCartDocument(scope, items));
  }

  @override
  Future<void> clear(CartScope scope) => _preferences.remove(_key(scope));
}
