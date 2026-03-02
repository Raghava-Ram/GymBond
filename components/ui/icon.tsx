import { Ionicons } from '@expo/vector-icons';
import { IconProps } from '@expo/vector-icons/build/createIconSet';
import React from 'react';

// simple wrapper for a check icon - additional icons can be added later
export const CheckIcon = (props: IconProps) => (
  <Ionicons name="checkmark" {...props} />
);
