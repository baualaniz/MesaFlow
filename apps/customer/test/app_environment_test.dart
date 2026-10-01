import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';

void main() {
  test('selecciona los tres ambientes explícitos', () {
    expect(AppEnvironment.parse('emulator'), AppEnvironment.emulator);
    expect(AppEnvironment.parse('dev'), AppEnvironment.development);
    expect(AppEnvironment.parse('prod'), AppEnvironment.production);
    expect(AppEnvironment.parse(' DEVELOPMENT '), AppEnvironment.development);
  });

  test('cada ambiente conserva el proyecto Firebase esperado', () {
    expect(AppEnvironment.emulator.projectId, 'demo-mesaflow');
    expect(AppEnvironment.development.projectId, 'mesaflow-desarrollo');
    expect(AppEnvironment.production.projectId, 'mesaflow-produccion');
    expect(AppEnvironment.emulator.isCloud, isFalse);
    expect(AppEnvironment.development.isCloud, isTrue);
    expect(AppEnvironment.production.isCloud, isTrue);
  });

  test('rechaza valores desconocidos sin caer en producción', () {
    expect(() => AppEnvironment.parse('staging'), throwsArgumentError);
    expect(() => AppEnvironment.parse(''), throwsArgumentError);
  });
}
