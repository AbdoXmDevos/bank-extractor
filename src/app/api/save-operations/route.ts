import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { fileName, data } = await request.json();

    if (!fileName || !data) {
      return NextResponse.json(
        { error: 'Missing fileName or data' },
        { status: 400 }
      );
    }

    // Ensure the public/jsons directory exists
    const jsonsDir = join(process.cwd(), 'public', 'jsons');
    if (!existsSync(jsonsDir)) {
      await mkdir(jsonsDir, { recursive: true });
    }

    // Save the JSON file
    const filePath = join(jsonsDir, fileName);
    const jsonContent = JSON.stringify(data, null, 2);
    
    await writeFile(filePath, jsonContent, 'utf8');

    return NextResponse.json({
      success: true,
      fileName,
      filePath: `/jsons/${fileName}`,
      message: 'Operations saved successfully'
    });

  } catch (error) {
    console.error('Error saving operations:', error);
    return NextResponse.json(
      { error: 'Failed to save operations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { fileName } = await request.json();

    if (!fileName) {
      return NextResponse.json(
        { error: 'Missing fileName' },
        { status: 400 }
      );
    }

    // Construct the file path
    const filePath = join(process.cwd(), 'public', 'jsons', fileName);

    // Check if file exists
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Delete the file
    await unlink(filePath);

    return NextResponse.json({
      success: true,
      fileName,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json(
      { error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
