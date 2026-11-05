import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/firebase/firebase_bootstrap.dart';

void main() {
  test('desarrollo usa exclusivamente mesaflow-desarrollo', () {
    final options = cloudFirebaseOptionsFor(AppEnvironment.development);
    expect(options.projectId, 'mesaflow-desarrollo');
    expect(
      options.appId,
      anyOf(
        '1:685584709099:web:2d9cac26a22fbdcae815ae',
        '1:685584709099:android:f29feb011492a3c6e815ae',
      ),
    );
  });

  test('presentación académica usa exclusivamente mesaflow-desarrollo', () {
    final options = cloudFirebaseOptionsFor(AppEnvironment.academic);
    expect(options.projectId, 'mesaflow-desarrollo');
  });

  test('producción usa exclusivamente mesaflow-produccion', () {
    final options = cloudFirebaseOptionsFor(AppEnvironment.production);
    expect(options.projectId, 'mesaflow-produccion');
    expect(
      options.appId,
      anyOf(
        '1:619377674437:web:3643ee20e7c37954a288ac',
        '1:619377674437:android:9a59bdffe51ea7b2a288ac',
      ),
    );
  });

  test('presentación productiva usa exclusivamente mesaflow-produccion', () {
    final options = cloudFirebaseOptionsFor(
      AppEnvironment.academicProduction,
    );
    expect(options.projectId, 'mesaflow-produccion');
  });

  test('demo y emulator no pueden reutilizar opciones cloud', () {
    expect(
      () => cloudFirebaseOptionsFor(AppEnvironment.demo),
      throwsStateError,
    );
    expect(
      () => cloudFirebaseOptionsFor(AppEnvironment.emulator),
      throwsStateError,
    );
  });
}
