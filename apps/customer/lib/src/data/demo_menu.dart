import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';
import '../models/menu_product.dart';

const demoCategories = <MenuCategory>[
  MenuCategory(
    id: 'principales',
    name: 'Principales',
    description: 'Clásicos de la casa',
    sortOrder: 1,
  ),
  MenuCategory(
    id: 'vegetariano',
    name: 'Vegetariano',
    description: 'Opciones frescas sin carne',
    sortOrder: 2,
  ),
  MenuCategory(
    id: 'postres',
    name: 'Postres',
    description: 'Finales dulces',
    sortOrder: 3,
  ),
];

const demoProducts = <MenuProduct>[
  MenuProduct(
    id: 'burger-casa',
    name: 'Burger de la casa',
    description: 'Carne, cheddar, vegetales frescos y papas rústicas.',
    categoryId: 'principales',
    category: 'Principales',
    price: Money(amountMinor: 1290000, currency: 'ARS'),
    imageAlignment: Alignment.topLeft,
    badge: 'Favorito',
  ),
  MenuProduct(
    id: 'ravioles-espinaca',
    name: 'Ravioles de espinaca',
    description: 'Ricota, tomates cherry, albahaca y parmesano.',
    categoryId: 'principales',
    category: 'Principales',
    price: Money(amountMinor: 1180000, currency: 'ARS'),
    imageAlignment: Alignment.topRight,
  ),
  MenuProduct(
    id: 'bowl-estacion',
    name: 'Bowl de estación',
    description: 'Quinoa, vegetales asados y aderezo cítrico.',
    categoryId: 'vegetariano',
    category: 'Vegetariano',
    price: Money(amountMinor: 980000, currency: 'ARS'),
    imageAlignment: Alignment.bottomLeft,
    badge: 'Veggie',
  ),
  MenuProduct(
    id: 'torta-chocolate',
    name: 'Torta de chocolate',
    description: 'Chocolate intenso, frutos rojos y cacao.',
    categoryId: 'postres',
    category: 'Postres',
    price: Money(amountMinor: 620000, currency: 'ARS'),
    imageAlignment: Alignment.bottomRight,
  ),
];
