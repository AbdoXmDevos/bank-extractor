import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    const jsonsDir = join(process.cwd(), 'public', 'jsons');

    // If fileName is provided, load specific file
    if (fileName) {
      const filePath = join(jsonsDir, fileName);
      
      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      const fileContent = await readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      return NextResponse.json({
        success: true,
        fileName,
        data
      });
    }

    // Otherwise, list all available files
    if (!existsSync(jsonsDir)) {
      return NextResponse.json({
        success: true,
        files: []
      });
    }

    const files = await readdir(jsonsDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));

    // Get file stats for each JSON file
    const fileDetails = await Promise.all(
      jsonFiles.map(async (file) => {
        const filePath = join(jsonsDir, file);
        const stats = await stat(filePath);
        
        try {
          // Try to read metadata from the file
          const content = await readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            metadata: data.metadata || null,
            operationsCount: data.operations?.length || 0
          };
        } catch (error) {
          // If file is corrupted or not valid JSON, still include it
          return {
            fileName: file,
            size: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString(),
            metadata: null,
            operationsCount: 0,
            error: 'Invalid JSON file'
          };
        }
      })
    );

    // Sort by creation date (newest first)
    fileDetails.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      files: fileDetails
    });

  } catch (error) {
    console.error('Error loading operations:', error);
    return NextResponse.json(
      { error: 'Failed to load operations' },
      { status: 500 }
    );
  }
}
