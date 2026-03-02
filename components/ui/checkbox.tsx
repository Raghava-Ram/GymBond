import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type CheckboxProps = {
  isDisabled?: boolean;
  isInvalid?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
};

export const Checkbox: React.FC<CheckboxProps & { children: React.ReactNode }> = ({
  isDisabled,
  size = 'md',
  children,
  onPress,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.checkbox,
        size === 'sm' && styles.sm,
        size === 'lg' && styles.lg,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
};

export const CheckboxIndicator: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={styles.indicator}>{children}</View>
);

export const CheckboxLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.label}>{children}</Text>
);

export const CheckboxIcon: React.FC<{ as: React.ElementType; [key: string]: any }> = ({ as: Icon, ...props }) => (
  <Icon {...props} />
);

const styles = StyleSheet.create({
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 6,
    padding: 8,
    marginVertical: 4,
    backgroundColor: '#020617',
  },
  sm: {
    padding: 4,
  },
  lg: {
    padding: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
  indicator: {
    marginRight: 8,
  },
  label: {
    color: '#f9fafb',
    fontSize: 14,
  },
});
