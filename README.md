# Production & Material Requirement Dashboard

A client-side analytics web application for garment production tracking, Bill of Materials (BOM) reconciliation, shipping variance analysis, and material requirement reporting directly from Excel and CSV workbooks.

Built with **React**, **TypeScript**, **Vite**, **Tailwind CSS**, and **SheetJS (`xlsx`)**. All workbook parsing and calculations run 100% locally in the browser—no backend server or data upload is required.

---

## Features

- **Multi-Workbook Excel & CSV Ingestion**: Select one or more `.xlsx`, `.xls`, and `.csv` files simultaneously and click **Process Files**. Automatically detects Production/Shipping, Cut Qty, BOM Consumption/Pricing, Pegged Requirements, and Material Requirement sections across sheets.
- **Hierarchical Production Analytics**: Switch between **Family Level**, **Style Level**, and **SKU Level (Detailed)** with expandable **BOM Materials** sub-tables for each SKU.
- **Financial & Savings KPIs**: Top 6 KPI cards displaying Total Order Qty, Total Shipped Qty, Total Order Value (€), Total Saving (€), Additional Profit %, and Excess Stock Value (€ for `Unique` materials).
- **Material & Article Requirement Grid**: Live searchable material ledger with unit prices, requirement vs. withdrawn variance, and automatic excess stock valuation.
- **One-Click Exports & Zoom**:
  - **Export Excel (`.xlsx`)**: Multi-sheet workbook (`Production Summary`, `Material Requirement`, `BOM Details`).
  - **Export HTML (`.html`)**: Self-contained interactive report ready to share offline.
  - **Zoom Controls**: Adjust dashboard zoom from `50%` to `150%` with one-click reset.
- **One-Click Demo Data**: Click **Demo Data** in the toolbar (or empty table state) to populate sample Family, Style, SKU, BOM, and Material data immediately for testing and previews.

---

## Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automatic GitHub Pages CI/CD deployment
├── src/
│   ├── components/
│   │   ├── ControlBar.tsx      # File dropzone, view level, export, and scale controls
│   │   ├── KpiStrip.tsx        # 6-metric top KPI summary bar
│   │   ├── MaterialTable.tsx   # Searchable Material & Article Requirement grid
│   │   └── ProductionTable.tsx # Family / Style / SKU hierarchy + inline BOM tables
│   ├── types/
│   │   └── dashboard.ts        # TypeScript data models
│   ├── utils/
│   │   ├── excelParser.ts      # SheetJS multi-sheet parser, KPI engine, sample data
│   │   ├── exporters.ts        # Excel (.xlsx) & standalone HTML exporters
│   │   └── formatters.ts       # Currency, decimal, and signed variance formatters
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts              # Configured with base: './' for GitHub Pages
└── LICENSE
```

---

## Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- npm v9 or higher

### Install & Run
```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Type-check
npm run lint

# Build production bundle to dist/
npm run build
```

---

## How to Push to GitHub & Deploy on GitHub Pages

1. **Create a new repository on GitHub** (for example, `production-material-dashboard`).
2. **Initialize Git and push this project**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Production & Material Requirement Dashboard"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```
3. **Enable GitHub Pages**:
   - Open your repository on GitHub and go to **Settings → Pages**.
   - Under **Build and deployment → Source**, select **GitHub Actions**.
   - The included `.github/workflows/deploy.yml` workflow will automatically build and publish your live dashboard on every push to `main`.

---

## Supported Excel Sheet Sections

The parser automatically detects columns across multiple tabs and files:

- **Production / Shipping**: `SKU` (or `Material`), `Order Qty` / `Total SKU Qty`, `5% Additional Qty`, `Pre Est Qty`, `Actual Cut`, `Bundle Qty`, `1st Quality Ship`, `2nd Quality Ship`
- **Cut Qty**: `SKU`, `Fabric` / `Material`, `Cut Qty`
- **BOM**: `SKU`, `Material`, `U Price` / `Unit Price`, `Con + Scrap` / `Consumption`
- **Pegged Requirements**: `Pegged Requirement`, `Material Description`, `Requirement Quantity`, `Quantity withdrawn`, `U Price`
- **Material Requirements & Types**: `Article` / `Material`, `Type` (`Unique` / `Common`), `U Price`, `Additional Reqmnt`, `Add Cutting Provide`, `Scrap`, `Add Planing Provide`, `Planning Re order`, `Requirement Qty`, `Shortage`, `Qty Withdrawn`, `Excess Stock`

---

## Author

Designed & Developed by **Rashmi Peiris**.

## License

This project is licensed under the [MIT License](LICENSE).
