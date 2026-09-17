import 'package:flutter/material.dart';

import 'screens/menu_page.dart';
import 'theme/mesaflow_theme.dart';

class MesaFlowApp extends StatelessWidget {
  const MesaFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'MesaFlow',
      debugShowCheckedModeBanner: false,
      theme: MesaFlowTheme.light,
      home: const MenuPage(),
    );
  }
}
