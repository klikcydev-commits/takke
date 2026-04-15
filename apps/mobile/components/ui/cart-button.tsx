import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Link } from 'expo-router';
import { IconSymbol } from './icon-symbol';
import { Text } from './text';
import { useCartStore } from '@/store/useCartStore';
import { useTheme } from '@/hooks/use-theme';

interface CartButtonProps {
    color?: string;
    size?: number;
    showEmpty?: boolean;
    disabled?: boolean;
}

export function CartButton({ 
    color = '#FFFFFF', 
    size = 28, 
    showEmpty = true,
    disabled = false 
}: CartButtonProps) {
    const itemCount = useCartStore((state) => state.getItemCount());
    const { colors } = useTheme();

    if (!showEmpty && itemCount === 0) {
        return null;
    }

    const content = (
        <View style={styles.container}>
            <IconSymbol name="bag" size={size} color={color} />
            {itemCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.accent, borderColor: color }]}>
                    <Text style={styles.badgeText}>{itemCount > 9 ? '9+' : itemCount}</Text>
                </View>
            )}
        </View>
    );

    if (disabled) {
        return content;
    }

    return (
        <Link href="/modal" asChild>
            <TouchableOpacity activeOpacity={0.7}>
                {content}
            </TouchableOpacity>
        </Link>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 4,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute',
        top: 0,
        right: 0,
        minWidth: 18,
        height: 18,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: 'bold',
        fontFamily: 'NunitoSans_800ExtraBold',
        lineHeight: 12,
    },
});
