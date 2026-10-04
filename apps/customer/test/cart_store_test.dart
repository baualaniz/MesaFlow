import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/cart/cart_store.dart';

void main() {
  final scope = CartScope(
    establishmentId: 'mesa-flow-demo',
    sessionId: 'sesion-01',
  );

  test('serializa y recupera únicamente el borrador mínimo del carrito', () {
    final items = [
      CartDraftItem(
        productId: 'burger-casa',
        quantity: 2,
        notes: '  Sin cebolla  ',
      ),
    ];

    final raw = encodeCartDocument(scope, items);
    final decoded = decodeCartDocument(raw, scope);

    expect(decoded, hasLength(1));
    expect(decoded.single.productId, 'burger-casa');
    expect(decoded.single.quantity, 2);
    expect(decoded.single.notes, 'Sin cebolla');
    expect(raw, isNot(contains('unitPriceMinor')));
  });

  test('rechaza un documento de otra sesión', () {
    final raw = encodeCartDocument(scope, [
      CartDraftItem(productId: 'burger-casa', quantity: 1),
    ]);
    final otherScope = CartScope(
      establishmentId: 'mesa-flow-demo',
      sessionId: 'sesion-02',
    );

    expect(() => decodeCartDocument(raw, otherScope), throwsFormatException);
  });

  test('rechaza JSON corrupto y campos inesperados', () {
    expect(() => decodeCartDocument('{', scope), throwsFormatException);
    expect(
      () => decodeCartDocument(
        '{"schemaVersion":1,"establishmentId":"mesa-flow-demo",'
        '"sessionId":"sesion-01","items":[],"price":1}',
        scope,
      ),
      throwsFormatException,
    );
    expect(
      () => decodeCartDocument(
        '{"schemaVersion":1,"establishmentId":"mesa-flow-demo",'
        '"sessionId":"sesion-01","items":['
        '{"productId":7,"quantity":1,"notes":null}]}',
        scope,
      ),
      throwsFormatException,
    );
  });
}
