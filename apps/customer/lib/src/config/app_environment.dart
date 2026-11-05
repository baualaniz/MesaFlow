enum AppEnvironment {
  demo,
  academic,
  academicProduction,
  emulator,
  development,
  production;

  static AppEnvironment parse(String value) {
    return switch (value.trim().toLowerCase()) {
      'demo' || 'presentation' => AppEnvironment.demo,
      'academic' || 'firebase-demo' => AppEnvironment.academic,
      'academic-prod' || 'academic-production' =>
        AppEnvironment.academicProduction,
      'emulator' || 'local' => AppEnvironment.emulator,
      'dev' || 'development' => AppEnvironment.development,
      'prod' || 'production' => AppEnvironment.production,
      _ => throw ArgumentError.value(
        value,
        'MESAFLOW_ENV',
        'Usá demo, academic, academic-prod, emulator, dev o prod.',
      ),
    };
  }

  static AppEnvironment fromCompileTime() {
    return parse(
      const String.fromEnvironment('MESAFLOW_ENV', defaultValue: 'emulator'),
    );
  }

  String get projectId => switch (this) {
    AppEnvironment.demo => 'demo-mesaflow',
    AppEnvironment.academic => 'mesaflow-desarrollo',
    AppEnvironment.academicProduction => 'mesaflow-produccion',
    AppEnvironment.emulator => 'demo-mesaflow',
    AppEnvironment.development => 'mesaflow-desarrollo',
    AppEnvironment.production => 'mesaflow-produccion',
  };

  String get browserTitle => switch (this) {
    AppEnvironment.demo => 'MesaFlow · Demo académica',
    AppEnvironment.academic => 'MesaFlow · Presentación',
    AppEnvironment.academicProduction => 'MesaFlow',
    AppEnvironment.emulator => 'MesaFlow · Local',
    AppEnvironment.development => 'MesaFlow · Desarrollo',
    AppEnvironment.production => 'MesaFlow',
  };

  bool get isCloud =>
      this != AppEnvironment.demo && this != AppEnvironment.emulator;
}
