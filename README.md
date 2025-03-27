# Car Price Estimator Demo

A demo application that allows users to upload car images and receive price estimates based on the vehicle's make, model, and year. The application simulates car recognition and uses a database of used cars to provide realistic price estimates.

## Features

- Upload car images via drag-and-drop or file browser
- Simulated car recognition (make, model, year)
- Price estimation based on real used car data
- Display of similar vehicles for comparison
- Interactive chat-like interface

## Project Structure

```
car-price-estimator-demo/
├── index.js                # Express server
├── package.json            # Dependencies and scripts
├── README.md               # This file
├── public/                 # Static files folder
│   ├── index.html          # Main frontend
│   └── test.html           # Test page
├── data/                   # Data folder for CSV
│   └── used_cars.csv       # Car price dataset
└── uploads/                # Folder for uploaded images
```

## Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher

## Installation

1. Clone this repository or extract the files
2. Install dependencies:

```bash
npm install
```

3. Make sure the CSV file is in the data directory:

```bash
mkdir -p data
cp /path/to/your/used_cars.csv data/
```

## Running the Application

Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

The application will be available at http://localhost:3000

## Testing

1. First, visit http://localhost:3000/test.html to check if the server is running properly
2. Click "Check Server Status" to verify the API is working
3. Click "Get Car Data" to confirm the car database is loaded
4. Once all tests pass, proceed to the main application

## Development Notes

- The car recognition feature is simulated and would typically be replaced with a real computer vision API in a production environment
- The price estimation algorithm uses actual used car data when available
- For demonstration purposes, some values are randomized when specific data is not available

## Troubleshooting

- **Server won't start**: Check for processes already using port 3000
- **Can't load index.html**: Verify the file exists in the public directory
- **CSV not loading**: Ensure the file is properly placed in the data directory
- **Image upload fails**: Check the uploads directory permissions

## License

ISC