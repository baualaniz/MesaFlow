import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';

class MenuProduct {
  const MenuProduct({
    required this.id,
    required this.name,
    required this.description,
    required this.categoryId,
    required this.category,
    required this.price,
    required this.imageAlignment,
    this.badge,
  });

  final String id;
  final String name;
  final String description;
  final String categoryId;
  final String category;
  final Money price;
  final Alignment imageAlignment;
  final String? badge;
}

class MenuCategory {
  const MenuCategory({
    required this.id,
    required this.name,
    required this.description,
    required this.sortOrder,
  });

  final String id;
  final String name;
  final String description;
  final int sortOrder;
}
