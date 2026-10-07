import demoImageUrl from "../../../customer/assets/images/mesa-demo.png";

export const MENU_IMAGE_OPTIONS = Object.freeze([
  { value: "menu.burger-casa", label: "Burger y papas", position: "0% 0%" },
  { value: "menu.ravioles-espinaca", label: "Ravioles", position: "100% 0%" },
  { value: "menu.bowl-estacion", label: "Bowl de estación", position: "0% 100%" },
  { value: "menu.torta-chocolate", label: "Torta de chocolate", position: "100% 100%" }
] as const);

export type MenuImagePath = typeof MENU_IMAGE_OPTIONS[number]["value"];

export function menuImageOption(value: string | null) {
  return MENU_IMAGE_OPTIONS.find((option) => option.value === value) ?? null;
}

export function menuImageStyle(value: string | null): React.CSSProperties {
  const option = menuImageOption(value);
  return {
    backgroundImage: `url(${demoImageUrl})`,
    backgroundPosition: option?.position ?? "50% 50%",
    backgroundSize: "200% 200%"
  };
}
