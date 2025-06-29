import dairyIcon from '../assets/dairy.png';
import vegetablesIcon from '../assets/vegetables.png';
import fruitsIcon from '../assets/fruits.png';
import meatIcon from '../assets/meat.png';
import fishSeafoodIcon from '../assets/fish_seafood.png';
import bakeryIcon from '../assets/bakery.png';
import beveragesIcon from '../assets/beverages.png';
import sweetsSnacksIcon from '../assets/sweet_snacks.png';
import dryGoodsIcon from '../assets/dry_goods.png';
import frozenIcon from '../assets/frozen.png';
import otherIcon from '../assets/other.png';

const categoryIcons: Record<string, string> = {
    dairy: dairyIcon,
    vegetables: vegetablesIcon,
    fruits: fruitsIcon,
    meat: meatIcon,
    fish_seafood: fishSeafoodIcon,
    bakery: bakeryIcon,
    beverages: beveragesIcon,
    sweets_snacks: sweetsSnacksIcon,
    dry_goods: dryGoodsIcon,
    frozen: frozenIcon,
    other: otherIcon,
};

export const getCategoryIcon = (iconName: string | null | undefined): string => {
    if (!iconName || !categoryIcons[iconName]) {
        return otherIcon;
    }
    return categoryIcons[iconName];
};
