import 'package:flutter_test/flutter_test.dart';
import 'package:mesaflow_customer/src/config/app_environment.dart';
import 'package:mesaflow_customer/src/firebase/app_check_config.dart';

void main() {
  test('la demo y el emulador no necesitan una clave App Check', () {
    expect(appCheckSiteKeyFor(AppEnvironment.demo, siteKey: ''), isNull);
    expect(appCheckSiteKeyFor(AppEnvironment.emulator, siteKey: ''), isNull);
  });

  test('los builds cloud exigen una clave App Check', () {
    expect(
      () => appCheckSiteKeyFor(AppEnvironment.academic, siteKey: ''),
      throwsStateError,
    );
    expect(
      () => appCheckSiteKeyFor(AppEnvironment.development, siteKey: '  '),
      throwsStateError,
    );
    expect(
      () => appCheckSiteKeyFor(AppEnvironment.production, siteKey: ''),
      throwsStateError,
    );
  });

  test('normaliza la clave pública de reCAPTCHA Enterprise', () {
    expect(
      appCheckSiteKeyFor(
        AppEnvironment.development,
        siteKey: '  public-site-key  ',
      ),
      'public-site-key',
    );
  });
}
