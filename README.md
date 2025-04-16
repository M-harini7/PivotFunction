# PivotFunction
This project is a web-based pivot table tool that allows users to:
Upload a CSV file
View the raw data in a table
Select pivot options (rows, columns, values, aggregation)
Generate a pivot table dynamically in the browser



🚀 How to Use
1. Clone or Download the Repository
git clone https://github.com/your-username/pivot-table-app.git
cd pivot-table-app
Or simply download the files to your local machine.

2. Open index.html in a Browser
Double-click or open it via a local server (e.g., Live Server extension in VS Code).

3. Upload a CSV File
Click the "Choose File" button and select a .csv file from your system.
Once uploaded, your data will appear as a table.
The pivot controls will appear with dropdowns to select:
Group By Rows
Group By Columns
Value Column
Aggregation Type (Sum, Average, Count)



✅ How to Select Multiple Options
You can select multiple fields in the Group By Rows and Group By Columns sections by:
     Windows/Linux: Hold Ctrl (or Cmd on Mac) and click on each option.
     Mac: Hold Cmd (⌘) and click on each desired item.

📝 To deselect an option, click it again while still holding Ctrl or Cmd.

📎 You can also use the “Clear” button next to each list to reset the selection.

4. Generate Pivot Table
Click “Generate Pivot”
A pivot table will be created and displayed under the main table.

✨ Features
Upload and parse CSV data in-browser (no backend required)
Create custom pivot tables with multi-level grouping
Aggregations: Sum, Average, Count
Toggle between raw table and pivot view
Smooth UI with scroll to top/bottom
