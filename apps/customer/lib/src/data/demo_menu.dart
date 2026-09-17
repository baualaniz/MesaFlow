import 'package:flutter/material.dart';

import '../models/menu_product.dart';

const demoCategories = ['Todos', 'Principales', 'Vegetariano', 'Postres'];

const demoProducts = <MenuProduct>[
  MenuProduct(
    id: 'burger-casa',
    name: 'Burger de la casa',
    description: 'Carne, cheddar, vegetales frescos y papas rústicas.',
    category: 'Principales',
    priceInCents: 1290000,
    imageAlignment: Alignment.topLeft,
    badge: 'Favorito',
  ),
  MenuProduct(
    id: 'ravioles-espinaca',
    name: 'Ravioles de espinaca',
    description: 'Ricota, tomates cherry, albahaca y parmesano.',
    category: 'Principales',
    priceInCents: 1180000,
    imageAlignment: Alignment.topRight,
  ),
  MenuProduct(
    id: 'bowl-estacion',
    name: 'Bowl de estación',
    description: 'Quinoa, vegetales asados y aderezo cítrico.',
    category: 'Vegetariano',
    priceInCents: 980000,
    imageAlignment: Alignment.bottomLeft,
    badge: 'Veggie',
  ),
  MenuProduct(
    id: 'torta-chocolate',
    name: 'Torta de chocolate',
    description: 'Chocolate intenso, frutos rojos y cacao.',
    category: 'Postres',
    priceInCents: 620000,
    imageAlignment: Alignment.bottomRight,
  ),
];
