enum AppEnvironment {
  emulator,
  development,
  production;

  static AppEnvironment parse(String value) {
    return switch (value.trim().toLowerCase()) {
      'emulator' || 'local' => AppEnvironment.emulator,
      'dev' || 'development' => AppEnvironment.development,
      'prod' || 'production' => AppEnvironment.production,
      _ => throw ArgumentError.value(
        value,
        'MESAFLOW_ENV',
        'Usá emulator, dev o prod.',
      ),
    };
  }

  static AppEnvironment fromCompileTime() {
    return parse(
      const String.fromEnvironment('MESAFLOW_ENV', defaultValue: 'emulator'),
    );
  }

  String get projectId => switch (this) {
    AppEnvironment.emulator => 'demo-mesaflow',
    AppEnvironment.development => 'mesaflow-desarrollo',
    AppEnvironment.production => 'mesaflow-produccion',
  };

  String get browserTitle => switch (this) {
    AppEnvironment.emulator => 'MesaFlow · Local',
    AppEnvironment.development => 'MesaFlow · Desarrollo',
    AppEnvironment.production => 'MesaFlow',
  };

  bool get isCloud => this != AppEnvironment.emulator;
}
