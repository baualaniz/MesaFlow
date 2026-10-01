import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/firebase/firebase_bootstrap.dart';

void main() {
  test('desarrollo usa exclusivamente mesaflow-desarrollo', () {
    final options = cloudFirebaseOptionsFor(AppEnvironment.development);
    expect(options.projectId, 'mesaflow-desarrollo');
    expect(options.appId, '1:685584709099:web:2d9cac26a22fbdcae815ae');
  });

  test('producción usa exclusivamente mesaflow-produccion', () {
    final options = cloudFirebaseOptionsFor(AppEnvironment.production);
    expect(options.projectId, 'mesaflow-produccion');
    expect(options.appId, '1:619377674437:web:3643ee20e7c37954a288ac');
  });

  test('emulator no puede reutilizar opciones cloud', () {
    expect(
      () => cloudFirebaseOptionsFor(AppEnvironment.emulator),
      throwsStateError,
    );
  });
}
