import '../config/app_environment.dart';

const _compiledSiteKey = String.fromEnvironment(
  'MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY',
);

String? appCheckSiteKeyFor(
  AppEnvironment environment, {
  String siteKey = _compiledSiteKey,
}) {
  if (!environment.isCloud) return null;
  final normalized = siteKey.trim();
  if (normalized.isEmpty) {
    throw StateError(
      'Falta MESAFLOW_RECAPTCHA_ENTERPRISE_SITE_KEY para el build cloud.',
    );
  }
  return normalized;
}
