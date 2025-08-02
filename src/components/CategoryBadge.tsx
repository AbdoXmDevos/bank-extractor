'use client';

import React from 'react';
import { CategoryService } from '@/lib/categoryService';

interface CategoryBadgeProps {
  categoryId: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function CategoryBadge({ 
  categoryId, 
  size = 'md', 
  showIcon = false, 
  className = '' 
}: CategoryBadgeProps) {
  const categoryService = CategoryService.getInstance();
  const category = categoryService.getCategoryById(categoryId);
  
  if (!category) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 ${className}`}>
        Unknown
      </span>
    );
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm'
  };

  // Convert hex color to RGB for background opacity
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb = hexToRgb(category.color);
  const backgroundColor = rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)` : 'rgba(107, 114, 128, 0.1)';
  const borderColor = category.color;
  const textColor = category.color;

  const getCategoryIcon = (categoryId: string) => {
    const iconMap: { [key: string]: string } = {
      shopping: '🛍️',
      internet_payment: '💳',
      food: '🍽️',
      transfer: '💸',
      cash_withdrawal: '🏧',
      card_payment: '💳',
      bank_fees: '🏦',
      salary: '💰',
      utilities: '⚡',
      transport: '🚗',
      other: '📝'
    };
    return iconMap[categoryId] || '📝';
  };

  return (
    <span 
      className={`inline-flex items-center font-medium rounded-full border ${sizeClasses[size]} ${className}`}
      style={{
        backgroundColor,
        borderColor,
        color: textColor
      }}
      title={category.description}
    >
      {showIcon && (
        <span className="mr-1">
          {getCategoryIcon(categoryId)}
        </span>
      )}
      {category.name}
    </span>
  );
}
