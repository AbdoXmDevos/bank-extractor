'use client';

import React, { useState, useEffect } from 'react';
import { CategoryService } from '@/lib/categoryService';
import { Category } from '@/types/transaction';

interface CategoryBadgeProps {
  categoryId: string;
  category?: Category; // Optional category data to avoid async loading
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export default function CategoryBadge({
  categoryId,
  category: providedCategory,
  size = 'md',
  showIcon = false,
  className = ''
}: CategoryBadgeProps) {
  const [category, setCategory] = useState<Category | null>(providedCategory || null);
  const [loading, setLoading] = useState(!providedCategory);
  const categoryService = CategoryService.getInstance();

  useEffect(() => {
    // If category is provided, use it directly
    if (providedCategory) {
      setCategory(providedCategory);
      setLoading(false);
      return;
    }

    // Otherwise, load it asynchronously
    const loadCategory = async () => {
      try {
        setLoading(true);
        console.log('Loading category for ID:', categoryId);
        const cat = await categoryService.getCategoryById(categoryId);
        console.log('Loaded category:', cat);
        setCategory(cat || null);
      } catch (error) {
        console.error('Failed to load category:', error);
        setCategory(null);
      } finally {
        setLoading(false);
      }
    };

    loadCategory();
  }, [categoryId, providedCategory]);

  if (loading) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 ${className}`}>
        Loading...
      </span>
    );
  }

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
