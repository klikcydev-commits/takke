import { SymbolView, SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { StyleProp, ViewStyle } from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Home01Icon, User02Icon } from '@hugeicons/core-free-icons';

/**
 * Overrides for specific symbols using Hugeicons.
 */
const HUGE_MAPPING: Partial<Record<SymbolViewProps['name'], any>> = {
  'house.fill': Home01Icon,
  'person.fill': User02Icon,
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight = 'regular',
}: {
  name: SymbolViewProps['name'];
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  const HugeIcon = HUGE_MAPPING[name];

  if (HugeIcon) {
    return (
      <HugeiconsIcon
        icon={HugeIcon}
        size={size}
        color={color}
        strokeWidth={2}
      />
    );
  }

  return (
    <SymbolView
      weight={weight}
      tintColor={color}
      resizeMode="scaleAspectFit"
      name={name}
      style={[
        {
          width: size,
          height: size,
        },
        style,
      ]}
    />
  );
}
