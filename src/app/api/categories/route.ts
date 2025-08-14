import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/lib/categoryService';

const categoryService = CategoryService.getInstance();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'DEBIT' | 'CREDIT' | null;

    let categories;
    if (type) {
      categories = await categoryService.getCategoriesForType(type);
    } else {
      categories = await categoryService.getCategories();
    }

    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch categories'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, keywords, color, description } = body;
    
    if (!name || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { success: false, error: 'Name and keywords array are required' },
        { status: 400 }
      );
    }
    
    const newCategory = await categoryService.addCategory({
      name,
      keywords,
      color: color || '#6B7280',
      description,
      applicableFor: body.applicableFor
    });
    
    return NextResponse.json({
      success: true,
      data: newCategory
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create category' 
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const updatedCategory = await categoryService.updateCategory(id, updates);
    
    if (!updatedCategory) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedCategory
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update category' 
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Category ID is required' },
        { status: 400 }
      );
    }
    
    const deleted = categoryService.deleteCategory(id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Category not found or cannot be deleted' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete category' 
      },
      { status: 500 }
    );
  }
}
