import 'package:flutter/material.dart';

class MenuProduct {
  const MenuProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.category,
    required this.priceInCents,
    required this.imageAlignment,
    this.badge,
  });

  final String id;
  final String name;
  final String description;
  final String category;
  final int priceInCents;
  final Alignment imageAlignment;
  final String? badge;
}
