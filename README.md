# CIH Bank Statement Analyzer

A comprehensive Next.js application that allows users to upload CIH PDF bank statements, extract transactions, and automatically categorize them using keyword-based classification.

## Features

### ✅ Core Functionality
- **PDF Upload**: Drag-and-drop interface for uploading CIH bank statement PDFs
- **Transaction Extraction**: Automatically parses PDF content to extract transaction data
- **Smart Categorization**: Keyword-based classification system with predefined categories
- **Responsive Dashboard**: Clean, modern interface with transaction tables and filtering
- **Data Visualization**: Interactive pie charts and bar graphs for spending analysis

### ✅ Advanced Features
- **File History**: Maintains history of processed PDFs with local storage
- **Category Management**: Settings page to customize categories and keywords
- **Search & Filter**: Filter transactions by category, date range, and text search
- **Export/Import**: Export transaction data and import/export category settings
- **Error Handling**: Comprehensive error handling and validation
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **PDF Processing**: pdf-parse
- **File Upload**: react-dropzone
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd extractor-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### 1. Upload Bank Statement
- Navigate to the main dashboard
- Drag and drop your CIH bank statement PDF or click to select
- Wait for processing (typically 2-5 seconds)

### 2. View Transactions
- Review automatically extracted and categorized transactions
- Use filters to search by category, date, or text
- Sort columns by clicking headers

### 3. Analyze Spending
- View spending breakdown in pie chart format
- Compare income vs expenses with bar charts
- See category-wise statistics

### 4. Manage Categories
- Go to Settings to customize transaction categories
- Add new categories with custom keywords
- Modify existing category keywords and colors

### 5. File History
- Access previously processed files from the History page
- Export/import file history for backup
- Delete old files to free up storage

## Supported Transaction Types

The application automatically detects and categorizes:

- **Shopping**: BIM, MARJANE, CARREFOUR, ZARA, etc.
- **Internet Payments**: SPOTIFY, NETFLIX, GOOGLE, AIRBNB, etc.
- **Food & Dining**: Restaurants, cafes, food delivery
- **Transfers**: VIREMENT, money transfers
- **Cash Withdrawals**: ATM transactions
- **Bank Fees**: Service charges and fees
- **Utilities**: LYDEC, REDAL, electricity, water
- **Transport**: Fuel, taxi, public transport
- **Salary**: Income transactions

## API Endpoints

### POST /api/upload
Upload and process PDF bank statement
- **Body**: FormData with 'file' field
- **Response**: Parsed transactions with categories

### GET /api/categories
Get all transaction categories
- **Response**: Array of category objects

### POST /api/categories
Create new transaction category
- **Body**: Category object with name, keywords, color

### PUT /api/categories
Update existing category
- **Body**: Category object with id and updates

### DELETE /api/categories?id={categoryId}
Delete category by ID

## File Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── history/           # File history page
│   ├── settings/          # Category settings page
│   └── page.tsx           # Main dashboard
├── components/            # React components
│   ├── CategoryBadge.tsx  # Category display component
│   ├── FileUpload.tsx     # File upload component
│   ├── SpendingChart.tsx  # Data visualization
│   └── TransactionTable.tsx # Transaction display
├── lib/                   # Business logic
│   ├── categoryService.ts # Category management
│   ├── errorHandler.ts    # Error handling utilities
│   ├── fileHistoryService.ts # File history management
│   ├── pdfProcessor.ts    # PDF parsing logic
│   └── transactionClassifier.ts # Classification logic
├── types/                 # TypeScript type definitions
└── config/               # Configuration files
    └── categories.json   # Default categories
```

## Configuration

### Default Categories
Categories are defined in `src/config/categories.json`. Each category includes:
- **id**: Unique identifier
- **name**: Display name
- **keywords**: Array of keywords for classification
- **color**: Hex color code for UI
- **description**: Optional description

### Customization
- Add new categories through the Settings page
- Modify keywords to improve classification accuracy
- Customize colors for better visual organization

## Error Handling

The application includes comprehensive error handling for:
- Invalid file formats
- Corrupted PDFs
- Network errors
- Storage limitations
- Processing failures

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Limitations

- Maximum file size: 10MB
- Supported format: PDF only
- Local storage limit: ~5MB for file history
- Designed specifically for CIH bank statements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
1. Check the error messages in the application
2. Review the browser console for technical details
3. Ensure your PDF is a valid CIH bank statement
4. Try with a smaller file size if upload fails
