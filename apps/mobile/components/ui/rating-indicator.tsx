import { useTheme } from '@/hooks/use-theme';
import React, { useId } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Path, Defs, ClipPath, Rect } from 'react-native-svg';

interface RatingIndicatorProps {
    rating: number;
    size?: number;
    color?: string;
    style?: ViewStyle;
}

// Standard 5-point star SVG path
const STAR_PATH = "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z";

const FractionalStar = ({ fillPercentage, size = 20, color = "#FFD700", emptyColor = "#E0E0E0" }: { fillPercentage: number, size?: number, color?: string, emptyColor?: string }) => {
    const clipId = useId();
    return (
        <View style={{ width: size, height: size, marginHorizontal: 2 }}>
            <Svg width={size} height={size} viewBox="0 0 24 24">
                <Defs>
                    {/* Create a clipping mask based on the fill percentage */}
                    <ClipPath id={clipId}>
                        <Rect x="0" y="0" width={24 * fillPercentage} height="24" />
                    </ClipPath>
                </Defs>

                {/* Empty background star */}
                <Path d={STAR_PATH} fill={emptyColor} />

                {/* Filled foreground star clipped to the exact percentage */}
                <Path d={STAR_PATH} fill={color} clipPath={`url(#${clipId})`} />
            </Svg>
        </View>
    );
};

/**
 * Renders exactly 5 stars with precise fractional clipping based on the rating.
 */
export const RatingIndicator = ({
    rating,
    size = 20,
    color,
    style
}: RatingIndicatorProps) => {
    const { colors } = useTheme();
    const starColor = color || colors.primary;

    return (
        <View style={[styles.container, style]}>
            {[1, 2, 3, 4, 5].map((index) => {
                // Calculate how full this specific star should be (between 0.0 and 1.0)
                const fillAmount = Math.max(0, Math.min(1, rating - (index - 1)));
                
                return (
                    <FractionalStar
                        key={index}
                        fillPercentage={fillAmount}
                        size={size}
                        color={starColor}
                    />
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
});