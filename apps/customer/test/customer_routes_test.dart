import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/routing/customer_routes.dart';

void main() {
  test('genera y recupera el contexto canónico de un QR', () {
    const route = CustomerTableRoute(
      establishmentSlug: 'casa-jacaranda',
      tableId: 'mesa-12',
    );

    expect(route.location, '/e/casa-jacaranda/table/mesa-12');
    expect(route.tableLabel, 'Mesa 12');
    expect(
      CustomerTableRoute.tryParse({
        'slug': 'casa-jacaranda',
        'tableId': 'mesa-12',
      }),
      route,
    );
  });

  test('normaliza solo la etiqueta visible de mesas numéricas', () {
    const route = CustomerTableRoute(
      establishmentSlug: 'mesa-flow-demo',
      tableId: 'mesa-001',
    );

    expect(route.tableId, 'mesa-001');
    expect(route.tableLabel, 'Mesa 1');
    expect(route.location, '/e/mesa-flow-demo/table/mesa-001');
  });

  test('rechaza segmentos ausentes, inseguros o fuera de límite', () {
    final invalidParameters = [
      <String, String>{},
      {'slug': 'Casa-Jacaranda', 'tableId': 'mesa-01'},
      {'slug': 'casa jacaranda', 'tableId': 'mesa-01'},
      {'slug': 'casa-jacaranda', 'tableId': '../mesa-01'},
      {'slug': 'casa-jacaranda', 'tableId': 'mesa_01'},
      {'slug': 'a' * 65, 'tableId': 'mesa-01'},
    ];

    for (final parameters in invalidParameters) {
      expect(
        CustomerTableRoute.tryParse(parameters),
        isNull,
        reason: '$parameters debería ser inválido',
      );
    }
  });
}
