import 'package:flutter/foundation.dart';

import '../contracts/domain_contracts.dart';
import '../menu/menu_repository.dart';
import '../models/product_selection.dart';
import 'cart_store.dart';

enum CartMutationResult {
  success,
  quantityLimit,
  itemLimit,
  busy,
  persistenceError,
}

final class CartController extends ChangeNotifier {
  CartController({required CartStore store, required this.scope})
    : _store = store;

  final CartStore _store;
  final CartScope scope;
  List<ProductSelection> _lines = const [];
  bool _saving = false;
  bool _restoredWithError = false;
  bool _disposed = false;

  List<ProductSelection> get lines => List.unmodifiable(_lines);
  bool get saving => _saving;
  bool get restoredWithError => _restoredWithError;
  int get itemCount =>
      _lines.fold(0, (sum, selection) => sum + selection.quantity);
  int get totalMinor =>
      _lines.fold(0, (sum, selection) => sum + selection.lineTotal.amountMinor);

  Future<void> restore(MenuCatalog catalog) async {
    _restoredWithError = false;
    List<CartDraftItem> drafts;
    try {
      drafts = await _store.read(scope);
    } catch (_) {
      drafts = const [];
      _restoredWithError = true;
      try {
        await _store.clear(scope);
      } catch (_) {}
    }

    final products = {
      for (final product in catalog.products) product.id: product,
    };
    final restored = <ProductSelection>[];
    var sanitized = false;
    for (final draft in drafts) {
      final product = products[draft.productId];
      if (product == null) {
        sanitized = true;
        continue;
      }
      try {
        final selection = ProductSelection.create(
          product: product,
          quantity: draft.quantity,
          notes: draft.notes,
        );
        final existingIndex = _indexOf(restored, selection);
        if (existingIndex < 0) {
          restored.add(selection);
        } else {
          final existing = restored[existingIndex];
          restored[existingIndex] = ProductSelection.create(
            product: product,
            quantity: existing.quantity + selection.quantity,
            notes: selection.notes,
          );
          sanitized = true;
        }
      } on FormatException {
        sanitized = true;
      }
    }
    _lines = List.unmodifiable(restored);
    _notifyListeners();
    if (sanitized) {
      try {
        await _store.write(scope, _drafts(_lines));
      } catch (_) {
        _restoredWithError = true;
        _notifyListeners();
      }
    }
  }

  Future<CartMutationResult> add(ProductSelection selection) async {
    if (_saving) return CartMutationResult.busy;
    final next = [..._lines];
    final existingIndex = _indexOf(next, selection);
    if (existingIndex >= 0) {
      try {
        final existing = next[existingIndex];
        next[existingIndex] = ProductSelection.create(
          product: selection.product,
          quantity: existing.quantity + selection.quantity,
          notes: selection.notes,
        );
      } on FormatException {
        return CartMutationResult.quantityLimit;
      }
    } else {
      if (next.length >= maxOrderItems) return CartMutationResult.itemLimit;
      next.add(selection);
    }
    return _commit(next);
  }

  Future<CartMutationResult> setQuantity(
    ProductSelection selection,
    int quantity,
  ) async {
    if (_saving) return CartMutationResult.busy;
    final index = _indexOf(_lines, selection);
    if (index < 0) return CartMutationResult.persistenceError;
    try {
      final replacement = ProductSelection.create(
        product: selection.product,
        quantity: quantity,
        notes: selection.notes,
      );
      final next = [..._lines]..[index] = replacement;
      return _commit(next);
    } on FormatException {
      return CartMutationResult.quantityLimit;
    }
  }

  Future<CartMutationResult> remove(ProductSelection selection) async {
    if (_saving) return CartMutationResult.busy;
    final next = [..._lines]
      ..removeWhere(
        (line) =>
            line.product.id == selection.product.id &&
            line.notes == selection.notes,
      );
    return _commit(next);
  }

  Future<CartMutationResult> clear() async {
    if (_saving) return CartMutationResult.busy;
    return _commit(const [], clear: true);
  }

  Future<CartMutationResult> _commit(
    List<ProductSelection> next, {
    bool clear = false,
  }) async {
    _saving = true;
    _notifyListeners();
    try {
      if (clear || next.isEmpty) {
        await _store.clear(scope);
      } else {
        await _store.write(scope, _drafts(next));
      }
      _lines = List.unmodifiable(next);
      return CartMutationResult.success;
    } catch (_) {
      return CartMutationResult.persistenceError;
    } finally {
      _saving = false;
      _notifyListeners();
    }
  }

  void _notifyListeners() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  static int _indexOf(
    List<ProductSelection> lines,
    ProductSelection selection,
  ) => lines.indexWhere(
    (line) =>
        line.product.id == selection.product.id &&
        line.notes == selection.notes,
  );

  static List<CartDraftItem> _drafts(List<ProductSelection> lines) => lines
      .map(
        (line) => CartDraftItem(
          productId: line.product.id,
          quantity: line.quantity,
          notes: line.notes,
        ),
      )
      .toList(growable: false);
}
